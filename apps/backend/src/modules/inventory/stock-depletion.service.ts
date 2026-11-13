import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { StockService } from './stock.service';
import { round2 } from '../../common/money';

@Injectable()
export class StockDepletionService {
  private readonly logger = new Logger(StockDepletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async depleteOrderStock(
    orderId: string,
    branchId: string,
    userId: string,
  ): Promise<{ success: boolean; depletedIngredients: number; costOfGoods: number }> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, branchId },
        include: { items: true },
      });

      if (!order || !order.items || order.items.length === 0) {
        return { success: true, depletedIngredients: 0, costOfGoods: 0 };
      }

      const menuItemIds = [
        ...new Set(order.items.map((i) => i.menuItemId).filter(Boolean)),
      ];

      const recipeIngredients = await this.prisma.recipeIngredient.findMany({
        where: { menuItemId: { in: menuItemIds } },
        include: { ingredient: true },
      });

      const ingredientMap: Record<
        string,
        {
          ingredient: (typeof recipeIngredients)[0]['ingredient'];
          totalQty: number;
        }
      > = {};

      for (const item of order.items) {
        if (!item.menuItemId) continue;
        const matching = recipeIngredients.filter(
          (r) => r.menuItemId === item.menuItemId,
        );
        for (const recipe of matching) {
          const qty = Number(recipe.quantity) * Number(item.quantity);
          if (ingredientMap[recipe.ingredientId]) {
            ingredientMap[recipe.ingredientId].totalQty += qty;
          } else {
            ingredientMap[recipe.ingredientId] = {
              ingredient: recipe.ingredient,
              totalQty: qty,
            };
          }
        }
      }

      if (Object.keys(ingredientMap).length === 0) {
        return { success: true, depletedIngredients: 0, costOfGoods: 0 };
      }

      let totalCogs = 0;

      for (const [ingredientId, { ingredient, totalQty }] of Object.entries(
        ingredientMap,
      )) {
        const { cogs, newCurrentStock } = await this.prisma.$transaction(
          async (tx) => {
            const portions = await this.stockService.consumeStock(
              tx,
              branchId,
              ingredientId,
              totalQty,
              {
                type: 'SALE',
                note: `Order #${order.orderNumber}`,
                userId,
                allowNegative: true,
                orderId,
              },
            );

            const ingredientCogs = portions.reduce(
              (sum, p) => sum + p.quantity * p.unitCost,
              0,
            );

            const updatedIngredient = await tx.ingredient.findUnique({
              where: { id: ingredientId },
              select: { currentStock: true },
            });

            return {
              cogs: ingredientCogs,
              newCurrentStock: updatedIngredient
                ? Number(updatedIngredient.currentStock)
                : Number(ingredient.currentStock) - totalQty,
            };
          },
        );

        totalCogs += cogs;

        const minStock = Number(
          (ingredient as any).minimumStock ?? ingredient.reorderLevel ?? 0,
        );

        if (newCurrentStock <= minStock) {
          this.realtime.emitToBranch(branchId, 'inventory.low_stock', {
            ingredientId,
            name: ingredient.name,
            currentStock: Number(newCurrentStock),
            minimumStock: minStock,
            unit: ingredient.unit,
          });

          await this.prisma.notification.create({
            data: {
              branchId,
              type: 'LOW_STOCK',
              title: `Low Stock: ${ingredient.name}`,
              body: `Ingredient "${ingredient.name}" is down to ${Number(newCurrentStock)} ${ingredient.unit} (minimum: ${minStock}). Please restock.`,
            },
          });
        }
      }

      return {
        success: true,
        depletedIngredients: Object.keys(ingredientMap).length,
        costOfGoods: round2(totalCogs),
      };
    } catch (err: any) {
      this.logger.error(
        `Stock depletion failed for order ${orderId}: ${err?.message || err}`,
        err?.stack,
      );
      return {
        success: false,
        depletedIngredients: 0,
        costOfGoods: 0,
      };
    }
  }
}
