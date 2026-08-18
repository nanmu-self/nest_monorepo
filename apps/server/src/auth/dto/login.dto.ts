import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 登录请求 DTO。
 *
 * 必须是 class（而非 interface）：全局 ValidationPipe 依赖
 * `emitDecoratorMetadata` 反射出的设计期类型做校验，
 * interface 在编译期被擦除，会导致校验静默失效。
 *
 * SWC 构建器不支持 @nestjs/swagger 的 CLI 插件（属性类型自动推断），
 * 所以 @ApiProperty 需要显式标注。
 */
export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsString({ message: '邮箱必须是字符串' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @ApiProperty({ description: '登录邮箱', example: 'admin@example.com' })
  email!: string;

  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @ApiProperty({ description: '登录密码', example: '123456' })
  password!: string;
}
