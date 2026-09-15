import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowAnonymous } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { MobileLoginDto, MobileRefreshDto } from './dto/mobile-login.dto';

@ApiTags('Driver Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @AllowAnonymous() @Post('mobile-login') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng tài khoản DRIVER từ hệ thống quản trị' })
  login(@Body() dto: MobileLoginDto) { return this.service.mobileLogin(dto); }
  @AllowAnonymous() @Post('mobile-refresh') @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: MobileRefreshDto) { return this.service.refreshMobileSession(dto); }
  @Get('profile') @ApiBearerAuth()
  profile(@CurrentUser('id') id: number) { return this.service.profile(id); }
}
