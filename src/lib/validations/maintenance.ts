import { z } from "zod";
import { TicketPriority, TicketStatus, MaintenanceType } from "@prisma/client";

export const maintenanceTicketSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(TicketPriority),
  status: z.nativeEnum(TicketStatus).default(TicketStatus.OPEN),
  type: z.nativeEnum(MaintenanceType).default(MaintenanceType.CORRECTIVE),
  
  assignedToId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  
  scheduledDate: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  startedAt: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  resolvedAt: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  completedAt: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  laborCost: z.coerce.number().min(0).optional().nullable(),
  partsCost: z.coerce.number().min(0).optional().nullable(),
  cost: z.coerce.number().min(0).optional().nullable(),
  
  downtimeHours: z.coerce.number().min(0).optional().nullable(),
  resolutionNotes: z.string().optional().nullable(),
});

export const maintenanceScheduleSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  title: z.string().min(3, "Title is required"),
  description: z.string().optional().nullable(),
  frequencyDays: z.coerce.number().int().min(1, "Frequency must be at least 1 day"),
  nextDueDate: z.string().datetime().or(z.date()),
  isActive: z.boolean().default(true),
});

export type MaintenanceTicketFormValues = z.infer<typeof maintenanceTicketSchema>;
export type MaintenanceScheduleFormValues = z.infer<typeof maintenanceScheduleSchema>;
