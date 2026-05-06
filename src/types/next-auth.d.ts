import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      companyIds: string[]
      activeCompanyId: string | null
      isSuperAdmin?: boolean
    } & DefaultSession["user"]
  }
}
