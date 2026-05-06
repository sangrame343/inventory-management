"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const mobile = formData.get("mobile") as string;
  const password = formData.get("password") as string;
  const companyId = formData.get("companyId") as string;
  const role = formData.get("role") as Role;

  if (!name || !email || !password || !companyId || !role) {
    return { error: "Missing required fields" };
  }

  // Basic validate
  if (role !== Role.COMPANY_ADMIN && role !== Role.ASSET_MANAGER && role !== Role.INVENTORY_MANAGER && role !== Role.MAINTENANCE_MANAGER && role !== Role.TECHNICIAN && role !== Role.EMPLOYEE && role !== Role.AUDITOR && role !== Role.FINANCE_VIEWER) {
    return { error: "Invalid role selected" };
  }
  
  if (role === Role.SUPER_ADMIN) {
     return { error: "Cannot register as SUPER_ADMIN" };
  }

  // Check existing user
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existingUser) {
    if (existingUser.status === "ACTIVE" || existingUser.status === "PENDING") {
      return { error: "A user with this email already exists" };
    }
    // If rejected, we allow reapplying
    if (existingUser.status === "REJECTED") {
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            mobile,
            passwordHash,
            requestedCompanyId: companyId,
            requestedRole: role,
            status: "PENDING",
            rejectionRemarks: null // clear old remarks
          }
        });
        return { success: true };
    }
  }

  // Create new PENDING user
  await db.user.create({
    data: {
      name,
      email,
      mobile,
      passwordHash,
      requestedCompanyId: companyId,
      requestedRole: role,
      status: "PENDING",
    },
  });

  return { success: true };
}

export async function switchActiveCompany(companyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify the user actually belongs to this company
  const companyUser = await db.companyUser.findUnique({
    where: {
      companyId_userId: {
        userId: session.user.id,
        companyId: companyId,
      },
    },
  });

  if (!companyUser) {
    throw new Error("User does not belong to the selected company.");
  }

  // Update the user's active company in the database to persist the preference
  await db.user.update({
    where: { id: session.user.id },
    data: { activeCompanyId: companyId },
  });

  return { success: true };
}
