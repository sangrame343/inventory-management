import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { db } from "./db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig, // ✅ Edge-safe base config

  adapter: PrismaAdapter(db),

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            companyRoles: true,
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (user.status === "PENDING") {
          throw new Error("Your registration is pending approval by the Super Admin.");
        }
        if (user.status === "REJECTED") {
          throw new Error("Your registration has been rejected.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          activeCompanyId: user.activeCompanyId,
          companyRoles: user.companyRoles,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 🔥 On login
      if (user) {
        token.id = user.id;
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
          token.role =
            companyRoles.length > 0
              ? companyRoles[0].role
              : "EMPLOYEE";
        }
      }

      // 🔁 On company switch
      if (trigger === "update" && session?.activeCompanyId) {
        token.activeCompanyId = session.activeCompanyId;
        token.role = session.role || token.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).companyIds =
          token.companyIds as string[];
        (session.user as any).activeCompanyId =
          token.activeCompanyId as string | null;
        (session.user as any).isSuperAdmin = token.isSuperAdmin as boolean;
      }

      return session;
    },
  },
});