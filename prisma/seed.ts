import "dotenv/config";
import {
  PrismaClient,
  Role,
  AssetStatus,
  HandoverType,
  PhysicalCondition,
  FunctionalStatus,
  TicketPriority,
  TicketStatus,
  MaintenanceType,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

let prisma: PrismaClient;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  prisma = new PrismaClient({ adapter });
  const passwordHash = await bcrypt.hash("password123", 10);

  // Clean up in dependency-safe order
  await prisma.approvalRequest.deleteMany();
  await prisma.activityLog.deleteMany();

  await prisma.maintenanceSchedule.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.inventoryLocation.deleteMany();
  await prisma.inventoryCategory.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.assetTransfer.deleteMany();
  await prisma.assetAssignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.location.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Companies
  const companyA = await prisma.company.create({
    data: {
      name: "ABPL",
      code: "ABPl",
      logoUrl:
        "https://ui-avatars.com/api/?name=Acme+Corp&background=0D8ABC&color=fff",
    },
  });

  const companyB = await prisma.company.create({
    data: {
      name: "IBA",
      code: "IBA",
      logoUrl:
        "https://ui-avatars.com/api/?name=Globex+Inc&background=F39C12&color=fff",
    },
  });

  // Company Settings
  await prisma.companySettings.create({
    data: {
      companyId: companyA.id,
      assetCodePrefix: "ABPL",
      currency: "INR",
      dateFormat: "DD-MM-YYYY",
      maintenanceReminderDays: 7,
      requireTransferApproval: true,
      requireMaintenanceApproval: false,
      autoGenerateAssetCode: true,
    },
  });

  await prisma.companySettings.create({
    data: {
      companyId: companyB.id,
      assetCodePrefix: "IBA",
      currency: "INR",
      dateFormat: "DD-MM-YYYY",
      maintenanceReminderDays: 10,
      requireTransferApproval: true,
      requireMaintenanceApproval: true,
      autoGenerateAssetCode: true,
    },
  });

  // Users
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@system.local",
      name: "System Super Admin",
      passwordHash,
      activeCompanyId: companyA.id,
      status: "ACTIVE",
      isSuperAdmin: true,
      companyRoles: {
        create: [
          { companyId: companyA.id, role: Role.SUPER_ADMIN },
          { companyId: companyB.id, role: Role.SUPER_ADMIN },
        ],
      },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: companyA.id,
      userId: superAdmin.id,
      employeeCode: "SYS-001",
      fullName: "System Super Admin",
      joiningDate: new Date(),
    }
  });

  const adminA = await prisma.user.create({
    data: {
      email: "admin@acmecorp.local",
      name: "ABPL Admin",
      passwordHash,
      activeCompanyId: companyA.id,
      status: "ACTIVE",
      companyRoles: {
        create: [{ companyId: companyA.id, role: Role.ADMIN }],
      },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: companyA.id,
      userId: adminA.id,
      employeeCode: "ACME-ADM-001",
      fullName: "ABPL Admin",
      joiningDate: new Date(),
    }
  });

  const assetManagerA = await prisma.user.create({
    data: {
      email: "assets@acmecorp.local",
      name: " Asset Manager",
      passwordHash,
      activeCompanyId: companyA.id,
      status: "ACTIVE",
      companyRoles: {
        create: [{ companyId: companyA.id, role: Role.ADMIN }],
      },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: companyA.id,
      userId: assetManagerA.id,
      employeeCode: "ABPL-AST-001",
      fullName: " Asset Manager",
      joiningDate: new Date(),
    }
  });

  const employeeA = await prisma.user.create({
    data: {
      email: "john.doe@acmecorp.local",
      name: "John Doe",
      passwordHash,
      activeCompanyId: companyA.id,
      status: "ACTIVE",
      companyRoles: {
        create: [{ companyId: companyA.id, role: Role.USER }],
      },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: companyA.id,
      userId: employeeA.id,
      employeeCode: "ABPL-EMP-001",
      fullName: "John Doe",
      joiningDate: new Date(),
    }
  });

  const employeeB = await prisma.user.create({
    data: {
      email: "jane.smith@acmecorp.local",
      name: "Jane Smith",
      passwordHash,
      activeCompanyId: companyA.id,
      status: "ACTIVE",
      companyRoles: {
        create: [{ companyId: companyA.id, role: Role.USER }],
      },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: companyA.id,
      userId: employeeB.id,
      employeeCode: "ABPL-EMP-002",
      fullName: "Jane Smith",
      joiningDate: new Date(),
    }
  });

  const adminB = await prisma.user.create({
    data: {
      email: "admin@globex.local",
      name: "ABPL Admin",
      passwordHash,
      activeCompanyId: companyB.id,
      status: "ACTIVE",
      companyRoles: {
        create: [{ companyId: companyB.id, role: Role.ADMIN }],
      },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: companyB.id,
      userId: adminB.id,
      employeeCode: "ABPL-ADM-001",
      fullName: "Globex Admin",
      joiningDate: new Date(),
    }
  });

  // Company A master data
  const deptIT_A = await prisma.department.create({
    data: { 
      name: "IT Department", 
      companyId: companyA.id,
      code: "IT",
      description: "Information Technology and Infrastructure",
      isActive: true,
    },
  });

  const deptHR_A = await prisma.department.create({
    data: { 
      name: "Human Resources", 
      companyId: companyA.id,
      code: "HR",
      description: "Recruitment and Employee Management",
      isActive: true,
    },
  });

  // Hierarchical Locations Company A
  const locHQ_A = await prisma.location.create({
    data: { 
      name: "Headquarters", 
      companyId: companyA.id,
      code: "ACME-HQ",
      description: "Main Corporate HQ",
    },
  });

  const locFloor1_A = await prisma.location.create({
    data: { 
      name: "HQ - Floor 1", 
      companyId: companyA.id,
      code: "ACME-HQ-F1",
      parentLocationId: locHQ_A.id,
    },
  });

  const locFloor2_A = await prisma.location.create({
    data: { 
      name: "HQ - Floor 2", 
      companyId: companyA.id,
      code: "ACME-HQ-F2",
      parentLocationId: locHQ_A.id,
    },
  });

  const locServerRoom_A = await prisma.location.create({
    data: { 
      name: "HQ - Server Room", 
      companyId: companyA.id,
      code: "ACME-HQ-SR",
      parentLocationId: locFloor1_A.id,
      description: "Central Data Center",
    },
  });

  const locBranch_A = await prisma.location.create({
    data: { 
      name: "Branch Office", 
      companyId: companyA.id,
      code: "ACME-BR1",
    },
  });

  const vendorApple_A = await prisma.vendor.create({
    data: {
      companyId: companyA.id,
      name: "Apple Authorized Partner",
      contactName: "Vendor Rep",
      email: "sales@applepartner.local",
      phone: "+91-9000000001",
      service: "Laptops and accessories",
      isActive: true,
    },
  });

  const vendorDell_A = await prisma.vendor.create({
    data: {
      companyId: companyA.id,
      name: "Dell Enterprise Supplier",
      contactName: "Dell Rep",
      email: "sales@dellsupplier.local",
      phone: "+91-9000000002",
      service: "Computing assets",
      isActive: true,
    },
  });

  const catLaptop_A = await prisma.assetCategory.create({
    data: { 
      name: "Laptops", 
      companyId: companyA.id,
      code: "HW-LAP",
      description: "Portable computing devices",
      isActive: true,
    },
  });

  const catMonitor_A = await prisma.assetCategory.create({
    data: { 
      name: "Monitors", 
      companyId: companyA.id,
      code: "HW-MON",
      description: "Display units",
      isActive: true,
    },
  });

  const catMobile_A = await prisma.assetCategory.create({
    data: { 
      name: "Mobiles", 
      companyId: companyA.id,
      code: "HW-MOB",
      isActive: true,
    },
  });

  // Create new inventory location
  const invLocHQ_A = await prisma.inventoryLocation.create({
    data: {
      companyId: companyA.id,
      name: "HQ Storage",
      code: "HQ-MAIN",
    },
  });

  const catParts_A = await prisma.inventoryCategory.create({
    data: { companyId: companyA.id, name: "Parts" },
  });

  const unitPcs_A = await prisma.unitOfMeasure.create({
    data: { companyId: companyA.id, name: "Pieces", symbol: "pcs" },
  });

  // Create an InventoryItem
  const invItem1 = await prisma.inventoryItem.create({
    data: {
      companyId: companyA.id,
      sku: "PRT-001",
      name: "Spare Keyboard",
      categoryId: catParts_A.id,
      unitId: unitPcs_A.id,
      defaultLocationId: invLocHQ_A.id,
      minStockLevel: 5,
      reorderLevel: 10,
    },
  });

  // Create initial stock balance and transaction
  await prisma.inventoryTransaction.create({
    data: {
      companyId: companyA.id,
      itemId: invItem1.id,
      locationId: invLocHQ_A.id,
      movementType: "OPENING_STOCK",
      direction: "IN",
      quantity: 50,
      balanceAfter: 50,
      notes: "Seed opening stock",
    },
  });

  await prisma.inventoryBalance.create({
    data: {
      companyId: companyA.id,
      itemId: invItem1.id,
      locationId: invLocHQ_A.id,
      quantityOnHand: 50,
      availableQty: 50,
    },
  });

  // Assets
  const asset1 = await prisma.asset.create({
    data: {
      companyId: companyA.id,
      categoryId: catLaptop_A.id,
      departmentId: deptIT_A.id,
      locationId: locHQ_A.id,
      vendorId: vendorApple_A.id,
      name: "MacBook Pro M3 - John",
      assetCode: "AST-ACME-001",
      assetTag: "ACME-LAP-001",
      serialNumber: "C02M3JOHN001",
      brand: "Apple",
      model: "MacBook Pro M3 14-inch",
      status: AssetStatus.ASSIGNED,
      condition: "Good",
      specifications: "18GB RAM, 512GB SSD",
      accessoriesIncluded: ["Charger", "Laptop Bag", "USB-C Hub"],
      estimatedReplacementValue: 185000,
      attachmentUrl: "https://example.com/assets/acme-lap-001.jpg",
      purchaseDate: new Date("2025-01-10"),
      cost: 179900,
      usefulLife: 36,
      residualValue: 25000,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      companyId: companyA.id,
      categoryId: catLaptop_A.id,
      departmentId: deptIT_A.id,
      locationId: locHQ_A.id,
      vendorId: vendorDell_A.id,
      name: "Dell Latitude 5440",
      assetCode: "AST-ACME-002",
      assetTag: "ACME-LAP-002",
      serialNumber: "DLL-LAT-5440-002",
      brand: "Dell",
      model: "Latitude 5440",
      status: AssetStatus.ACTIVE,
      condition: "New",
      specifications: "16GB RAM, 512GB SSD, Intel i7",
      accessoriesIncluded: ["Charger"],
      estimatedReplacementValue: 92000,
      purchaseDate: new Date("2025-02-15"),
      cost: 87500,
      usefulLife: 36,
      residualValue: 12000,
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      companyId: companyA.id,
      categoryId: catMonitor_A.id,
      departmentId: deptHR_A.id,
      locationId: locBranch_A.id,
      name: "LG 27-inch Monitor",
      assetCode: "AST-ACME-003",
      assetTag: "ACME-MON-001",
      serialNumber: "LG-MON-27001",
      brand: "LG",
      model: "27UL500",
      status: AssetStatus.ASSIGNED,
      condition: "Excellent",
      specifications: "27 inch, 4K UHD",
      accessoriesIncluded: ["Power Cable", "HDMI Cable"],
      estimatedReplacementValue: 22000,
      purchaseDate: new Date("2025-03-01"),
      cost: 19999,
      usefulLife: 48,
      residualValue: 3000,
    },
  });

  const asset4 = await prisma.asset.create({
    data: {
      companyId: companyA.id,
      categoryId: catMobile_A.id,
      departmentId: deptIT_A.id,
      locationId: locHQ_A.id,
      name: "iPhone 15",
      assetCode: "AST-ACME-004",
      assetTag: "ACME-MOB-001",
      serialNumber: "IPH15-0001",
      brand: "Apple",
      model: "iPhone 15 128GB",
      status: AssetStatus.REPAIR,
      condition: "Screen issue",
      specifications: "128GB, Black",
      accessoriesIncluded: ["Charging Cable"],
      estimatedReplacementValue: 70000,
      purchaseDate: new Date("2025-04-05"),
      cost: 68999,
      usefulLife: 24,
      residualValue: 8000,
    },
  });

  // Assignments / handovers
  await prisma.assetAssignment.create({
    data: {
      companyId: companyA.id,
      assetId: asset1.id,
      userId: employeeA.id,
      assignedById: adminA.id,
      managerUserId: assetManagerA.id,
      transactionId: "TXN-ACME-0001",
      assignedAt: new Date("2025-01-12"),
      handoverDate: new Date("2025-01-12"),
      handoverType: HandoverType.NEW_HIRE,
      physicalCondition: PhysicalCondition.BRAND_NEW,
      functionalStatus: FunctionalStatus.WORKING,
      condition: "Excellent",
      notes: "Issued with charger and bag",
      attachmentUrl: "https://example.com/handover/acme-0001.pdf",
      employeeSignatureName: "John Doe",
      issuingOfficerName: "Acme Admin",
      termsAccepted: true,
      maintenanceLogs: "No maintenance yet",
    },
  });

  await prisma.assetAssignment.create({
    data: {
      companyId: companyA.id,
      assetId: asset3.id,
      userId: employeeB.id,
      assignedById: adminA.id,
      managerUserId: assetManagerA.id,
      transactionId: "TXN-ACME-0002",
      assignedAt: new Date("2025-03-02"),
      handoverDate: new Date("2025-03-02"),
      handoverType: HandoverType.REPLACEMENT,
      physicalCondition: PhysicalCondition.USED_EXCELLENT,
      functionalStatus: FunctionalStatus.WORKING,
      condition: "Very good",
      notes: "Monitor issued as desk upgrade",
      employeeSignatureName: "Jane Smith",
      issuingOfficerName: "Acme Admin",
      termsAccepted: true,
    },
  });

  // Asset transfer
  await prisma.assetTransfer.create({
    data: {
      companyId: companyA.id,
      assetId: asset2.id,
      transferType: "LOCATION_TO_LOCATION",
      fromLocationId: locHQ_A.id,
      toLocationId: locBranch_A.id,
      status: "REQUESTED",
      requestedById: assetManagerA.id,
    },
  });

  // Maintenance ticket
  const ticket1 = await prisma.maintenanceTicket.create({
    data: {
      companyId: companyA.id,
      assetId: asset4.id,
      title: "Display flickering issue",
      description: "Screen flickers intermittently after 10 minutes of use.",
      createdById: employeeA.id,
      assignedToId: assetManagerA.id,
      vendorId: vendorDell_A.id,
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      type: MaintenanceType.CORRECTIVE,
      scheduledDate: new Date("2025-04-06"),
      startedAt: new Date("2025-04-06T10:00:00Z"),
      estimatedCost: 5000,
      downtimeHours: 3,
    },
  });

  // Preventive Maintenance Schedule
  await prisma.maintenanceSchedule.create({
    data: {
      companyId: companyA.id,
      assetId: asset1.id,
      title: "Quarterly Laptop Service",
      description: "Dusting, software updates, and battery health check.",
      frequencyDays: 90,
      lastMaintenanceDate: new Date("2025-01-12"),
      nextDueDate: new Date("2025-04-12"),
      isActive: true,
    },
  });

  // Activity logs
  await prisma.activityLog.createMany({
    data: [
      {
        companyId: companyA.id,
        userId: adminA.id,
        action: "CREATE_ASSET",
        entity: "Asset",
        entityId: asset1.id,
        details: "Created MacBook Pro M3 asset and assigned to John Doe",
      },
      {
        companyId: companyA.id,
        userId: adminA.id,
        action: "ASSIGN_ASSET",
        entity: "AssetAssignment",
        entityId: "TXN-ACME-0001",
        details: "Assigned ACME-LAP-001 to John Doe",
      },
      {
        companyId: companyA.id,
        userId: adminA.id,
        action: "CREATE_TICKET",
        entity: "MaintenanceTicket",
        entityId: ticket1.id,
        details: "Opened maintenance ticket for iPhone 15 screen issue",
      },
    ],
  });

  // Company B setup
  const deptOps_B = await prisma.department.create({
    data: { 
      name: "Operations", 
      companyId: companyB.id,
      isActive: true,
    },
  });

  const locMain_B = await prisma.location.create({
    data: { 
      name: "Main Office", 
      companyId: companyB.id,
      code: "GBX-HQ",
    },
  });

  const locWarehouse_B = await prisma.location.create({
    data: {
      name: "Main Office - Warehouse",
      companyId: companyB.id,
      code: "GBX-WH1",
      parentLocationId: locMain_B.id,
    }
  });

  const catLaptop_B = await prisma.assetCategory.create({
    data: { 
      name: "Laptops", 
      companyId: companyB.id,
      isActive: true,
    },
  });

  await prisma.asset.create({
    data: {
      companyId: companyB.id,
      categoryId: catLaptop_B.id,
      departmentId: deptOps_B.id,
      locationId: locWarehouse_B.id,
      name: "HP EliteBook",
      assetCode: "AST-GBX-001",
      assetTag: "GBX-LAP-001",
      serialNumber: "HP-ELITE-001",
      brand: "HP",
      model: "EliteBook 840",
      status: AssetStatus.ACTIVE,
      condition: "New",
      specifications: "16GB RAM, 512GB SSD",
      accessoriesIncluded: ["Charger"],
      estimatedReplacementValue: 78000,
      purchaseDate: new Date("2025-02-01"),
      cost: 74999,
      usefulLife: 36,
      residualValue: 10000,
    },
  });

  console.log("✅ Seed completed successfully.");
  console.log("Login credentials:");
  console.log("superadmin@system.local / password123");
  console.log("admin@acmecorp.local / password123");
  console.log("john.doe@acmecorp.local / password123");
  console.log("admin@globex.local / password123");

  console.log("Created users:", {
    superAdmin: superAdmin.email,
    adminA: adminA.email,
    assetManagerA: assetManagerA.email,
    employeeA: employeeA.email,
    employeeB: employeeB.email,
    adminB: adminB.email,
  });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });