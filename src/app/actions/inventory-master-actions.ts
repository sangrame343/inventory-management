"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getSessionCompany() {
  const session = await auth();
  if (!session?.user?.activeCompanyId) throw new Error("Unauthorized or no active company");
  return session.user.activeCompanyId;
}

// ============================================
// Categories
// ============================================

export async function getInventoryCategories() {
  const companyId = await getSessionCompany();
  return db.inventoryCategory.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createInventoryCategory(name: string, description?: string) {
  const companyId = await getSessionCompany();
  const res = await db.inventoryCategory.create({
    data: { companyId, name, description },
  });
  revalidatePath("/inventory");
  return res;
}

// ============================================
// Units of Measure
// ============================================

export async function getInventoryUnits() {
  const companyId = await getSessionCompany();
  return db.unitOfMeasure.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createInventoryUnit(name: string, symbol: string, description?: string) {
  const companyId = await getSessionCompany();
  const res = await db.unitOfMeasure.create({
    data: { companyId, name, symbol, description },
  });
  revalidatePath("/inventory");
  return res;
}

// ============================================
// Locations
// ============================================

export async function getInventoryLocations() {
  const companyId = await getSessionCompany();
  return db.inventoryLocation.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createInventoryLocation(name: string, code?: string, description?: string) {
  const companyId = await getSessionCompany();
  const res = await db.inventoryLocation.create({
    data: { companyId, name, code, description },
  });
  revalidatePath("/inventory");
  return res;
}
