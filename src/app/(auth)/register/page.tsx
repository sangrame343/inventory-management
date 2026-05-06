import { getCompaniesForRegistration } from "@/app/actions/company-actions";
import { RegisterForm } from "@/components/register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const companies = await getCompaniesForRegistration();

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
      <RegisterForm companies={companies} />
    </div>
  );
}
