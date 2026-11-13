"use client";

import type { MenuCategoryDto, MenuItemDto } from "@nodedr-restaurant/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cacheMenu, getCachedMenu } from "@/lib/offline-db";

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  showOnWebsite: boolean;
  _count: { items: number };
}

export interface KitchenStation {
  id: string;
  name: string;
}

export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: string;
  isDefault: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  stationId: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  spiceLevel?: string | null;
  imageUrl: string | null;
  price: string;
  halfPrice: string | null;
  taxRatePercent: string;
  isVeg: boolean;
  isActive: boolean;
  isCombo: boolean;
  category: { id: string; name: string };
  station: { id: string; name: string } | null;
  modifierGroups: { modifierGroup: ModifierGroup }[];
}

export function useCategories(branchId: string | null) {
  return useQuery({
    queryKey: ["menu", "categories", branchId],
    queryFn: async () => {
      try {
        const categories = await api.get<MenuCategory[]>(`/menu/categories?branchId=${branchId}`);
        if (branchId && categories) {
          void cacheMenu(branchId, { categories });
        }
        return categories;
      } catch (err) {
        if (branchId) {
          const cached = await getCachedMenu(branchId);
          if (cached?.categories && cached.categories.length > 0) {
            return cached.categories as MenuCategory[];
          }
        }
        throw err;
      }
    },
    enabled: !!branchId,
  });
}

export function useStations(branchId: string | null) {
  return useQuery({
    queryKey: ["menu", "stations", branchId],
    queryFn: () => api.get<KitchenStation[]>(`/menu/stations?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

export function useModifierGroups(branchId: string | null) {
  return useQuery({
    queryKey: ["menu", "modifier-groups", branchId],
    queryFn: () => api.get<ModifierGroup[]>(`/menu/modifier-groups?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

export function useMenuItems(branchId: string | null, categoryId?: string) {
  return useQuery({
    queryKey: ["menu", "items", branchId, categoryId],
    queryFn: async () => {
      try {
        const items = await api.get<MenuItem[]>(
          `/menu/items?branchId=${branchId}${categoryId ? `&categoryId=${categoryId}` : ""}`,
        );
        if (branchId && items && !categoryId) {
          void cacheMenu(branchId, { items });
        }
        return items;
      } catch (err) {
        if (branchId) {
          const cached = await getCachedMenu(branchId);
          if (cached?.items && cached.items.length > 0) {
            let res = cached.items as MenuItem[];
            if (categoryId) {
              res = res.filter((item) => item.categoryId === categoryId);
            }
            return res;
          }
        }
        throw err;
      }
    },
    enabled: !!branchId,
  });
}

export function useCreateCategory(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: MenuCategoryDto) =>
      api.post(`/menu/categories?branchId=${branchId}`, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] }),
  });
}

export function useUpdateCategory(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<MenuCategoryDto> }) =>
      api.patch(`/menu/categories/${id}?branchId=${branchId}`, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] }),
  });
}

export function useDeleteCategory(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/menu/categories/${id}?branchId=${branchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
    },
  });
}

export function useUploadItemImage() {
  return useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>("/menu/items/upload-image", file),
  });
}

export function useCreateMenuItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: MenuItemDto) => api.post(`/menu/items?branchId=${branchId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

export function useUpdateMenuItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<MenuItemDto> }) =>
      api.patch(`/menu/items/${id}?branchId=${branchId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

export function useDeleteMenuItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}?branchId=${branchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

import type { BulkMenuItemInput } from "@/lib/csv-parser";
export type { BulkMenuItemInput };

export function useBulkImportMenuItems(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkMenuItemInput[]) =>
      api.post<{ success: boolean; count: number; categoriesCreated: number }>(
        `/menu/items/bulk?branchId=${branchId}`,
        { items },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

export function useBulkUpdateMenuItems(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemIds,
      updates,
    }: {
      itemIds: string[];
      updates: Record<string, unknown>;
    }) =>
      api.patch<{ updatedCount: number }>(`/menu/items/bulk-update?branchId=${branchId}`, {
        itemIds,
        updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

export function useBulkDeleteMenuItems(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      api.post<{ deletedCount: number }>(`/menu/items/bulk-delete?branchId=${branchId}`, {
        itemIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

export function useQuickToolPriceAdjust(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      itemIds: string[];
      type: "percent" | "fixed";
      value: number;
      direction: "increase" | "decrease";
    }) =>
      api.post<{ updatedCount: number }>(`/menu/items/price-adjustment?branchId=${branchId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
    },
  });
}

export function useQuickToolAssignAddons(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      itemIds?: string[];
      categoryIds?: string[];
      modifierGroupId: string;
    }) =>
      api.post<{ assignedCount: number }>(`/menu/items/assign-addons?branchId=${branchId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
    },
  });
}

export function useDeletedMenuItems(branchId: string | null) {
  return useQuery({
    queryKey: ["menu", "items", "deleted", branchId],
    queryFn: () => api.get<MenuItem[]>(`/menu/items/deleted?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

export function useRestoreMenuItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/menu/items/restore/${id}?branchId=${branchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "items", "deleted", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}
