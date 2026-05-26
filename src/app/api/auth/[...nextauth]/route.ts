import { handlers } from "@/lib/auth";
console.log("Auth route handler loaded");

export const { GET, POST } = handlers;
console.log("Auth route handler exported GET/POST");