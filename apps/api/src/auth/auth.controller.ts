import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthenticatedRequest, JwtGuard } from './jwt.guard';

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
class DeviceDto {
  @IsString() deviceId!: string;
  @IsString() platform!: string;
  @IsString() pushToken?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() body: OtpRequestDto): ReturnType<AuthService['requestOtp']> {
    return this.auth.requestOtp(body.mobile);
  }

  @Post('otp/verify')
  verifyOtp(@Body() body: OtpVerifyDto): ReturnType<AuthService['verifyOtp']> {
    return this.auth.verifyOtp(body.mobile, body.code, body.deviceId);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string): ReturnType<AuthService['refresh']> {
    return this.auth.refresh(refreshToken);
  }

  @Post('devices')
  @UseGuards(JwtGuard)
  registerDevice(@Req() request: AuthenticatedRequest, @Body() body: DeviceDto) {
    return this.auth.registerDevice(request.user!.id, body);
  }

  @Post('business/switch')
  @UseGuards(JwtGuard)
  switchBusiness(
    @Req() request: AuthenticatedRequest,
    @Body('businessId') businessId: string,
  ) {
    return this.auth.switchBusiness(request.user!.id, request.user!.deviceId, businessId);
  }
}
