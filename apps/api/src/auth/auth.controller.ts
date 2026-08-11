import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
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
class BusinessRegistrationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() village?: string;
  @IsString() language!: string;
  @IsString() currency!: string;
  @IsInt() @Min(1) @Max(12) fyStartMonth!: number;
}
class BusinessProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) fyStartMonth?: number;
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

  @Get('businesses')
  @UseGuards(JwtGuard)
  businesses(@Req() request: AuthenticatedRequest) {
    return this.auth.businesses(request.user!.id);
  }

  @Post('businesses')
  @UseGuards(JwtGuard)
  registerBusiness(@Req() request: AuthenticatedRequest, @Body() body: BusinessRegistrationDto) {
    return this.auth.registerBusiness(request.user!.id, request.user!.deviceId, body);
  }

  @Get('business/profile')
  @UseGuards(JwtGuard)
  profile(@Req() request: AuthenticatedRequest) {
    if (!request.user?.businessId) throw new Error('Business selection required');
    return this.auth.profile(request.user.id, request.user.businessId);
  }

  @Patch('business/profile')
  @UseGuards(JwtGuard)
  updateProfile(@Req() request: AuthenticatedRequest, @Body() body: BusinessProfileDto) {
    if (!request.user?.businessId) throw new Error('Business selection required');
    return this.auth.updateProfile(request.user.id, request.user.businessId, request.user.deviceId, body);
  }
}
