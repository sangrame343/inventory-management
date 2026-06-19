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

  static async getEmployeesPaginated(companyId: string, params: {
    page: number;
    limit: number;
    query?: string;
    status?: string;
    departmentId?: string;
    locationId?: string;
    sortBy?: string;
    order?: "asc" | "desc";
  }) {
    const skip = (params.page - 1) * params.limit;
    const take = params.limit;

    const andConditions: Prisma.EmployeeWhereInput[] = [{ companyId }];

    if (params.query) {
      const q = params.query.trim();
      andConditions.push({
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { employeeCode: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { designation: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (params.status) {
      const statuses = params.status.split(",").filter(Boolean);
      if (statuses.length === 1 && statuses[0] === "OTHER") {
        // OTHER = everything except ACTIVE
        andConditions.push({ status: { not: "ACTIVE" } });
      } else if (statuses.length === 1) {
        andConditions.push({ status: statuses[0] });
      } else {
        andConditions.push({ status: { in: statuses } });
      }
    }

    if (params.departmentId) {
      andConditions.push({ departmentId: params.departmentId });
    }

    if (params.locationId) {
      andConditions.push({ locationId: params.locationId });
    }

    const where: Prisma.EmployeeWhereInput = { AND: andConditions };

    const sortField = params.sortBy || "fullName";
    const sortOrder = params.order || "asc";
    let orderBy: Prisma.EmployeeOrderByWithRelationInput = { fullName: "asc" };

    if (sortField === "fullName") {
      orderBy = { fullName: sortOrder };
    } else if (sortField === "employeeCode") {
      orderBy = { employeeCode: sortOrder };
    } else if (sortField === "joiningDate") {
      orderBy = { joiningDate: sortOrder };
    } else if (sortField === "status") {
      orderBy = { status: sortOrder };
    } else if (sortField === "department") {
      orderBy = { department: { name: sortOrder } };
    } else if (sortField === "location") {
      orderBy = { location: { name: sortOrder } };
    }

    const [total, data] = await Promise.all([
      db.employee.count({ where }),
      db.employee.findMany({
        where,
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
        orderBy,
        skip,
        take,
      }),
    ]);

    return { total, data };
  }

  static async getEmployeesDropdown(companyId: string) {
    return await db.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        userId: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  static async getEmployeeStatusCounts(companyId: string) {
    const counts = await db.employee.groupBy({
      by: ["status"],
      where: { companyId },
      _count: true,
    });
    return counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);
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
            acknowledgement: true,
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
