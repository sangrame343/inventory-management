import { db } from "@/lib/db";
import { Employee, Prisma } from "@prisma/client";

export class EmployeeService {
  static async getEmployees(companyId: string) {
    return await db.employee.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        department: true,
        location: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  static async getEmployeeById(id: string, companyId: string) {
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
        location: true,
        assignments: {
          include: {
            asset: true,
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!employee || employee.companyId !== companyId) return null;
    return employee;
  }

  static async getEmployeeDetailById(id: string, companyId: string) {
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        department: true,
        location: true,
        assignments: {
          where: { returnedAt: null },
          include: {
            asset: {
              include: {
                category: true,
              }
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!employee || employee.companyId !== companyId) return null;

    const history = await db.assetAssignment.findMany({
      where: {
        employeeId: id,
        companyId,
        returnedAt: { not: null }
      },
      include: {
        asset: {
          include: {
            category: true,
          }
        },
      },
      orderBy: { returnedAt: "desc" },
    });

    return {
      ...employee,
      history,
    };
  }

  static async createEmployee(data: Prisma.EmployeeUncheckedCreateInput, companyId: string) {
    return await db.employee.create({
      data,
    });
  }

  static async updateEmployee(id: string, companyId: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new Error("Employee not found or access denied");
    }

    return await db.employee.update({
      where: { id },
      data,
    });
  }

  static async deleteEmployee(id: string, companyId: string) {
    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new Error("Employee not found or access denied");
    }

    return await db.employee.delete({
      where: { id },
    });
  }

  static async getEmployeeByCode(employeeCode: string, companyId: string) {
    return await db.employee.findUnique({
      where: {
        companyId_employeeCode: {
          companyId,
          employeeCode,
        },
      },
    });
  }
}
