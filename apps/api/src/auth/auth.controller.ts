import { Body, Controller, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';

class OtpRequestDto {
  @IsString()
  mobile!: string;
}

class OtpVerifyDto {
  @IsString()
  mobile!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  deviceId!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() body: OtpRequestDto): { mobile: string } {
    return this.auth.requestOtp(body.mobile);
  }

  @Post('otp/verify')
  verifyOtp(@Body() body: OtpVerifyDto): ReturnType<AuthService['verifyOtp']> {
    return this.auth.verifyOtp(body.mobile, body.code, body.deviceId);
  }
}
