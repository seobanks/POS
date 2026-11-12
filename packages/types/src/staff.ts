import { z } from "zod";

export const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1).optional().nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(1, "Password is required"),
  roleId: z.string().min(1, "Role is required"),
  branchIds: z.array(z.string()).min(1, "At least one branch is required"),
});
export type CreateStaffDto = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().min(1).optional().nullable(),
  phone: z.string().optional().nullable(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  branchIds: z.array(z.string()).optional(),
  password: z.string().min(1).optional(),
});
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;
