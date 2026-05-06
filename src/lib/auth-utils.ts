import { auth } from "@/lib/auth";

/**
 * Ensures the session is valid and an activeCompanyId is selected.
 * Throws an Error if no company context is selected, to prevent tenant leakage.
 */
export async function requireActiveCompany() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // NextAuth types might need assertion depending on next-auth d.ts config
  const user = session.user as any;

  if (!user.activeCompanyId) {
    throw new Error("No active company context. Please select a company first.");
  }

  return {
    userId: user.id as string,
    companyId: user.activeCompanyId as string,
    role: user.role as string,
  };
}
