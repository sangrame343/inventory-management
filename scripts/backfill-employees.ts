import "dotenv/config";
import { db } from "../src/lib/db";

async function backfillEmployees() {
  console.log("Starting selective employee backfill...");

  try {
    // 1. Find all users who are currently assigned assets
    const assignments = await db.assetAssignment.findMany({
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
      if (!assignment.userId) continue;

      const user = await db.user.findUnique({
        where: { id: assignment.userId },
        include: {
          employee: true, 
        },
      });

      if (!user) continue;

      if (user.employee) {
        console.log(`User ${user.name} already has an employee record. Linking assignments...`);
        // Update their assignments to link to the existing employee
        await db.assetAssignment.updateMany({
          where: { userId: user.id, companyId: assignment.companyId },
          data: { employeeId: user.employee.id },
        });
        continue;
      }

      // Create new employee record
      const employeeCode = `EMP-${user.id.substring(user.id.length - 6).toUpperCase()}`;
      
      console.log(`Creating employee record for user: ${user.name} (${user.email})`);
      
      const newEmployee = await db.employee.create({
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
      await db.assetAssignment.updateMany({
        where: { userId: user.id, companyId: assignment.companyId },
        data: { employeeId: newEmployee.id },
      });

      console.log(`Successfully backfilled employee for ${user.name}`);
    }

    console.log("Backfill complete.");
  } catch (error) {
    console.error("Backfill failed:", error);
  } finally {
    // No explicit disconnect needed if we use the global db instance? 
    // Actually Prisma recommends disconnecting.
  }
}

backfillEmployees();
