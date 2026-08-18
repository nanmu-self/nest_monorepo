import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import * as qiniu from 'qiniu';
import type { UploadTokenResponse } from '@short-link/shared';
import { ErrorCode } from '@short-link/shared';
import { BizException } from '@/common/biz-exception';
import { QINIU_CONFIG, type QiniuRegion } from '@/config/env';

/**
 * 区域标识到七牛 SDK zone 常量的映射。
 *
 * 七牛 SDK 通过 zone 决定 BucketManager 请求的存储服务域名，
 * 选错区域会导致删除/查询请求指向错误的服务节点（虽不致命但会失败）。
 */
const ZONE_MAP: Record<QiniuRegion, qiniu.conf.Zone> = {
  z0: qiniu.zone.Zone_z0, // 华东-浙江
  z1: qiniu.zone.Zone_z1, // 华北
  z2: qiniu.zone.Zone_z2, // 华南
  na0: qiniu.zone.Zone_na0, // 北美
  as0: qiniu.zone.Zone_as0, // 东南亚
  'cn-east-2': qiniu.zone.Zone_cn_east_2, // 华东-浙江2
};

/** 上传凭证默认有效期（秒）：1 小时 */
const DEFAULT_TOKEN_EXPIRES = 3600;

/**
 * 七牛云对象存储服务（可选功能）。
 *
 * 封装客户端直传所需的凭证签发、文件删除、访问 URL 生成等操作。
 * QINIU_CONFIG 由 @/config/env 解析：五个 QINIU_* 变量全部未配置时为 null，
 * 服务正常启动，但所有方法调用都会抛出 STORAGE_NOT_CONFIGURED（503）--
 * 不用对象存储的使用者无需伪造凭证即可跑起整个模板。
 *
 * 所有方法失败时抛出 BizException，携带 STORAGE_* 业务错误码，
 * 由 AllExceptionFilter 统一封套为错误响应。
 */
@Injectable()
export class QiniuService {
  private readonly logger = new Logger(QiniuService.name);

  /** 配置存在时的 SDK 客户端；功能未启用时为 null */
  private readonly mac: qiniu.auth.digest.Mac | null;
  private readonly bucketManager: qiniu.rs.BucketManager | null;

  constructor() {
    if (QINIU_CONFIG) {
      this.mac = new qiniu.auth.digest.Mac(QINIU_CONFIG.accessKey, QINIU_CONFIG.secretKey);
      const config = new qiniu.conf.Config({ zone: ZONE_MAP[QINIU_CONFIG.region] });
      this.bucketManager = new qiniu.rs.BucketManager(this.mac, config);
    } else {
      this.mac = null;
      this.bucketManager = null;
    }
  }

  /**
   * 功能未启用时抛出 503，附带明确的开启指引；已启用则返回非空配置。
   *
   * 抛在业务方法入口而非 constructor：构造期抛异常会让整个 AppModule 初始化失败，
   * 与“未启用可正常启动”的设计目标冲突。
   */
  private requireConfig() {
    if (!QINIU_CONFIG || !this.mac || !this.bucketManager) {
      throw new BizException(
        ErrorCode.STORAGE_NOT_CONFIGURED,
        '对象存储未启用：请在 apps/server/.env 中配置全部五个 QINIU_* 环境变量后重启',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return QINIU_CONFIG;
  }

  /**
   * 签发客户端直传上传凭证。
   *
   * @param key   指定文件 key；传入后客户端必须用此 key 上传，省略则由七牛生成
   * @param expires 凭证有效期（秒），默认 3600（1 小时）
   * @returns 上传凭证与访问域名等元信息
   *
   * scope 取值规则：指定 key 时为 `bucket:key`（覆盖语义），
   * 否则为 `bucket`（允许客户端自定 key）。
   */
  createUploadToken(key?: string, expires: number = DEFAULT_TOKEN_EXPIRES): UploadTokenResponse {
    this.requireConfig();
    try {
      const scope = key ? `${QINIU_CONFIG!.bucket}:${key}` : QINIU_CONFIG!.bucket;
      const putPolicy = new qiniu.rs.PutPolicy({
        scope,
        expires,
      });
      const token = putPolicy.uploadToken(this.mac!);

      return {
        token,
        bucket: QINIU_CONFIG!.bucket,
        domain: QINIU_CONFIG!.domain,
        expires_in: expires,
        region: QINIU_CONFIG!.region,
        ...(key !== undefined && { key }),
      };
    } catch (error) {
      // PutPolicy 构造或签名失败属于配置/密钥问题，记原文便于诊断
      this.logger.error(
        `签发七牛上传凭证失败 key=${key ?? '(auto)'}: ${this.formatError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BizException(
        ErrorCode.STORAGE_TOKEN_FAILED,
        '签发上传凭证失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除七牛存储空间中的文件。
   *
   * @param key 文件 key（不含域名前缀）
   *
   * 七牛删除接口对不存在的资源返回 612，并非错误语义--
   * 业务侧通常期望“删除一个已不存在的文件”也是 404，
   * 便于前端区分“删除成功”与“资源已不存在”。
   */
  async deleteFile(key: string): Promise<void> {
    this.requireConfig();
    let resp: qiniu.httpc.ResponseWrapper<void>;
    try {
      // delete 已返回 Promise（callback 可选），直接 await
      resp = await this.bucketManager!.delete(QINIU_CONFIG!.bucket, key);
    } catch (error) {
      // 网络层异常（DNS、连接超时等），非七牛业务错误
      this.logger.error(
        `删除七牛文件网络异常 key=${key}: ${this.formatError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BizException(
        ErrorCode.STORAGE_DELETE_FAILED,
        '删除文件失败：网络异常',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (resp.ok()) {
      return;
    }

    // 612 = 指定资源不存在（七牛 Kodo 业务错误码）
    const errorCode = resp.data?.error_code;
    const statusCode = resp.resp.statusCode;
    this.logger.warn(`删除七牛文件失败 key=${key} status=${statusCode} code=${errorCode}`);

    if (statusCode === 612 || errorCode === '612') {
      throw new BizException(ErrorCode.STORAGE_FILE_NOT_FOUND, '文件不存在', HttpStatus.NOT_FOUND);
    }

    throw new BizException(
      ErrorCode.STORAGE_DELETE_FAILED,
      `删除文件失败：${resp.data?.error ?? `HTTP ${statusCode}`}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 生成公开空间的文件访问 URL。
   *
   * 公开空间无需签名，直接拼接 `${domain}/${encodedKey}`。
   * 对 key 做 URI 编码以处理空格、中文等字符，但保留 `/` 以维持目录结构。
   */
  getPublicUrl(key: string): string {
    // encodeURIComponent 会编码 /，需还原以保持目录层级
    const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
    return `${this.requireConfig().domain}/${encodedKey}`;
  }

  /**
   * 从完整访问 URL 中解析出文件 key。
   *
   * 用于删除场景：前端持有的是完整 URL，后端需提取 key 才能调用删除。
   * 仅当 URL 域名与配置域名匹配时才 decode（认为它就是本服务的 URL）；
   * 不匹配则原样返回 path，避免误把外部 URL 当作自有 key 删除时
   * 因解码出错（如 `%2F` 之类边界）而留下意外结果。
   */
  parseKeyFromUrl(url: string): string {
    const config = this.requireConfig();
    const match = url.match(/^https?:\/\/[^/]+\/(.+)$/);
    if (!match) {
      // 不符合 URL 格式，当作 key 直接处理
      return url.replace(/^\/+/, '');
    }
    const path = match[1];
    const domainWithoutProtocol = config.domain.replace(/^https?:\/\//, '');
    if (url.includes(domainWithoutProtocol)) {
      return decodeURIComponent(path);
    }
    return path;
  }

  /**
   * 将未知错误格式化为可读字符串，用于日志输出。
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
