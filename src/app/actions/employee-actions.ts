"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getSessionContext() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.activeCompanyId) {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    companyId: session.user.activeCompanyId,
  };
}

export async function getExportEmployeesData(format: "friendly" | "all" = "friendly") {
  const { companyId } = await getSessionContext();

  const employees = await db.employee.findMany({
    where: { companyId },
    include: {
      department: true,
      location: true,
      user: true,
    },
    orderBy: { fullName: "asc" },
  });

  return employees.map((employee) => {
    const baseData = {
      "Employee Code": employee.employeeCode,
      "Full Name": employee.fullName,
      "Email": employee.email || "",
      "Phone": employee.phone || "",
      "Department": employee.department?.name || "",
      "Location": employee.location?.name || "",
      "Designation": employee.designation || "",
      "Status": employee.status,
      "Joining Date": employee.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : "",
    };

    if (format === "all") {
      return {
        "Database ID": employee.id,
        ...baseData,
        "Is Portal User": employee.userId ? "Yes" : "No",
        "Created At": new Date(employee.createdAt).toLocaleString(),
        "Updated At": new Date(employee.updatedAt).toLocaleString(),
      };
    }

    return baseData;
  });
}
