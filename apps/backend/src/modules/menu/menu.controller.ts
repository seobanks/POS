import { readFileSync, unlinkSync } from 'node:fs';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import {
  menuCategorySchema,
  menuItemSchema,
  modifierGroupSchema,
  setComboComponentsSchema,
  type SessionUser,
} from '@nodedr-restaurant/types';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BranchAccessService } from '../../common/services/branch-access.service';
import {
  assertValidImageSignature,
  imageUploadOptions,
} from '../../common/upload/image-upload.config';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('v1/menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  // --- Categories ---------------------------------------------------------

  @Auth('menu.view')
  @Get('categories')
  async listCategories(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.listCategories(branchId);
  }

  @Auth('menu.manage')
  @Post('categories')
  @UsePipes(new ZodValidationPipe(menuCategorySchema))
  async createCategory(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.createCategory(branchId, body as never);
  }

  @Auth('menu.manage')
  @Patch('categories/:id')
  async updateCategory(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.updateCategory(branchId, id, body as never);
  }

  @Auth('menu.manage')
  @Delete('categories/:id')
  async deleteCategory(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.deleteCategory(branchId, id);
  }

  // --- Kitchen stations -----------------------------------------------------

  @Auth('menu.manage')
  @Get('stations')
  async listStations(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.listStations(branchId);
  }

  @Auth('menu.manage')
  @Post('stations')
  async createStation(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: { name: string; printerName?: string },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.createStation(
      branchId,
      body.name,
      body.printerName,
    );
  }

  // --- Menu items -----------------------------------------------------------

  @Auth('menu.view')
  @Get('items')
  async listItems(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.listItems(branchId, categoryId);
  }

  @Auth('menu.view')
  @Get('items/template.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="menu_template.csv"')
  getTemplateCsv() {
    const header =
      'Category,Item Name,Price,Half Price,Food Type,Tax Rate %,Description,SKU,Barcode,Spicy Level,Image URL\n';
    const rows = [
      'Starters,Paneer Tikka,280,160,Veg,5,Marinated cottage cheese grilled in tandoor,PT-01,,MEDIUM,',
      'Starters,Chicken Tikka,340,190,Non-Veg,5,Succulent chicken chunks roasted with tandoori spices,CT-01,,HOT,',
      'Main Course,Butter Chicken,380,220,Non-Veg,5,Tender chicken simmered in rich buttery tomato gravy,BC-01,,MILD,',
      'Main Course,Dal Makhani,260,150,Veg,5,Slow-cooked black lentils with cream and butter,DM-01,,NONE,',
      'Breads,Butter Naan,60,,Veg,5,Traditional clay oven flatbread with butter,BN-01,,NONE,',
      'Breads,Garlic Naan,80,,Veg,5,Tandoori flatbread topped with minced garlic and coriander,GN-01,,NONE,',
      'Rice & Biryani,Hyderabadi Chicken Biryani,350,,Non-Veg,5,Aromatic basmati rice cooked with spiced chicken and saffron,HB-01,,HOT,',
      'Desserts,Gulab Jamun,120,,Veg,5,Warm milk dumplings soaked in cardamom sugar syrup,GJ-01,,NONE,',
      'Beverages,Sweet Lassi,90,,Veg,5,Traditional churned sweet yogurt drink,SL-01,,NONE,',
    ].join('\n');
    return header + rows;
  }

  @Auth('menu.manage')
  @Post('items/bulk')
  async bulkImport(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: { items: any[] },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.bulkImportItems(branchId, user.id, body.items);
  }

  @Auth('menu.manage')
  @Patch('items/bulk-update')
  async bulkUpdateItems(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body()
    body: {
      itemIds: string[];
      updates: {
        isActive?: boolean;
        isVeg?: boolean;
        isVegan?: boolean;
        isJain?: boolean;
        isGlutenFree?: boolean;
        spiceLevel?: any;
        taxRatePercent?: number | string;
        prepTimeMinutes?: number;
        description?: string;
      };
    },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.bulkUpdateItems(
      branchId,
      user.id,
      body.itemIds,
      body.updates,
    );
  }

  @Auth('menu.manage')
  @Post('items/bulk-delete')
  async bulkDeleteItems(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: { itemIds: string[] },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.bulkDeleteItems(branchId, user.id, body.itemIds);
  }

  @Auth('menu.manage')
  @Post('items/price-adjustment')
  async bulkPriceAdjustment(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body()
    body: {
      itemIds: string[];
      type: 'percent' | 'fixed';
      value: number;
      direction: 'increase' | 'decrease';
    },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.bulkPriceAdjustment(branchId, user.id, body);
  }

  @Auth('menu.manage')
  @Post('items/assign-addons')
  async bulkAssignAddons(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body()
    body: {
      itemIds?: string[];
      categoryIds?: string[];
      modifierGroupId: string;
    },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.bulkAssignAddons(branchId, body);
  }

  @Auth('menu.manage')
  @Get('items/deleted')
  async getDeletedItems(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.getDeletedItems(branchId);
  }

  @Auth('menu.manage')
  @Post('items/restore/:id')
  async restoreItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.restoreItem(branchId, id);
  }

  @Auth('menu.view')
  @Get('items/:id')
  async getItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.getItem(branchId, id);
  }

  @Auth('menu.manage')
  @Post('items')
  @UsePipes(new ZodValidationPipe(menuItemSchema))
  async createItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.createItem(branchId, body as never);
  }

  @Auth('menu.manage')
  @Post('items/upload-image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadItemImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    assertValidImageSignature(file.path);
    try {
      const buffer = readFileSync(file.path);
      const mimeType = file.mimetype || 'image/png';
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

      try {
        unlinkSync(file.path);
      } catch {}

      return { url: dataUrl };
    } catch (err) {
      return { url: `/api/uploads/${file.filename}` };
    }
  }

  @Auth('menu.manage')
  @Patch('items/:id')
  async updateItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.updateItem(branchId, id, user.id, body as never);
  }

  @Auth('menu.manage')
  @Delete('items/:id')
  async deleteItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.deleteItem(branchId, id);
  }

  // --- Modifier groups --------------------------------------------------------

  @Auth('menu.manage')
  @Get('modifier-groups')
  async listModifierGroups(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.listModifierGroups(branchId);
  }

  @Auth('menu.manage')
  @Post('modifier-groups')
  @UsePipes(new ZodValidationPipe(modifierGroupSchema))
  async createModifierGroup(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.createModifierGroup(branchId, body as never);
  }

  @Auth('menu.manage')
  @Patch('modifier-groups/:id')
  async updateModifierGroup(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.updateModifierGroup(branchId, id, body as never);
  }

  @Auth('menu.manage')
  @Delete('modifier-groups/:id')
  async deleteModifierGroup(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.deleteModifierGroup(branchId, id);
  }

  // --- Combo meals -----------------------------------------------------------

  @Auth('menu.manage')
  @Get('items/:id/combo-components')
  async getComboComponents(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    return this.menuService.getComboComponents(branchId, id);
  }

  @Auth('menu.manage')
  @Post('items/:id/combo-components')
  @UsePipes(new ZodValidationPipe(setComboComponentsSchema))
  async setComboComponents(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId);
    const { components } = body as {
      components: { componentItemId: string; quantity: number }[];
    };
    return this.menuService.setComboComponents(branchId, id, components);
  }
}
