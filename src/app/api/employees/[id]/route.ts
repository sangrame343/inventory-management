import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { EmployeeService } from "@/services/employee-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await EmployeeService.getEmployeeDetailById(id, session.user.activeCompanyId);

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("[EMPLOYEE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch employee details" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Convert joiningDate string to Date if present
    if (body.joiningDate) {
      body.joiningDate = new Date(body.joiningDate);
    }

    const employee = await EmployeeService.updateEmployee(id, session.user.activeCompanyId, body);

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error("[EMPLOYEE_PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await EmployeeService.deleteEmployee(id, session.user.activeCompanyId);

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    console.error("[EMPLOYEE_DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete employee" },
      { status: 500 }
    );
  }
}
