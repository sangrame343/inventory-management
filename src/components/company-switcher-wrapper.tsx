"use client";

import { CompanySwitcher } from "@/components/company-switcher";

// Local Company type matching the shape expected by CompanySwitcher
interface Company {
  id: string;
  name: string;
}

interface CompanySwitcherWrapperProps {
  companies: Company[];
  activeCompanyId: string | null;
}

export default function CompanySwitcherWrapper({
  companies,
  activeCompanyId,
}: CompanySwitcherWrapperProps) {
  console.log('CompanySwitcherWrapper rendered', { companies, activeCompanyId });
  return (
    <div className="flex items-center gap-2">
      <CompanySwitcher
        companies={companies}
        activeCompanyId={activeCompanyId}
      />
    </div>
  );
}
