import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'THACO_AGRI_DRIVER_DEV_ONLY_SECRET',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '7d') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController], providers: [AuthService, JwtStrategy], exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
