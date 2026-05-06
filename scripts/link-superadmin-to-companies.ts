// scripts/link-superadmin-to-companies.ts
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

/**
 * Links the first user with a SUPER_ADMIN role (the "super admin")
 * to every existing company that does not already have a CompanyUser entry.
 *
 * Run with: npx tsx scripts/link-superadmin-to-companies.ts
 */
async function main() {
  // Find a user that has a SUPER_ADMIN role in any company
  const superAdmin = await db.user.findFirst({
    where: {
      companyRoles: {
        some: { role: Role.SUPER_ADMIN },
      },
    },
    include: { companyRoles: true },
  });

  if (!superAdmin) {
    console.error("❌ No user with SUPER_ADMIN role found.");
    process.exit(1);
  }

  const userId = superAdmin.id;
  console.log(`🔑 Super admin user ID: ${userId}`);

  // Get all companies
  const companies = await db.company.findMany({ select: { id: true } });

  let linked = 0;
  for (const { id: companyId } of companies) {
    const exists = await db.companyUser.findFirst({
      where: { companyId, userId },
    });
    if (!exists) {
      await db.companyUser.create({
        data: {
          companyId,
          userId,
          role: Role.SUPER_ADMIN,
        },
      });
      console.log(`✅ Linked user ${userId} to company ${companyId}`);
      linked++;
    }
  }

  console.log(`\n🏁 Finished. Linked ${linked} company(ies).`);
}

main()
  .catch((e) => {
    console.error("❗ Unexpected error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
