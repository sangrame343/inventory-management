import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  code: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  parentLocationId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" || val === "root" ? null : val)),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type LocationFormInput = z.infer<typeof locationSchema>;
