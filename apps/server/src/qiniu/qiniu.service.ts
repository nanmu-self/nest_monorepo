import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import * as qiniu from 'qiniu';
import type { UploadTokenResponse } from '@short-link/shared';
import { ErrorCode } from '@short-link/shared';
import { BizException } from '@/common/biz-exception';
import {
  QINIU_ACCESS_KEY,
  QINIU_SECRET_KEY,
  QINIU_BUCKET,
  QINIU_REGION,
  QINIU_DOMAIN,
  type QiniuRegion,
} from '@/config/env';

/**
 * 区域标识到七牛 SDK zone 常量的映射。
 *
 * 七牛 SDK 通过 zone 决定 BucketManager 请求的存储服务域名，
 * 选错区域会导致删除/查询请求指向错误的服务节点（虽不致命但会失败）。
 */
const ZONE_MAP: Record<QiniuRegion, qiniu.conf.Zone> = {
  'z0': qiniu.zone.Zone_z0, // 华东-浙江
  'z1': qiniu.zone.Zone_z1, // 华北
  'z2': qiniu.zone.Zone_z2, // 华南
  'na0': qiniu.zone.Zone_na0, // 北美
  'as0': qiniu.zone.Zone_as0, // 东南亚
  'cn-east-2': qiniu.zone.Zone_cn_east_2, // 华东-浙江2
};

/** 上传凭证默认有效期（秒）：1 小时 */
const DEFAULT_TOKEN_EXPIRES = 3600;

/**
 * 七牛云对象存储服务。
 *
 * 封装客户端直传所需的凭证签发、文件删除、访问 URL 生成等操作。
 * 配置（AK/SK/Bucket/Region/Domain）由 @/config/env 在启动时校验，
 * 此处直接使用已校验的常量，无需运行时再判空。
 *
 * 所有方法失败时抛出 BizException，携带 STORAGE_* 业务错误码，
 * 由 AllExceptionFilter 统一封套为错误响应。
 */
@Injectable()
export class QiniuService {
  private readonly logger = new Logger(QiniuService.name);

  private readonly mac: qiniu.auth.digest.Mac;
  private readonly bucketManager: qiniu.rs.BucketManager;

  constructor() {
    this.mac = new qiniu.auth.digest.Mac(QINIU_ACCESS_KEY, QINIU_SECRET_KEY);
    const config = new qiniu.conf.Config({ zone: ZONE_MAP[QINIU_REGION] });
    this.bucketManager = new qiniu.rs.BucketManager(this.mac, config);
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
    try {
      const scope = key ? `${QINIU_BUCKET}:${key}` : QINIU_BUCKET;
      const putPolicy = new qiniu.rs.PutPolicy({
        scope,
        expires,
      });
      const token = putPolicy.uploadToken(this.mac);

      return {
        token,
        bucket: QINIU_BUCKET,
        domain: QINIU_DOMAIN,
        expires_in: expires,
        region: QINIU_REGION,
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
    let resp: qiniu.httpc.ResponseWrapper<void>;
    try {
      // delete 已返回 Promise（callback 可选），直接 await
      resp = await this.bucketManager.delete(QINIU_BUCKET, key);
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
      throw new BizException(
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        '文件不存在',
        HttpStatus.NOT_FOUND,
      );
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
    return `${QINIU_DOMAIN}/${encodedKey}`;
  }

  /**
   * 从完整访问 URL 中解析出文件 key。
   *
   * 用于删除场景：前端持有的是完整 URL，后端需提取 key 才能调用删除。
   * 基于 QINIU_DOMAIN 前缀剥离；若 URL 不以配置域名开头则原样返回
   * 去除前导斜杠后的 path 部分（容错，避免误删意外路径）。
   */
  parseKeyFromUrl(url: string): string {
    // 去除协议头与域名前缀
    const domainWithoutProtocol = QINIU_DOMAIN.replace(/^https?:\/\//, '');
    const match = url.match(/^https?:\/\/[^/]+\/(.+)$/);
    if (!match) {
      // 不符合 URL 格式，当作 key 直接处理
      return url.replace(/^\/+/, '');
    }
    const path = match[1];
    // 若 URL 域名与配置域名一致，path 即为 key
    if (url.includes(domainWithoutProtocol)) {
      return decodeURIComponent(path);
    }
    return decodeURIComponent(path);
  }

  /**
   * 将未知错误格式化为可读字符串，用于日志输出。
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
