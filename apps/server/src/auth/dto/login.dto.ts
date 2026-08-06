import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * 登录请求 DTO。
 *
 * 必须是 class（而非 interface）：全局 ValidationPipe 依赖
 * `emitDecoratorMetadata` 反射出的设计期类型做校验，
 * interface 在编译期被擦除，会导致校验静默失效。
 */
export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsString({ message: '邮箱必须是字符串' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;

  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;
}