import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { EmployeeService } from "@/services/employee-service";
import { z } from "zod";

const employeeSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  employeeCode: z.string().min(1, "Employee code is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  status: z.string().optional().default("ACTIVE"),
  userId: z.string().optional(),
  joiningDate: z.string().transform((val) => new Date(val)),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employees = await EmployeeService.getEmployees(session.user.activeCompanyId);
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = employeeSchema.parse(body);

    const existing = await EmployeeService.getEmployeeByCode(validated.employeeCode, session.user.activeCompanyId);
    if (existing) {
      return NextResponse.json({ error: "Employee code already exists" }, { status: 409 });
    }

    const employee = await EmployeeService.createEmployee(
      {
        ...validated,
        companyId: session.user.activeCompanyId,
      },
      session.user.activeCompanyId
    );

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
