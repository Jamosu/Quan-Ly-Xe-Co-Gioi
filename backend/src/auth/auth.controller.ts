import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowAnonymous } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UserPresenceService } from '../users/user-presence.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MobileLoginDto, MobileRefreshDto } from './dto/mobile-session.dto';

@ApiTags('Auth - Xác Thực & Phân Quyền')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userPresenceService: UserPresenceService,
  ) {}

  @Roles(Role.SUPER_ADMIN)
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng nội bộ' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @AllowAnonymous()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hệ thống (Lấy JWT Token)' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);

    if (result?.user?.id) {
      this.userPresenceService.recordActivity(result.user.id, 'WEB');
    }

    // Set cookie cho browser/proxy Vite
    response.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return result;
  }

  @AllowAnonymous()
  @Post('mobile-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập app di động tài xế' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  async mobileLogin(@Body() dto: MobileLoginDto) {
    const result = await this.authService.mobileLogin(dto);
    if (result?.user?.id) {
      this.userPresenceService.recordActivity(result.user.id, 'MOBILE');
    }
    return result;
  }

  @AllowAnonymous()
  @Post('mobile-refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới token app di động tài xế' })
  async mobileRefresh(@Body() dto: MobileRefreshDto) {
    return this.authService.refreshMobileSession(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi nhịp tim định kỳ (Heartbeat) cập nhật trạng thái Online thực tế' })
  async heartbeat(
    @CurrentUser('id') userId: number,
    @Body() body: { platform?: 'WEB' | 'MOBILE' },
  ) {
    if (userId) {
      this.userPresenceService.recordActivity(userId, body?.platform || 'WEB');
    }
    return { ok: true, timestamp: Date.now() };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống' })
  async logout(
    @CurrentUser('id') userId: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (userId) {
      this.userPresenceService.setOffline(userId);
    }
    response.clearCookie('access_token');
    return { message: 'Đăng xuất thành công' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản' })
  async getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }
}
