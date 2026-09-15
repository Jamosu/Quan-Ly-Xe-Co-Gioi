import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MobileLoginDto, MobileRefreshDto } from './dto/mobile-login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}
  async mobileLogin(dto: MobileLoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user || !user.isActive || user.role !== Role.DRIVER || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Tài khoản tài xế hoặc mật khẩu không chính xác.');
    }
    return this.issue(user, dto.deviceId);
  }
  async refreshMobileSession(dto: MobileRefreshDto) {
    const session = await this.prisma.mobileSession.findUnique({ where: { refreshTokenHash: this.hash(dto.refreshToken) }, include: { driver: true } });
    if (!session || session.deviceId !== dto.deviceId || session.revokedAt || session.expiresAt <= new Date() || !session.driver.isActive || session.driver.role !== Role.DRIVER) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    const refreshToken = randomBytes(48).toString('base64url'); const refreshExpiresAt = this.expiry();
    await this.prisma.mobileSession.update({ where: { id: session.id }, data: { refreshTokenHash: this.hash(refreshToken), expiresAt: refreshExpiresAt, lastUsedAt: new Date() } });
    return { accessToken: this.access(session.driver), tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN || '7d', refreshToken, refreshExpiresAt: refreshExpiresAt.toISOString(), user: this.safeUser(session.driver) };
  }
  async profile(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive || user.role !== Role.DRIVER) throw new UnauthorizedException();
    return this.safeUser(user);
  }
  private async issue(user: any, deviceId: string) {
    const refreshToken = randomBytes(48).toString('base64url'); const refreshExpiresAt = this.expiry();
    await this.prisma.mobileSession.create({ data: { driverId: user.id, deviceId, refreshTokenHash: this.hash(refreshToken), expiresAt: refreshExpiresAt } });
    return { accessToken: this.access(user), tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN || '7d', refreshToken, refreshExpiresAt: refreshExpiresAt.toISOString(), user: this.safeUser(user) };
  }
  private access(user: any) { return this.jwt.sign({ sub: user.id, username: user.username, role: user.role, unit: user.unit }); }
  private safeUser(user: any) { return { id: user.id, code: user.code, username: user.username, fullName: user.fullName, phone: user.phone, role: user.role, unit: user.unit, avatarUrl: user.avatarUrl, currentShiftStatus: user.currentShiftStatus, assignedVehicleId: user.assignedVehicleId }; }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private expiry() { return new Date(Date.now() + Math.max(1, Number(process.env.MOBILE_REFRESH_TOKEN_DAYS || 30)) * 86400000); }
}
