import { LocationService } from "@/services/location-service";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LocationsClient } from "@/components/locations/locations-client";

export default async function LocationsPage() {
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");

  const locations = await LocationService.getLocationTree(session.user.activeCompanyId);

  return (
    <div className="max-w-[1240px] mx-auto py-8">
      <LocationsClient initialLocations={locations} />
    </div>
  );
}
