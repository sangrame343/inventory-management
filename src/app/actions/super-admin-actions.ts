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
    // Delete the user
    await db.user.delete({
      where: { id: userId },
    });

    revalidatePath("/super-admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Delete user fail:", error);
    // Return friendly error if constraint fails
    if (error.code === 'P2003') {
      return { error: "Cannot delete user because they have associated records (e.g. assets, tickets, logs). Please reassign or delete those records first." };
    }
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
