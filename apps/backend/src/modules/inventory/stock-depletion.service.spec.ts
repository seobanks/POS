import { StockDepletionService } from './stock-depletion.service';

describe('StockDepletionService', () => {
  let service: StockDepletionService;
  let mockPrisma: any;
  let mockStockService: any;
  let mockRealtime: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findFirst: jest.fn(),
      },
      recipeIngredient: {
        findMany: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        return cb(mockPrisma);
      }),
      ingredient: {
        findUnique: jest.fn(),
      },
    };

    mockStockService = {
      consumeStock: jest.fn(),
    };

    mockRealtime = {
      emitToBranch: jest.fn(),
    };

    service = new StockDepletionService(
      mockPrisma as any,
      mockStockService as any,
      mockRealtime as any,
    );
  });

  it('returns early when order has no items', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1', items: [] });

    const result = await service.depleteOrderStock('order-1', 'branch-1', 'user-1');

    expect(result).toEqual({ success: true, depletedIngredients: 0, costOfGoods: 0 });
    expect(mockStockService.consumeStock).not.toHaveBeenCalled();
  });

  it('returns early when order does not exist', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);

    const result = await service.depleteOrderStock('order-1', 'branch-1', 'user-1');

    expect(result).toEqual({ success: true, depletedIngredients: 0, costOfGoods: 0 });
    expect(mockStockService.consumeStock).not.toHaveBeenCalled();
  });

  it('returns early when no recipe ingredients exist for menu items', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      items: [{ menuItemId: 'item-1', quantity: 2 }],
    });
    mockPrisma.recipeIngredient.findMany.mockResolvedValue([]);

    const result = await service.depleteOrderStock('order-1', 'branch-1', 'user-1');

    expect(result).toEqual({ success: true, depletedIngredients: 0, costOfGoods: 0 });
    expect(mockStockService.consumeStock).not.toHaveBeenCalled();
  });

  it('depletes stock, calculates COGS, and emits low stock alert when below threshold', async () => {
    const order = {
      id: 'order-1',
      orderNumber: 'A-101',
      items: [
        { menuItemId: 'item-1', quantity: 2 },
        { menuItemId: 'item-2', quantity: 1 },
      ],
    };
    mockPrisma.order.findFirst.mockResolvedValue(order);

    const recipeIngredients = [
      {
        menuItemId: 'item-1',
        ingredientId: 'ing-flour',
        quantity: 0.5,
        ingredient: {
          id: 'ing-flour',
          name: 'Flour',
          unit: 'KG',
          reorderLevel: 5,
          currentStock: 10,
        },
      },
      {
        menuItemId: 'item-2',
        ingredientId: 'ing-flour',
        quantity: 0.25,
        ingredient: {
          id: 'ing-flour',
          name: 'Flour',
          unit: 'KG',
          reorderLevel: 5,
          currentStock: 10,
        },
      },
    ];
    mockPrisma.recipeIngredient.findMany.mockResolvedValue(recipeIngredients);

    // Flour needed: (0.5 * 2) + (0.25 * 1) = 1.25 KG
    mockStockService.consumeStock.mockResolvedValue([
      { batchId: 'b-1', quantity: 1.25, unitCost: 40 },
    ]);

    // Simulated new stock: 10 - 1.25 = 8.75 (above reorderLevel 5)
    mockPrisma.ingredient.findUnique.mockResolvedValue({
      currentStock: 8.75,
    });

    const result = await service.depleteOrderStock('order-1', 'branch-1', 'user-1');

    expect(result).toEqual({
      success: true,
      depletedIngredients: 1,
      costOfGoods: 50, // 1.25 * 40
    });

    expect(mockStockService.consumeStock).toHaveBeenCalledWith(
      expect.anything(),
      'branch-1',
      'ing-flour',
      1.25,
      expect.objectContaining({
        type: 'SALE',
        note: 'Order #A-101',
        userId: 'user-1',
        allowNegative: true,
        orderId: 'order-1',
      }),
    );

    // Stock 8.75 is above reorderLevel 5 => no low stock alert
    expect(mockRealtime.emitToBranch).not.toHaveBeenCalledWith(
      'branch-1',
      'inventory.low_stock',
      expect.anything(),
    );
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('triggers low stock realtime event and notification when currentStock <= reorderLevel', async () => {
    const order = {
      id: 'order-2',
      orderNumber: 'A-102',
      items: [{ menuItemId: 'item-cheese', quantity: 2 }],
    };
    mockPrisma.order.findFirst.mockResolvedValue(order);

    const recipeIngredients = [
      {
        menuItemId: 'item-cheese',
        ingredientId: 'ing-cheese',
        quantity: 1,
        ingredient: {
          id: 'ing-cheese',
          name: 'Mozzarella',
          unit: 'KG',
          reorderLevel: 3,
          currentStock: 4,
        },
      },
    ];
    mockPrisma.recipeIngredient.findMany.mockResolvedValue(recipeIngredients);

    mockStockService.consumeStock.mockResolvedValue([
      { batchId: 'b-cheese-1', quantity: 2, unitCost: 300 },
    ]);

    // 4 - 2 = 2 <= 3 (low stock!)
    mockPrisma.ingredient.findUnique.mockResolvedValue({
      currentStock: 2,
    });

    const result = await service.depleteOrderStock('order-2', 'branch-1', 'user-1');

    expect(result).toEqual({
      success: true,
      depletedIngredients: 1,
      costOfGoods: 600,
    });

    expect(mockRealtime.emitToBranch).toHaveBeenCalledWith(
      'branch-1',
      'inventory.low_stock',
      {
        ingredientId: 'ing-cheese',
        name: 'Mozzarella',
        currentStock: 2,
        minimumStock: 3,
        unit: 'KG',
      },
    );

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        branchId: 'branch-1',
        type: 'LOW_STOCK',
        title: 'Low Stock: Mozzarella',
        body: 'Ingredient "Mozzarella" is down to 2 KG (minimum: 3). Please restock.',
      },
    });
  });

  it('gracefully catches errors and does not throw', async () => {
    mockPrisma.order.findFirst.mockRejectedValue(new Error('Database offline'));

    const result = await service.depleteOrderStock('order-err', 'branch-1', 'user-1');

    expect(result).toEqual({
      success: false,
      depletedIngredients: 0,
      costOfGoods: 0,
    });
  });
});
