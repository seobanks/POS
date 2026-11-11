import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
  type ForgotPasswordDto,
  type LoginDto,
  type PinLoginDto,
  type RegisterDto,
  type ResetPasswordDto,
  type SessionUser,
} from '@nodedr-restaurant/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from './two-factor.service';
import { EmailService } from '../modules/email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly twoFactor: TwoFactorService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private toSessionUser(user: {
    id: string;
    restaurantId: string;
    name: string;
    roleId: string;
    role: { name: string; permissions: { permission: { key: string } }[] };
  }): SessionUser {
    return {
      id: user.id,
      restaurantId: user.restaurantId,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Only asked for after the password is right, so the response never
    // reveals which emails exist or which accounts use two-factor.
    if (user.twoFactorEnabled) {
      await this.twoFactor.verifyLogin(user, dto.totp);
    }

    return this.issueSession(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // Permissions are global, not per-tenant — upsert (idempotent) outside
    // the transaction below rather than re-creating them per restaurant.
    for (const permission of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: permission,
      });
    }
    const allPermissions = await this.prisma.permission.findMany();
    const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const owner = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name: dto.restaurantName },
      });
      const branch = await tx.branch.create({
        data: { restaurantId: restaurant.id, name: dto.branchName },
      });

      let ownerRoleId = '';
      for (const roleName of STAFF_ROLES) {
        const role = await tx.role.create({
          data: {
            restaurantId: restaurant.id,
            name: roleName,
            label: roleName.replace(/_/g, ' '),
          },
        });
        if (roleName === 'OWNER') ownerRoleId = role.id;

        const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
        await tx.rolePermission.createMany({
          data: grantedKeys
            .map((key) => permissionByKey.get(key))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
            .map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
        });
      }

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRoleId,
          name: dto.ownerName,
          email: dto.email,
          passwordHash,
        },
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      });

      await tx.userBranch.create({
        data: { userId: user.id, branchId: branch.id },
      });

      return user;
    });

    return this.issueSession(owner);
  }

  async hasAnyRestaurant(): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findFirst({
      select: { id: true },
    });
    return restaurant !== null;
  }

  async pinLogin(dto: PinLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user || !user.isActive || !user.pinHash) {
      throw new UnauthorizedException('PIN login not available for this user');
    }
    // A 4-8 digit PIN must not be a way around the second factor.
    if (user.twoFactorEnabled) {
      throw new UnauthorizedException(
        'PIN login is off for accounts with two-factor authentication — sign in with your password',
      );
    }

    const valid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!valid) {
      throw new UnauthorizedException('Incorrect PIN');
    }

    return this.issueSession(user);
  }

  async forgotPassword(dto: ForgotPasswordDto, clientOrigin?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });

    // To prevent account enumeration, return the same friendly message whether user exists or not.
    if (!user || !user.email) {
      return {
        message: 'If an account with this email exists, password reset instructions have been sent.',
      };
    }

    // Sign a time-limited token (1 hour) with password fingerprint (user.passwordHash.slice(-10)).
    // If the password changes, any existing tokens immediately become invalid!
    const token = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        purpose: 'pwd_reset',
        v: user.passwordHash.slice(-10),
      },
      { expiresIn: '1h' },
    );

    const baseUrl =
      clientOrigin ||
      this.config.get<string>('APP_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      'https://pos.hanva.in';

    const cleanBase = baseUrl.replace(/\/+$/, '');
    const resetUrl = `${cleanBase}/reset-password?token=${encodeURIComponent(token)}`;

    let emailed = false;
    if (this.emailService.isConfigured()) {
      try {
        await this.emailService.send({
          to: user.email,
          subject: 'Reset your Hanva Fine Dine password',
          text: `Hello ${user.name},\n\nYou requested to reset your password for Hanva Fine Dine.\n\nClick the link below to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, please disregard this email. Your current password remains unchanged.\n`,
        });
        emailed = true;
      } catch (err) {
        this.logger.warn(`Failed to send password reset email: ${err}`);
      }
    } else {
      this.logger.log(`Password reset link generated for ${user.email}: ${resetUrl}`);
    }

    return {
      message: 'If an account with this email exists, password reset instructions have been sent.',
      resetUrl: emailed ? undefined : resetUrl,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; email: string; purpose: string; v: string };
    try {
      payload = await this.jwt.verifyAsync(dto.token);
    } catch {
      throw new BadRequestException('Invalid or expired password reset link. Please request a new one.');
    }

    if (payload.purpose !== 'pwd_reset' || !payload.sub || !payload.v) {
      throw new BadRequestException('Invalid password reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User account not found or has been deactivated.');
    }

    if (user.passwordHash.slice(-10) !== payload.v) {
      throw new BadRequestException('This reset link has already been used. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return {
      success: true,
      message: 'Your password has been successfully reset. You may now sign in with your new password.',
    };
  }

  private async issueSession(
    user: Parameters<AuthService['toSessionUser']>[0],
  ) {
    const sessionUser = this.toSessionUser(user);
    const token = await this.jwt.signAsync({ sub: user.id });
    return { token, user: sessionUser };
  }
}
