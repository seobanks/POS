/**
 * Backend-Only Restaurant Provisioning Script
 * 
 * Usage:
 *   npx ts-node src/scripts/provision-restaurant.ts \
 *     --name "My Restaurant" \
 *     --branch "Main Branch" \
 *     --owner "Owner Name" \
 *     --email "owner@example.com" \
 *     --password "SecurePassword123!"
 * 
 * Or via environment variables:
 *   RESTAURANT_NAME="My Restaurant" \
 *   OWNER_NAME="Owner Name" \
 *   OWNER_EMAIL="owner@example.com" \
 *   OWNER_PASSWORD="SecurePassword123!" \
 *   npx ts-node src/scripts/provision-restaurant.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
} from '@nodedr-restaurant/types';

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const restaurantName =
    getArg('--name') ||
    getArg('-n') ||
    process.env.RESTAURANT_NAME;

  const branchName =
    getArg('--branch') ||
    getArg('-b') ||
    process.env.BRANCH_NAME ||
    'Main Branch';

  const ownerName =
    getArg('--owner') ||
    getArg('-o') ||
    process.env.OWNER_NAME;

  const email =
    getArg('--email') ||
    getArg('-e') ||
    process.env.OWNER_EMAIL;

  const password =
    getArg('--password') ||
    getArg('-p') ||
    process.env.OWNER_PASSWORD;

  if (!restaurantName || !ownerName || !email || !password) {
    console.error('\n❌ Missing required arguments for restaurant provisioning.\n');
    console.log('Usage:');
    console.log(
      '  pnpm provision:restaurant --name "Restaurant" --owner "Owner" --email "owner@example.com" --password "Password" [--branch "Main Branch"]\n',
    );
    console.log('Or provide environment variables:');
    console.log('  RESTAURANT_NAME, OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD, BRANCH_NAME\n');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  console.log(`\n🔒 Initiating backend restaurant provisioning for "${restaurantName}"...`);

  // Check if owner email already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
  });

  if (existingUser) {
    console.error(`❌ An account with email "${email}" already exists (User ID: ${existingUser.id}).`);
    process.exit(1);
  }

  // 1. Ensure all system permissions are seeded
  console.log('  → Verifying and syncing system permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label, category: permission.category },
      create: permission,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

  // 2. Hash password
  console.log('  → Generating secure password hash (bcrypt rounds = 12)...');
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Atomically create restaurant, branch, roles, permissions, and owner user
  console.log('  → Creating tenant hierarchy in database transaction...');
  const result = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: restaurantName.trim(),
        currency: 'INR',
      },
    });

    const branch = await tx.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: branchName.trim(),
      },
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

    const owner = await tx.user.create({
      data: {
        restaurantId: restaurant.id,
        roleId: ownerRoleId,
        name: ownerName.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
      },
    });

    await tx.userBranch.create({
      data: {
        userId: owner.id,
        branchId: branch.id,
      },
    });

    return { restaurant, branch, owner };
  });

  console.log('\n======================================================');
  console.log('🎉 RESTAURANT PROVISIONED SUCCESSFULLY (BACKEND ONLY)');
  console.log('======================================================');
  console.log(`Restaurant ID : ${result.restaurant.id}`);
  console.log(`Restaurant    : ${result.restaurant.name}`);
  console.log(`Branch ID     : ${result.branch.id}`);
  console.log(`Branch Name   : ${result.branch.name}`);
  console.log(`Owner ID      : ${result.owner.id}`);
  console.log(`Owner Name    : ${result.owner.name}`);
  console.log(`Owner Email   : ${result.owner.email}`);
  console.log('======================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Provisioning failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
