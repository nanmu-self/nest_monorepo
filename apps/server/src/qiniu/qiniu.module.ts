import { Global, Module } from '@nestjs/common';
import { QiniuService } from './qiniu.service';
import { QiniuController } from './qiniu.controller';

/**
 * 七牛云对象存储全局模块。
 *
 * AK/SK/Bucket/Region/Domain 由 @/config/env 在启动时校验，
 * 无需再用工厂提供。全局模块，任何业务模块均可直接注入 QiniuService。
 */
@Global()
@Module({
  controllers: [QiniuController],
  providers: [QiniuService],
  exports: [QiniuService],
})
export class QiniuModule {}
