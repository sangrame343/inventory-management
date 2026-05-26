import { z } from "zod";

export const companySettingsSchema = z.object({
  assetCodePrefix: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  dateFormat: z.string().optional().nullable(),
  maintenanceReminderDays: z.number().min(0),
  requireTransferApproval: z.boolean(),
  requireMaintenanceApproval: z.boolean(),
  autoGenerateAssetCode: z.boolean(),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

// Shared Base
const baseMasterSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Domain Specifics
export const departmentSchema = baseMasterSchema.extend({
  code: z.string().optional().nullable(),
});
export const assetCategorySchema = baseMasterSchema.extend({
  code: z.string().optional().nullable(),
});

export const vendorSchema = baseMasterSchema.extend({
  contactName: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  service: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
});

export const inventoryCategorySchema = baseMasterSchema;

export const unitOfMeasureSchema = baseMasterSchema.extend({
  symbol: z.string().min(1, "Symbol is required").trim(),
});

export const inventoryLocationSchema = baseMasterSchema.extend({
  code: z.string().optional().nullable(),
});

export type MasterDataInput = z.infer<typeof baseMasterSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type UOMInput = z.infer<typeof unitOfMeasureSchema>;
export type InventoryLocationInput = z.infer<typeof inventoryLocationSchema>;

export const domainSchemas: Record<string, z.ZodSchema> = {
  "departments": departmentSchema,
  "asset-categories": assetCategorySchema,
  "vendors": vendorSchema,
  "inventory-categories": inventoryCategorySchema,
  "units-of-measure": unitOfMeasureSchema,
  "inventory-locations": inventoryLocationSchema,
};

