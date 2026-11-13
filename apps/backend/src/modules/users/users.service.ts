import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateStaffDto, UpdateStaffDto } from '@nodedr-restaurant/types';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  createdAt: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      label: true,
      isSystem: true,
      permissions: {
        select: {
          permission: {
            select: { key: true, label: true, category: true },
          },
        },
      },
    },
  },
  branches: { select: { branch: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(restaurantId: string) {
    return this.prisma.user.findMany({
      where: { restaurantId },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  listRoles(restaurantId: string) {
    return this.prisma.role.findMany({
      where: { restaurantId },
      orderBy: { label: 'asc' },
    });
  }

  async create(restaurantId: string, actorId: string, dto: CreateStaffDto) {
    await this.assertRoleInRestaurant(restaurantId, dto.roleId);
    await this.assertBranchesInRestaurant(restaurantId, dto.branchIds);

    const trimmedName = dto.name.trim();
    const rawEmail = dto.email?.trim();
    const username =
      rawEmail && rawEmail.length > 0
        ? rawEmail
        : trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (username) {
      const existing = await this.prisma.user.findFirst({
        where: { restaurantId, email: username },
      });
      if (existing) {
        throw new ConflictException(
          'A staff account with this username or email already exists',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        restaurantId,
        name: trimmedName,
        email: username || null,
        phone: dto.phone?.trim() || null,
        roleId: dto.roleId,
        passwordHash,
        branches: {
          create: dto.branchIds.map((branchId) => ({ branchId })),
        },
      },
      select: SELECT,
    });

    await this.audit.record({
      userId: actorId,
      action: 'staff.created',
      entity: 'User',
      entityId: user.id,
      metadata: { name: user.name, email: user.email, roleId: user.roleId },
    });

    return user;
  }

  async update(
    restaurantId: string,
    actorId: string,
    id: string,
    dto: UpdateStaffDto,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      include: { role: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff account not found');
    }

    if (
      (dto.isActive === false || dto.roleId) &&
      existing.role.name === 'OWNER'
    ) {
      const otherActiveOwners = await this.prisma.user.count({
        where: {
          restaurantId,
          isActive: true,
          id: { not: id },
          role: { name: 'OWNER' },
        },
      });
      if (otherActiveOwners === 0) {
        throw new BadRequestException(
          'Cannot disable or change the role of the last active owner',
        );
      }
    }

    if (dto.roleId) {
      await this.assertRoleInRestaurant(restaurantId, dto.roleId);
    }
    if (dto.branchIds) {
      await this.assertBranchesInRestaurant(restaurantId, dto.branchIds);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : undefined;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        isActive: dto.isActive,
        passwordHash,
        ...(dto.branchIds
          ? {
              branches: {
                deleteMany: {},
                create: dto.branchIds.map((branchId) => ({ branchId })),
              },
            }
          : {}),
      },
      select: SELECT,
    });

    // Never log `dto.password`/`passwordHash` — only the fields it's safe
    // for an owner reviewing history to see. `passwordChanged` is a boolean
    // flag, not the value, so a password rotation is still visible in the
    // trail without the audit log becoming a secondary place secrets leak.
    await this.audit.record({
      userId: actorId,
      action: 'staff.updated',
      entity: 'User',
      entityId: id,
      metadata: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        isActive: dto.isActive,
        branchIds: dto.branchIds,
        passwordChanged: Boolean(dto.password),
      },
    });

    return updated;
  }

  async remove(restaurantId: string, actorId: string, id: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      include: { role: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff account not found');
    }

    if (existing.role.name === 'OWNER') {
      const otherActiveOwners = await this.prisma.user.count({
        where: {
          restaurantId,
          isActive: true,
          id: { not: id },
          role: { name: 'OWNER' },
        },
      });
      if (otherActiveOwners === 0) {
        throw new BadRequestException('Cannot delete the last active owner');
      }
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      // Order/Refund/PurchaseOrder/... all keep a required, non-cascading
      // reference to the staff member who created them, so history is never
      // silently lost. Once a staffer has touched a real order they can no
      // longer be hard-deleted — disable them instead (`isActive: false`).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          'This staff account has order, purchase, or inventory history and cannot be deleted. Disable it instead.',
        );
      }
      throw err;
    }

    await this.audit.record({
      userId: actorId,
      action: 'staff.deleted',
      entity: 'User',
      entityId: id,
      metadata: { name: existing.name, email: existing.email },
    });

    return { ok: true };
  }

  async getStaffPermissions(restaurantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Staff account not found');
    }

    const isCustomized = !user.role.isSystem || user.role.name.startsWith('STAFF_');

    return {
      userId: user.id,
      name: user.name,
      roleId: user.role.id,
      roleName: user.role.name,
      roleLabel: user.role.label,
      isCustomized,
      permissionKeys: user.role.permissions.map((p) => p.permission.key),
    };
  }

  async updateStaffPermissions(
    restaurantId: string,
    actorId: string,
    id: string,
    permissionKeys: string[],
    resetToRoleId?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      include: {
        role: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Staff account not found');
    }

    // Reset to base role if requested
    if (resetToRoleId) {
      const baseRole = await this.prisma.role.findFirst({
        where: { id: resetToRoleId, restaurantId },
      });
      if (!baseRole) {
        throw new BadRequestException('Target role not found');
      }

      const previousCustomRoleId = user.role.name.startsWith('STAFF_') ? user.role.id : null;

      await this.prisma.user.update({
        where: { id },
        data: { roleId: baseRole.id },
      });

      if (previousCustomRoleId) {
        const count = await this.prisma.user.count({ where: { roleId: previousCustomRoleId } });
        if (count === 0) {
          await this.prisma.role.delete({ where: { id: previousCustomRoleId } }).catch(() => {});
        }
      }

      await this.audit.record({
        userId: actorId,
        action: 'staff.permissions_reset',
        entity: 'User',
        entityId: id,
        metadata: { roleName: baseRole.name, roleLabel: baseRole.label },
      });

      return this.getStaffPermissions(restaurantId, id);
    }

    // Resolve requested permissions from DB
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true },
    });

    let targetRoleId = user.roleId;

    // Check if user already has a dedicated customized role
    if (user.role.name === `STAFF_${user.id}`) {
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: targetRoleId },
      });
      if (permissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: targetRoleId,
            permissionId: p.id,
          })),
        });
      }
    } else {
      // Create or locate dedicated role for this user
      let customRole = await this.prisma.role.findFirst({
        where: { restaurantId, name: `STAFF_${user.id}` },
      });

      if (!customRole) {
        customRole = await this.prisma.role.create({
          data: {
            restaurantId,
            name: `STAFF_${user.id}`,
            label: `${user.name} (${user.role.label})`,
            isSystem: false,
          },
        });
      }

      targetRoleId = customRole.id;

      await this.prisma.rolePermission.deleteMany({
        where: { roleId: targetRoleId },
      });
      if (permissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: targetRoleId,
            permissionId: p.id,
          })),
        });
      }

      await this.prisma.user.update({
        where: { id },
        data: { roleId: targetRoleId },
      });
    }

    await this.audit.record({
      userId: actorId,
      action: 'staff.permissions_customized',
      entity: 'User',
      entityId: id,
      metadata: {
        staffName: user.name,
        permissionCount: permissions.length,
      },
    });

    return this.getStaffPermissions(restaurantId, id);
  }

  private async assertRoleInRestaurant(restaurantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, restaurantId },
    });
    if (!role) {
      throw new BadRequestException('Role not found for this restaurant');
    }
  }

  private async assertBranchesInRestaurant(
    restaurantId: string,
    branchIds: string[],
  ) {
    const count = await this.prisma.branch.count({
      where: { id: { in: branchIds }, restaurantId },
    });
    if (count !== branchIds.length) {
      throw new BadRequestException('One or more branches are invalid');
    }
  }
}
