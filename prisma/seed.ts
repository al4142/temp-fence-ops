import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
  await prisma.jobLabor.deleteMany();
  await prisma.jobMaterial.deleteMany();
  await prisma.jobLodgingLine.deleteMany();
  await prisma.jobFreightLine.deleteMany();
  await prisma.jobMiscLine.deleteMany();
  await prisma.jobMaterialVariance.deleteMany();
  await prisma.transferLine.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.writeOff.deleteMany();
  await prisma.yardExpense.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.branch.deleteMany();

  const miami = await prisma.branch.create({
    data: { code: "MIA", name: "Miami Yard" },
  });
  const davie = await prisma.branch.create({
    data: { code: "DAV", name: "Davie Yard" },
  });

  const empCarlos = await prisma.employee.create({
    data: {
      name: "Carlos Rivera",
      nameKey: "carlos-rivera",
      hourlyRate: 22,
      position: "Lead Installer",
      branchId: miami.id,
    },
  });
  const empMaria = await prisma.employee.create({
    data: {
      name: "Maria Santos",
      nameKey: "maria-santos",
      hourlyRate: 20,
      position: "Installer",
      branchId: miami.id,
    },
  });
  const empJamal = await prisma.employee.create({
    data: {
      name: "Jamal Brooks",
      nameKey: "jamal-brooks",
      hourlyRate: 21,
      position: "Installer",
      branchId: davie.id,
    },
  });
  const empLisa = await prisma.employee.create({
    data: {
      name: "Lisa Nguyen",
      nameKey: "lisa-nguyen",
      hourlyRate: 24,
      position: "Crew Lead",
      branchId: davie.id,
    },
  });

  const miaPanel = await prisma.inventoryItem.create({
    data: {
      sku: "PANEL-6",
      name: "6ft Temp Fence Panel",
      description: "Standard 6ft temporary fence panel",
      unit: "ea",
      reusable: true,
      branchId: miami.id,
      startingQty: 400,
      unitCost: 45,
    },
  });
  const miaBase = await prisma.inventoryItem.create({
    data: {
      sku: "BASE-STD",
      name: "Fence Base",
      description: "Concrete/rubber base",
      unit: "ea",
      reusable: true,
      branchId: miami.id,
      startingQty: 420,
      unitCost: 18,
    },
  });
  const miaScreen = await prisma.inventoryItem.create({
    data: {
      sku: "SCREEN-BLK",
      name: "Black Screen",
      description: "Privacy screen roll",
      unit: "lf",
      reusable: true,
      branchId: miami.id,
      startingQty: 2000,
      unitCost: 1.25,
    },
  });
  const miaGate = await prisma.inventoryItem.create({
    data: {
      sku: "GATE-SWING",
      name: "Swing Gate",
      unit: "ea",
      reusable: true,
      branchId: miami.id,
      startingQty: 40,
      unitCost: 120,
    },
  });

  const davPanel = await prisma.inventoryItem.create({
    data: {
      sku: "PANEL-6",
      name: "6ft Temp Fence Panel",
      unit: "ea",
      reusable: true,
      branchId: davie.id,
      startingQty: 350,
      unitCost: 45,
    },
  });
  const davBase = await prisma.inventoryItem.create({
    data: {
      sku: "BASE-STD",
      name: "Fence Base",
      unit: "ea",
      reusable: true,
      branchId: davie.id,
      startingQty: 360,
      unitCost: 18,
    },
  });
  const davClamp = await prisma.inventoryItem.create({
    data: {
      sku: "CLAMP-SET",
      name: "Clamp Set",
      unit: "ea",
      reusable: true,
      branchId: davie.id,
      startingQty: 500,
      unitCost: 3.5,
    },
  });

  await prisma.job.create({
    data: {
      date: new Date("2026-03-05"),
      branchId: miami.id,
      class: "EVENT",
      orderNumber: "ORD-1001",
      customer: "Bayfront Arts LLC",
      address: "100 Biscayne Blvd",
      city: "Miami",
      jobType: "INST",
      fenceType: "6ft Panel",
      qtyLf: 480,
      screen: true,
      gates: 2,
      notes: "Install leave-on-site for weekend festival",
      accountExec: "A. Lopez",
      revenue: 4200,
      lodging: 0,
      freight: 150.0,
      freightLines: {
        create: [{ company: "Demo Freight Co", cost: 150.0, notes: "Seed" }],
      },
      misc: 75.0,
      miscLines: {
        create: [{ amount: 75.0, category: "Supplies", notes: "Seed" }],
      },
      materials: {
        create: [
          { inventoryItemId: miaPanel.id, quantity: 40, notes: "Perimeter" },
          { inventoryItemId: miaBase.id, quantity: 42 },
          { inventoryItemId: miaScreen.id, quantity: 480 },
          { inventoryItemId: miaGate.id, quantity: 2 },
        ],
      },
      labor: {
        create: [
          { employeeId: empCarlos.id, regularHours: 8, overtimeHours: 2 },
          { employeeId: empMaria.id, regularHours: 8, overtimeHours: 0 },
        ],
      },
    },
  });

  await prisma.job.create({
    data: {
      date: new Date("2026-03-10"),
      branchId: miami.id,
      class: "EVENT",
      orderNumber: "ORD-1001",
      customer: "Bayfront Arts LLC",
      address: "100 Biscayne Blvd",
      city: "Miami",
      jobType: "PU",
      fenceType: "6ft Panel",
      qtyLf: 480,
      screen: true,
      gates: 2,
      notes: "Pickup after event",
      accountExec: "A. Lopez",
      revenue: 800,
      lodging: 0,
      freight: 100.0,
      freightLines: {
        create: [{ company: "Demo Freight Co", cost: 100.0, notes: "Seed" }],
      },
      misc: 0,
      materials: {
        create: [
          { inventoryItemId: miaPanel.id, quantity: 40 },
          { inventoryItemId: miaBase.id, quantity: 42 },
          { inventoryItemId: miaScreen.id, quantity: 480 },
          { inventoryItemId: miaGate.id, quantity: 2 },
        ],
      },
      labor: {
        create: [
          { employeeId: empCarlos.id, regularHours: 6, overtimeHours: 0 },
          { employeeId: empMaria.id, regularHours: 6, overtimeHours: 0 },
        ],
      },
    },
  });

  await prisma.job.create({
    data: {
      date: new Date("2026-03-08"),
      branchId: davie.id,
      class: "CONSTRUCTION",
      orderNumber: "ORD-2044",
      customer: "Sunrise Builders Inc",
      address: "8800 Griffin Rd",
      city: "Davie",
      jobType: "INST",
      fenceType: "6ft Panel",
      qtyLf: 720,
      screen: false,
      gates: 1,
      notes: "Site perimeter - leave until Phase 2",
      accountExec: "J. Torres",
      revenue: 6500,
      lodging: 0,
      freight: 200.0,
      freightLines: {
        create: [{ company: "Demo Freight Co", cost: 200.0, notes: "Seed" }],
      },
      misc: 50.0,
      miscLines: {
        create: [{ amount: 50.0, category: "Supplies", notes: "Seed" }],
      },
      materials: {
        create: [
          { inventoryItemId: davPanel.id, quantity: 60 },
          { inventoryItemId: davBase.id, quantity: 62 },
          { inventoryItemId: davClamp.id, quantity: 120 },
          { itemName: "Caution Tape", quantity: 10, notes: "consumable free-text line" },
        ],
      },
      labor: {
        create: [
          { employeeId: empLisa.id, regularHours: 8, overtimeHours: 1 },
          { employeeId: empJamal.id, regularHours: 8, overtimeHours: 1 },
        ],
      },
    },
  });

  await prisma.job.create({
    data: {
      date: new Date("2026-03-12"),
      branchId: miami.id,
      class: "EVENT",
      orderNumber: "ORD-1105",
      customer: "South Beach Markets",
      address: "1500 Ocean Dr",
      city: "Miami Beach",
      jobType: "DELIVERY",
      fenceType: "6ft Panel",
      qtyLf: 120,
      screen: false,
      gates: 0,
      notes: "Drop panels; customer installs",
      accountExec: "A. Lopez",
      revenue: 900,
      lodging: 0,
      freight: 80.0,
      freightLines: {
        create: [{ company: "Demo Freight Co", cost: 80.0, notes: "Seed" }],
      },
      misc: 0,
      materials: {
        create: [
          { inventoryItemId: miaPanel.id, quantity: 10 },
          { inventoryItemId: miaBase.id, quantity: 12 },
        ],
      },
      labor: {
        create: [
          { employeeId: empMaria.id, regularHours: 3, overtimeHours: 0 },
        ],
      },
    },
  });

  await prisma.inventoryAdjustment.create({
    data: {
      inventoryItemId: miaPanel.id,
      branchId: miami.id,
      quantityDelta: -2,
      reason: "Damaged panels written off (demo)",
    },
  });

  const vendor = await prisma.vendor.create({
    data: { name: "Demo Safety Supply", notes: "PPE & consumables", active: true },
  });
  await prisma.yardExpense.create({
    data: {
      date: new Date("2026-03-01"),
      branchId: miami.id,
      category: "PPE",
      vendorId: vendor.id,
      amount: 120,
      purchasedBy: "Demo Admin",
      notes: "Gloves and glasses (seed)",
    },
  });

  const adminHash = await bcrypt.hash("DemoAdmin123!", 10);
  const officeHash = await bcrypt.hash("DemoOffice123!", 10);
  await prisma.user.create({
    data: {
      email: "admin@demo.local",
      name: "Demo Admin",
      passwordHash: adminHash,
      role: "admin",
    },
  });
  await prisma.user.create({
    data: {
      email: "office@demo.local",
      name: "Demo Office",
      passwordHash: officeHash,
      role: "office",
    },
  });

  console.log("Seeded branches, employees, inventory, jobs.");
  console.log("Sample orders: ORD-1001 (install+pickup), ORD-2044 (install), ORD-1105 (delivery).");
  console.log("Demo users (demo-only): admin@demo.local / DemoAdmin123! ; office@demo.local / DemoOffice123!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
