"use server";

import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCompany(formData: FormData) {
  const session = await auth();
  const name = formData.get("name") as string;

  if (!name || name.trim().length < 2) {
    return { error: "Company name must be at least 2 characters long." };
  }

  // Check for duplicate company name globally to ensure uniqueness
  const existingCompany = await db.company.findFirst({
    where: {
      name: {
        equals: name.trim(),
        mode: "insensitive",
      },
    },
  });

  if (existingCompany) {
    return { error: "A company with this name already exists." };
  }

  // Ensure we have a valid user ID for the foreign key constraint
  let userId = session?.user?.id;
  // Try email lookup if ID missing
  if (!userId && session?.user?.email) {
    const foundUser = await db.user.findUnique({
      where: { email: session.user.email },
    });
    userId = foundUser?.id;
  }
  // Final fallback: pick the first user in the database (development convenience)
  if (!userId) {
    const fallback = await db.user.findFirst();
    userId = fallback?.id;
  }

  // Ensure the resolved user actually exists in the DB
  if (userId) {
    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      userId = undefined;
    }
  }

  if (!userId) {
    // No authenticated (or valid) user – create company without linking a user
    const newCompany = await db.company.create({
      data: { name: name.trim() },
    });
    // Revalidate layout so the new company appears
    revalidatePath("/", "layout");
    return { success: true, company: newCompany };
  }

  try {
    // Create the company, assign user as SUPER_ADMIN, and update activeCompanyId all in a sequence.
    // We use a transaction to ensure data integrity.
    const result = await db.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: name.trim(),
        },
      });

      await tx.companyUser.create({
        data: {
          companyId: newCompany.id,
          userId: userId,
          role: Role.SUPER_ADMIN,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { activeCompanyId: newCompany.id },
      });

      return newCompany;
    });

    // Revalidate paths so Next.js fetches the new company layout data
    revalidatePath("/", "layout");

    return { success: true, company: result };
  } catch (error) {
    console.error("Failed to create company:", error);
    return { error: "Failed to create company. Please try again later." };
  }
}

export async function getCompaniesForRegistration() {
  try {
    const companies = await db.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return companies;
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    return [];
  }
}
