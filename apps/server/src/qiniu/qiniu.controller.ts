import { Controller, Post, Delete, Body, Query, UseGuards, HttpStatus } from '@nestjs/common';
import type { UploadTokenResponse } from '@short-link/shared';
import { ErrorCode } from '@short-link/shared';
import { QiniuService } from './qiniu.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { BizException } from '@/common/biz-exception';
import { UploadTokenDto } from './dto/upload-token.dto';

/**
 * 七牛云对象存储接口。
 *
 * 所有接口均需 JWT 认证：签发上传凭证与删除文件都属于受信操作，
 * 不对匿名用户开放，避免凭证被滥用或文件被恶意删除。
 */
@Controller('qiniu')
@UseGuards(JwtAuthGuard)
export class QiniuController {
  constructor(private readonly qiniuService: QiniuService) {}

  /**
   * 签发客户端直传上传凭证。
   *
   * 客户端拿到 token 后直接向七牛上传服务器 POST 表单，
   * 不经过业务后端中转。body 可选传入 key（指定文件名）与 expires（有效期）。
   */
  @Post('upload-token')
  async createUploadToken(@Body() body: UploadTokenDto): Promise<UploadTokenResponse> {
    return this.qiniuService.createUploadToken(body.key, body.expires);
  }

  /**
   * 删除存储空间中的文件。
   *
   * 用 query 参数传 key 而非 path 参数：七牛 key 常含 `/`，
   * 放在 path 中会被路由截断（如 `files/a/b.jpg` 被解析为多级路径）。
   * 支持传入完整访问 URL，后端自动解析出 key。
   *
   * key 也可传入完整访问 URL，服务端会从中解析出 key。
   */
  @Delete('files')
  async deleteFile(@Query('key') key?: string): Promise<void> {
    if (!key || !key.trim()) {
      throw new BizException(
        ErrorCode.INVALID_PARAMS,
        'key 不能为空',
        HttpStatus.BAD_REQUEST,
      );
    }
    // 兼容前端传完整 URL 的场景
    const fileKey = key.startsWith('http') ? this.qiniuService.parseKeyFromUrl(key) : key;
    await this.qiniuService.deleteFile(fileKey);
  }
}
