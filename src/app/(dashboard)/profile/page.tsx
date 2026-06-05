import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/app/actions/profile-actions";
import { ProfilePage } from "@/components/profile/profile-page";

export default async function ProfileRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getUserProfile();

  return <ProfilePage profile={profile} />;
}
