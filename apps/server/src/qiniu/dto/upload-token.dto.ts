import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 签发上传凭证请求 DTO。
 *
 * 所有字段可选：不传 key 时由七牛自动生成文件名，
 * 不传 expires 时使用服务端默认有效期。
 *
 * 必须是 class（而非 interface）：全局 ValidationPipe 依赖
 * `emitDecoratorMetadata` 反射出的设计期类型做校验，
 * interface 在编译期被擦除，会导致校验静默失效。
 */
export class UploadTokenDto {
  /**
   * 指定文件 key，传入后客户端必须用此 key 上传（覆盖语义）。
   * 省略则由七牛自动生成 key。
   */
  @IsOptional()
  @IsString({ message: 'key 必须是字符串' })
  key?: string;

  /**
   * 凭证有效期（秒），范围 60–86400（1 分钟 ~ 1 天）。
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'expires 必须是整数' })
  @Min(60, { message: 'expires 最小为 60 秒' })
  @Max(86400, { message: 'expires 最大为 86400 秒（1 天）' })
  expires?: number;
}
