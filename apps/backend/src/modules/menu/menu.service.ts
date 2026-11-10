import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MenuCategoryDto,
  MenuItemDto,
  ModifierGroupDto,
} from '@nodedr-restaurant/types';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Categories ---------------------------------------------------------

  listCategories(branchId: string) {
    return this.prisma.menuCategory.findMany({
      where: { branchId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  createCategory(branchId: string, dto: MenuCategoryDto) {
    return this.prisma.menuCategory.create({ data: { ...dto, branchId } });
  }

  async updateCategory(
    branchId: string,
    id: string,
    dto: Partial<MenuCategoryDto>,
  ) {
    await this.assertCategoryInBranch(branchId, id);
    return this.prisma.menuCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(branchId: string, id: string) {
    await this.assertCategoryInBranch(branchId, id);
    await this.prisma.menuCategory.delete({ where: { id } });
    return { ok: true };
  }

  private async assertCategoryInBranch(branchId: string, id: string) {
    const category = await this.prisma.menuCategory.findFirst({
      where: { id, branchId },
    });
    if (!category) throw new NotFoundException('Category not found');
  }

  // --- Kitchen stations -----------------------------------------------------

  listStations(branchId: string) {
    return this.prisma.kitchenStation.findMany({ where: { branchId } });
  }

  createStation(branchId: string, name: string, printerName?: string) {
    return this.prisma.kitchenStation.create({
      data: { branchId, name, printerName },
    });
  }

  // --- Menu items -----------------------------------------------------------

  listItems(branchId: string, categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: { branchId, ...(categoryId ? { categoryId } : {}) },
      orderBy: { sortOrder: 'asc' },
      include: {
        category: true,
        station: true,
        modifierGroups: {
          include: { modifierGroup: { include: { modifiers: true } } },
        },
      },
    });
  }

  async getItem(branchId: string, id: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, branchId },
      include: {
        modifierGroups: {
          include: { modifierGroup: { include: { modifiers: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async createItem(branchId: string, dto: MenuItemDto) {
    const { modifierGroupIds, ...rest } = dto;
    await this.assertModifierGroupsInBranch(branchId, modifierGroupIds);
    return this.prisma.menuItem.create({
      data: {
        ...rest,
        branchId,
        modifierGroups: {
          create: modifierGroupIds.map((modifierGroupId, index) => ({
            modifierGroupId,
            sortOrder: index,
          })),
        },
      },
      include: { modifierGroups: { include: { modifierGroup: true } } },
    });
  }

  async updateItem(
    branchId: string,
    id: string,
    userId: string,
    dto: Partial<MenuItemDto>,
  ) {
    const existing = await this.getItem(branchId, id);
    const { modifierGroupIds, ...rest } = dto;
    if (modifierGroupIds) {
      await this.assertModifierGroupsInBranch(branchId, modifierGroupIds);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (modifierGroupIds) {
        await tx.menuItemModifierGroup.deleteMany({
          where: { menuItemId: id },
        });
        await tx.menuItemModifierGroup.createMany({
          data: modifierGroupIds.map((modifierGroupId, index) => ({
            menuItemId: id,
            modifierGroupId,
            sortOrder: index,
          })),
        });
      }
      return tx.menuItem.update({ where: { id }, data: rest });
    });

    // Price is the single most owner-relevant field here, so it's logged
    // explicitly (before → after) in addition to the raw change set —
    // everything else in `rest` (name, availability, dietary flags, ...)
    // still shows up via `changes`.
    await this.audit.record({
      userId,
      action: 'menu_item.updated',
      entity: 'MenuItem',
      entityId: id,
      metadata: {
        name: updated.name,
        priceBefore: Number(existing.price),
        priceAfter: Number(updated.price),
        changes: rest,
      },
    });

    return updated;
  }

  private async assertModifierGroupsInBranch(
    branchId: string,
    modifierGroupIds: string[],
  ) {
    if (modifierGroupIds.length === 0) return;
    const count = await this.prisma.modifierGroup.count({
      where: { id: { in: modifierGroupIds }, branchId },
    });
    if (count !== new Set(modifierGroupIds).size) {
      throw new BadRequestException(
        'One or more modifier groups are invalid for this branch',
      );
    }
  }

  async deleteItem(branchId: string, id: string) {
    await this.getItem(branchId, id);
    await this.prisma.menuItem.delete({ where: { id } });
    return { ok: true };
  }

  // --- Modifier groups --------------------------------------------------------

  listModifierGroups(branchId: string) {
    return this.prisma.modifierGroup.findMany({
      where: { branchId },
      include: { modifiers: true },
    });
  }

  createModifierGroup(branchId: string, dto: ModifierGroupDto) {
    const { modifiers, ...rest } = dto;
    return this.prisma.modifierGroup.create({
      data: { ...rest, branchId, modifiers: { create: modifiers } },
      include: { modifiers: true },
    });
  }

  async updateModifierGroup(
    branchId: string,
    id: string,
    dto: Partial<ModifierGroupDto>,
  ) {
    await this.assertModifierGroupInBranch(branchId, id);

    const { modifiers, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (modifiers) {
        await tx.modifier.deleteMany({ where: { groupId: id } });
        await tx.modifier.createMany({
          data: modifiers.map((m) => ({ ...m, groupId: id })),
        });
      }
      return tx.modifierGroup.update({
        where: { id },
        data: rest,
        include: { modifiers: true },
      });
    });
  }

  async deleteModifierGroup(branchId: string, id: string) {
    await this.assertModifierGroupInBranch(branchId, id);
    await this.prisma.modifierGroup.delete({ where: { id } });
    return { ok: true };
  }

  private async assertModifierGroupInBranch(branchId: string, id: string) {
    const group = await this.prisma.modifierGroup.findFirst({
      where: { id, branchId },
    });
    if (!group) throw new NotFoundException('Modifier group not found');
  }

  // --- Combo meals -----------------------------------------------------------

  async setComboComponents(
    branchId: string,
    comboItemId: string,
    components: { componentItemId: string; quantity: number }[],
  ) {
    await this.getItem(branchId, comboItemId);
    if (components.some((c) => c.componentItemId === comboItemId)) {
      throw new BadRequestException(
        'A combo cannot include itself as a component',
      );
    }
    const componentIds = components.map((c) => c.componentItemId);
    if (componentIds.length > 0) {
      const count = await this.prisma.menuItem.count({
        where: { id: { in: componentIds }, branchId },
      });
      if (count !== new Set(componentIds).size) {
        throw new BadRequestException(
          'One or more combo components are invalid for this branch',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.comboComponent.deleteMany({ where: { comboItemId } });
      if (components.length > 0) {
        await tx.comboComponent.createMany({
          data: components.map((c) => ({ comboItemId, ...c })),
        });
      }
      await tx.menuItem.update({
        where: { id: comboItemId },
        data: { isCombo: components.length > 0 },
      });
      return tx.comboComponent.findMany({
        where: { comboItemId },
        include: {
          componentItem: { select: { id: true, name: true, price: true } },
        },
      });
    });
  }

  async getComboComponents(branchId: string, comboItemId: string) {
    await this.getItem(branchId, comboItemId);
    return this.prisma.comboComponent.findMany({
      where: { comboItemId },
      include: {
        componentItem: { select: { id: true, name: true, price: true } },
      },
    });
  }

  async bulkImportItems(
    branchId: string,
    userId: string,
    items: Array<{
      category: string;
      name: string;
      price: number;
      halfPrice?: number | null;
      description?: string;
      isVeg?: boolean;
      taxRatePercent?: number;
      sku?: string;
      barcode?: string;
      spiceLevel?: 'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
      imageUrl?: string | null;
    }>,
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException('No items provided for bulk import');
    }

    // 1. Fetch all existing categories in this branch
    const existingCategories = await this.prisma.menuCategory.findMany({
      where: { branchId },
    });
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((c) =>
      categoryMap.set(c.name.trim().toLowerCase(), c.id),
    );

    let categoriesCreated = 0;

    // 2. Identify missing categories and create them
    for (const item of items) {
      const catName = (item.category || 'General').trim();
      const catKey = catName.toLowerCase();
      if (!categoryMap.has(catKey)) {
        const newCategory = await this.prisma.menuCategory.create({
          data: {
            branchId,
            name: catName,
            sortOrder: existingCategories.length + categoriesCreated,
          },
        });
        categoryMap.set(catKey, newCategory.id);
        categoriesCreated++;
      }
    }

    // 3. Pre-fetch all existing items in branch in ONE fast query
    const existingItems = await this.prisma.menuItem.findMany({
      where: { branchId },
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        isVeg: true,
        sku: true,
        barcode: true,
        spiceLevel: true,
        imageUrl: true,
      },
    });

    const itemMap = new Map<string, (typeof existingItems)[0]>();
    existingItems.forEach((it) =>
      itemMap.set(`${it.categoryId}:${it.name.trim().toLowerCase()}`, it),
    );

    const toCreate: any[] = [];
    const updateOps: any[] = [];
    let imported = 0;

    for (const item of items) {
      if (!item.name || !item.name.trim()) continue;
      const catKey = (item.category || 'General').trim().toLowerCase();
      const categoryId = categoryMap.get(catKey)!;
      const itemName = item.name.trim();
      const itemKey = `${categoryId}:${itemName.toLowerCase()}`;

      const existingItem = itemMap.get(itemKey);
      const price = Number(item.price) || 0;
      const halfPrice = item.halfPrice ? Number(item.halfPrice) : null;
      const taxRatePercent =
        item.taxRatePercent !== undefined ? Number(item.taxRatePercent) : 5;

      if (existingItem) {
        updateOps.push(
          this.prisma.menuItem.update({
            where: { id: existingItem.id },
            data: {
              price,
              halfPrice,
              description: item.description ?? existingItem.description,
              isVeg: item.isVeg !== undefined ? item.isVeg : existingItem.isVeg,
              taxRatePercent,
              sku: item.sku ?? existingItem.sku,
              barcode: item.barcode ?? existingItem.barcode,
              spiceLevel: (item.spiceLevel as any) ?? existingItem.spiceLevel,
              imageUrl: item.imageUrl ?? existingItem.imageUrl,
            },
          }),
        );
      } else {
        toCreate.push({
          branchId,
          categoryId,
          name: itemName,
          price,
          halfPrice,
          description: item.description || null,
          isVeg: item.isVeg !== undefined ? item.isVeg : true,
          taxRatePercent,
          sku: item.sku || null,
          barcode: item.barcode || null,
          spiceLevel: item.spiceLevel || 'NONE',
          imageUrl: item.imageUrl || null,
        });
      }
      imported++;
    }

    // High-performance batch create
    if (toCreate.length > 0) {
      await this.prisma.menuItem.createMany({
        data: toCreate,
      });
    }

    // High-performance chunked transactional updates
    if (updateOps.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < updateOps.length; i += CHUNK_SIZE) {
        const chunk = updateOps.slice(i, i + CHUNK_SIZE);
        await this.prisma.$transaction(chunk);
      }
    }

    await this.audit.record({
      userId,
      action: 'menu.bulk_imported',
      entity: 'MenuItem',
      metadata: { count: imported, categoriesCreated },
    });

    return {
      success: true,
      count: imported,
      categoriesCreated,
    };
  }
}
