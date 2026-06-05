import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsService } from "@/services/settings-service";
import { SettingsConsole } from "@/components/settings/settings-console";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");

  const settings = await SettingsService.getSettings(session.user.activeCompanyId);

  return <SettingsConsole settings={settings as any} />;
}
