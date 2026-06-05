"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  mobile: z.string().max(20).nullable().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      image: true,
      isSuperAdmin: true,
      status: true,
      emailVerified: true,
      companyRoles: {
        select: {
          role: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function updateProfile(data: {
  name: string;
  email: string;
  mobile?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if email is already taken by another user
  if (parsed.data.email !== session.user.email) {
    const existing = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing && existing.id !== session.user.id) {
      return { error: "This email address is already in use by another account" };
    }
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        mobile: parsed.data.mobile || null,
      },
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update profile. Please try again." };
  }
}

export async function updatePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = passwordSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { error: "Password cannot be changed for this account type" };
  }

  const isCurrentValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );

  if (!isCurrentValid) {
    return { error: "Current password is incorrect" };
  }

  // Ensure new password is different from current
  const isSamePassword = await bcrypt.compare(
    parsed.data.newPassword,
    user.passwordHash
  );

  if (isSamePassword) {
    return { error: "New password must be different from your current password" };
  }

  try {
    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update password. Please try again." };
  }
}
