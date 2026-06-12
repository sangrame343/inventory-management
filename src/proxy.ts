import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isPublicAcknowledgeRoute = 
    req.nextUrl.pathname.startsWith("/acknowledge") || 
    req.nextUrl.pathname.startsWith("/api/acknowledge");

  if (isApiAuthRoute || isPublicAcknowledgeRoute) return;

  if (req.nextUrl.pathname === "/") {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", req.nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  const role = (req.auth?.user as any)?.role;

  // 1. USER Role Protection
  if (role === "USER") {
    const restrictedForUsers = [
      "/inventory",
      "/maintenance",
      "/employees",
      "/transfers",
      "/settings",
      "/super-admin",
      "/approvals",
      "/my-requests"
    ];
    
    const isRestricted = restrictedForUsers.some(path => req.nextUrl.pathname.startsWith(path));
    if (isRestricted) {
      return Response.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  // 2. ADMIN Role Protection
  if (role === "ADMIN") {
    const restrictedForAdmins = [
      "/super-admin",
      "/approvals"
    ];
    
    const isRestricted = restrictedForAdmins.some(path => req.nextUrl.pathname.startsWith(path));
    if (isRestricted) {
      return Response.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  // 3. Routing Specifics
  if (req.nextUrl.pathname === "/my-requests" && role !== "ADMIN") {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (req.nextUrl.pathname === "/approvals" && role !== "SUPER_ADMIN") {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  // 4. Legacy isSuperAdmin check for safety
  const isSuperAdminRoute = req.nextUrl.pathname.startsWith("/super-admin");
  const isSuperAdmin = !!(req.auth?.user as any)?.isSuperAdmin;

  if (isSuperAdminRoute && !isSuperAdmin && role !== "SUPER_ADMIN") {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  return;
});


export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};