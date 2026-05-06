const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function backfillEmployees() {
  console.log("Starting selective employee backfill...");

  try {
    // 1. Find all users who are currently assigned assets
    const assignments = await prisma.assetAssignment.findMany({
      where: {
        employeeId: null,
        userId: { not: "" },
      },
      distinct: ["userId"],
      select: {
        userId: true,
        companyId: true,
      },
    });

    console.log(`Found ${assignments.length} unique users with legacy assignments.`);

    for (const assignment of assignments) {
      const user = await prisma.user.findUnique({
        where: { id: assignment.userId },
        include: {
          employee: true, // Check if they already have an employee across any company
        },
      });

      if (!user) continue;

      // Check if they already have an employee record in THIS specific company
      // (The user-employee relation is 1-to-1 in my schema now, but we check by companyId too)
      const existingEmployee = await prisma.employee.findUnique({
        where: { userId: user.id },
      });

      if (existingEmployee) {
        console.log(`User ${user.name} already has an employee record. Linking assignments...`);
        // Update their assignments to link to the existing employee
        await prisma.assetAssignment.updateMany({
          where: { userId: user.id, companyId: assignment.companyId },
          data: { employeeId: existingEmployee.id },
        });
        continue;
      }

      // Create new employee record
      const employeeCode = `EMP-${user.id.substring(user.id.length - 6).toUpperCase()}`;
      
      console.log(`Creating employee record for user: ${user.name} (${user.email})`);
      
      const newEmployee = await prisma.employee.create({
        data: {
          companyId: assignment.companyId,
          userId: user.id,
          fullName: user.name || "Unknown User",
          email: user.email,
          employeeCode,
          joiningDate: new Date(),
          status: "ACTIVE",
        },
      });

      // Update their assignments to link to the new employee
      await prisma.assetAssignment.updateMany({
        where: { userId: user.id, companyId: assignment.companyId },
        data: { employeeId: newEmployee.id },
      });

      console.log(`Successfully backfilled employee for ${user.name}`);
    }

    console.log("Backfill complete.");
  } catch (error) {
    console.error("Backfill failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillEmployees();
