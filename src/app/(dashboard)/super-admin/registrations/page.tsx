import { getPendingRegistrations } from "@/app/actions/super-admin-actions";
import { getCompaniesForRegistration } from "@/app/actions/company-actions";
import { RegistrationsClient } from "./registrations-client";

export const dynamic = 'force-dynamic';

export default async function SuperAdminRegistrationsPage() {
  const registrations = await getPendingRegistrations();
  const companies = await getCompaniesForRegistration();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Registration Approvals</h1>
      </div>
      <p className="text-muted-foreground">
        Review pending user registrations. Only Super Admins have access to this page.
      </p>
      
      <RegistrationsClient registrations={registrations} companies={companies} />
    </div>
  );
}
