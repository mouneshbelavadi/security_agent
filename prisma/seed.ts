import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const DEFAULT_DEMO_PASSWORD = "GatePass2026!";

export const DEMO_EMPLOYEES = [
  {
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    department: "Human Resources",
    isActive: true,
  },
  {
    name: "Anita Desai",
    email: "anita.desai@example.com",
    department: "Finance",
    isActive: true,
  },
  {
    name: "Arun Kumar",
    email: "arun.kumar@example.com",
    department: "IT & Systems",
    isActive: true,
  },
  {
    name: "Sunita Rao",
    email: "sunita.rao@example.com",
    department: "Operations & Facilities",
    isActive: true,
  },
];

async function main() {
  console.log("=================================================================");
  console.log("SEEDING DEMO ENVIRONMENT FOR VISITOR VERIFICATION");
  console.log("=================================================================");

  const passwordHash = await bcrypt.hash(DEFAULT_DEMO_PASSWORD, 10);

  // 1. Seed System Users (1 Admin, 2 Guards) - Forced password change skipped for demo
  const systemUsers = [
    {
      name: "System Administrator",
      username: "admin",
      role: "ADMIN",
      passwordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Gate Guard Alpha",
      username: "guard1",
      role: "GUARD",
      passwordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Gate Guard Bravo",
      username: "guard2",
      role: "GUARD",
      passwordHash,
      isActive: true,
      mustChangePassword: false,
    },
  ];

  for (const user of systemUsers) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        name: user.name,
        role: user.role,
        passwordHash: user.passwordHash,
        mustChangePassword: false,
        isActive: true,
      },
      create: user,
    });
  }

  // 2. Seed 4 Demo Employees with login accounts across HR, Finance, IT, Operations
  for (const emp of DEMO_EMPLOYEES) {
    const empUser = await prisma.user.upsert({
      where: { username: emp.email.toLowerCase() },
      update: {
        name: emp.name,
        role: "EMPLOYEE",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
      },
      create: {
        name: emp.name,
        username: emp.email.toLowerCase(),
        role: "EMPLOYEE",
        passwordHash,
        mustChangePassword: false,
        isActive: true,
      },
    });

    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        name: emp.name,
        department: emp.department,
        userId: empUser.id,
        isActive: true,
      },
      create: {
        ...emp,
        userId: empUser.id,
      },
    });
  }

  console.log("=================================================================");
  console.log("DEMO ACCOUNTS READY (DEFAULT PASSWORD FOR ALL: " + DEFAULT_DEMO_PASSWORD + ")");
  console.log("=================================================================");
  console.log("  ROLE      | USERNAME (SIGN-IN)          | NAME / DEPARTMENT");
  console.log("  ----------+-----------------------------+-----------------------------");
  console.log("  ADMIN     | admin                       | System Administrator");
  console.log("  GUARD     | guard1                      | Gate Guard Alpha");
  console.log("  GUARD     | guard2                      | Gate Guard Bravo");
  console.log("  EMPLOYEE  | priya.sharma@example.com    | Priya Sharma (Human Resources)");
  console.log("  EMPLOYEE  | anita.desai@example.com     | Anita Desai (Finance)");
  console.log("  EMPLOYEE  | arun.kumar@example.com      | Arun Kumar (IT & Systems)");
  console.log("  EMPLOYEE  | sunita.rao@example.com      | Sunita Rao (Operations & Facilities)");
  console.log("=================================================================\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
