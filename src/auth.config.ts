import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.activeCompanyId = (user as any).activeCompanyId || null;
        token.isSuperAdmin = (user as any).isSuperAdmin || false;

        const companyRoles = (user as any).companyRoles || [];
        token.companyIds = companyRoles.map((cr: any) => cr.companyId);

        if (token.activeCompanyId) {
          const activeRole = companyRoles.find(
            (cr: any) => cr.companyId === token.activeCompanyId
          )?.role;
          token.role = activeRole || "EMPLOYEE";
        } else {
          token.role = companyRoles.length > 0 ? companyRoles[0].role : "EMPLOYEE";
        }
      }

      if (trigger === "update" && session?.activeCompanyId) {
        token.activeCompanyId = session.activeCompanyId;
        token.role = session.role || token.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).companyIds = token.companyIds as string[];
        (session.user as any).activeCompanyId =
          token.activeCompanyId as string | null;
        (session.user as any).isSuperAdmin = token.isSuperAdmin as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;