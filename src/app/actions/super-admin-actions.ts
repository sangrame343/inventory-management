"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";


async function isSuperAdminReq() {
  const session = await auth();
  return !!(session?.user as any)?.isSuperAdmin;
}

export async function getPendingRegistrations() {
  if (!(await isSuperAdminReq())) {
    throw new Error("Unauthorized");
  }

  try {
    return await db.user.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "REJECTED" },
        ],
      },
      include: {
        // Just the fields we need, but Prisma can pull all
      },
      orderBy: {
        id: 'desc'
      }
    });
  } catch (error) {
    console.error("Failed to fetch registrations", error);
    return [];
  }
}

export async function approveRegistration(userId: string) {
  if (!(await isSuperAdminReq())) {
    throw new Error("Unauthorized");
  }

  try {
    const userToApprove = await db.user.findUnique({ where: { id: userId } });
    
    if (!userToApprove) throw new Error("User not found");
    if (!userToApprove.requestedCompanyId || !userToApprove.requestedRole) {
      throw new Error("Missing requested company or role");
    }

    // Assign company and set status to ACTIVE
    await db.$transaction(async (tx) => {
      const isSuperAdminRequested = userToApprove.requestedRole === Role.SUPER_ADMIN;

      await tx.user.update({
        where: { id: userId },
        data: {
          status: "ACTIVE",
          activeCompanyId: userToApprove.requestedCompanyId,
          isSuperAdmin: isSuperAdminRequested ? true : userToApprove.isSuperAdmin,
        },
      });


      // Upsert the CompanyUser
      await tx.companyUser.upsert({
        where: {
          companyId_userId: {
            companyId: userToApprove.requestedCompanyId as string,
            userId: userId,
          },
        },
        create: {
          companyId: userToApprove.requestedCompanyId as string,
          userId: userId,
          role: userToApprove.requestedRole!,
        },
        update: {
          role: userToApprove.requestedRole!,
        },
      });
    });

    revalidatePath("/super-admin/registrations");
    return { success: true };
  } catch (error: any) {
    console.error("Approval fail:", error);
    return { error: error.message || "Failed to approve registration" };
  }
}

export async function rejectRegistration(userId: string, remarks: string) {
  if (!(await isSuperAdminReq())) {
    throw new Error("Unauthorized");
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        status: "REJECTED",
        rejectionRemarks: remarks,
      },
    });

    revalidatePath("/super-admin/registrations");
    return { success: true };
  } catch (error: any) {
    console.error("Rejection fail:", error);
    return { error: error.message || "Failed to reject registration" };
  }
}

export async function getActiveUsers() {
  if (!(await isSuperAdminReq())) {
    throw new Error("Unauthorized");
  }

  try {
    return await db.user.findMany({
      where: {
        status: "ACTIVE",
        isSuperAdmin: false, // typically don't want to list the super admin for deletion
      },
      include: {
        companyRoles: {
          include: {
            company: true,
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  } catch (error) {
    console.error("Failed to fetch active users:", error);
    return [];
  }
}

export async function deleteUser(userId: string) {
  if (!(await isSuperAdminReq())) {
    throw new Error("Unauthorized");
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Nullify references in Inventory Transaction & Adjustment
      await tx.inventoryTransaction.updateMany({
        where: { createdById: userId },
        data: { createdById: null },
      });
      await tx.inventoryTransaction.updateMany({
        where: { employeeId: userId },
        data: { employeeId: null },
      });
      await tx.inventoryAdjustment.updateMany({
        where: { createdById: userId },
        data: { createdById: null },
      });

      // 2. Nullify references in Inventory Items
      await tx.inventoryItem.updateMany({
        where: { createdById: userId },
        data: { createdById: null },
      });
      await tx.inventoryItem.updateMany({
        where: { updatedById: userId },
        data: { updatedById: null },
      });

      // 3. Delete approvals requested by or reviewed by this user
      await tx.approvalRequest.deleteMany({
        where: {
          OR: [
            { requestedById: userId },
            { reviewedById: userId },
          ],
        },
      });

      // 4. Delete Maintenance Tickets created by or assigned to this user
      await tx.maintenanceTicket.deleteMany({
        where: {
          OR: [
            { createdById: userId },
            { assignedToId: userId },
          ],
        },
      });

      // 5. Delete Asset Transfers involving this user
      await tx.assetTransfer.deleteMany({
        where: {
          OR: [
            { requestedById: userId },
            { approvedById: userId },
            { completedById: userId },
            { updatedById: userId },
          ],
        },
      });

      // 6. Delete Asset Assignments involving this user
      await tx.assetAssignment.deleteMany({
        where: {
          OR: [
            { userId },
            { assignedById: userId },
            { managerUserId: userId },
          ],
        },
      });

      // 7. Delete CompanyUser associations
      await tx.companyUser.deleteMany({
        where: { userId },
      });

      // 8. Delete NextAuth Accounts & Sessions
      await tx.account.deleteMany({
        where: { userId },
      });
      await tx.session.deleteMany({
        where: { userId },
      });

      // 9. Delete the User record
      await tx.user.delete({
        where: { id: userId },
      });
    });

    revalidatePath("/super-admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Delete user fail:", error);
    return { error: error.message || "Failed to delete user" };
  }
}

export async function updateUser(userId: string, data: { name: string; email: string; mobile?: string; password?: string }) {
  if (!(await isSuperAdminReq())) {
    throw new Error("Unauthorized");
  }

  try {
    const updateData: any = {
      name: data.name,
      email: data.email,
      mobile: data.mobile,
    };

    if (data.password && data.password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath("/super-admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Update user fail:", error);
    return { error: error.message || "Failed to update user" };
  }
}

export async function createActiveUser(data: {
  name: string;
  email: string;
  mobile?: string;
  password?: string;
  companyId: string;
  role: Role;
}) {
  if (!(await isSuperAdminReq())) {
    throw new Error("Unauthorized");
  }

  try {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { error: "A user with this email already exists" };
    }

    const passwordHash = await bcrypt.hash(data.password || "Password123", 10);

    const isSuperAdminRequested = data.role === Role.SUPER_ADMIN;

    await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          mobile: data.mobile,
          passwordHash,
          status: "ACTIVE",
          activeCompanyId: data.companyId,
          isSuperAdmin: isSuperAdminRequested,
        },
      });

      await tx.companyUser.create({
        data: {
          companyId: data.companyId,
          userId: newUser.id,
          role: data.role,
        },
      });
    });

    revalidatePath("/super-admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Create active user fail:", error);
    return { error: error.message || "Failed to create user" };
  }
}

