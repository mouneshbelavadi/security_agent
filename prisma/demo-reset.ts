import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const DEFAULT_DEMO_PASSWORD = "GatePass2026!";

const DEMO_EMPLOYEES = [
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
  console.log("RESETTING DEMO ENVIRONMENT FOR VISITOR VERIFICATION");
  console.log("=================================================================");

  // 1. Clear all visitor records, email outbox, uploaded files, and audit logs
  console.log("[1/4] Clearing visitor records, email outbox, uploaded files, and audit logs...");
  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  const deletedVisits = await prisma.visitRequest.deleteMany({});
  const deletedVisitors = await prisma.visitor.deleteMany({});
  const deletedEmails = await prisma.emailOutbox.deleteMany({});
  const deletedUploads = await prisma.uploadedFile.deleteMany({});
  console.log(`✔ Cleared ${deletedVisits.count} visit requests, ${deletedVisitors.count} visitor profiles, ${deletedEmails.count} emails, ${deletedUploads.count} uploaded files, and ${deletedAuditLogs.count} audit logs.`);

  // 2. Clean temporary visitor uploads
  console.log("[2/4] Cleaning visitor uploads directory...");
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
  try {
    const files = await fs.readdir(uploadDir);
    let deletedFiles = 0;
    for (const file of files) {
      if (file !== ".gitkeep" && !file.startsWith("demo-")) {
        try {
          await fs.unlink(path.join(uploadDir, file));
          deletedFiles++;
        } catch { }
      }
    }
    console.log(`✔ Cleaned ${deletedFiles} visitor photo files.`);
  } catch {
    console.log("✔ Uploads directory verified.");
  }

  // 3. Re-seed Admin & Guard accounts
  console.log("[3/4] Re-seeding administrative and security guard accounts...");
  const passwordHash = await bcrypt.hash(DEFAULT_DEMO_PASSWORD, 10);

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

  // 4. Re-seed 4 Demo Employees with login accounts across HR, Finance, IT, Operations
  console.log("[4/4] Re-seeding 4 demo employees and login accounts...");
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

  console.log("\n=================================================================");
  console.log("DEMO RESET COMPLETE - ENVIRONMENT IS READY FOR CLIENT DEMO");
  console.log("=================================================================");
  console.log("ALL ACCOUNTS SHARE DEFAULT DEMO PASSWORD: " + DEFAULT_DEMO_PASSWORD);
  console.log("-----------------------------------------------------------------");
  console.log("  ROLE      | USERNAME (SIGN-IN)          | NAME / DEPARTMENT");
  console.log("  ----------+-----------------------------+-----------------------------");
  console.log("  ADMIN     | admin                       | System Administrator");
  console.log("  GUARD     | guard1                      | Gate Guard Alpha");
  console.log("  GUARD     | guard2                      | Gate Guard Bravo");
  console.log("  EMPLOYEE  | priya.sharma@example.com    | Priya Sharma (Human Resources)");
  console.log("  EMPLOYEE  | anita.desai@example.com     | Anita Desai (Finance)");
  console.log("  EMPLOYEE  | arun.kumar@example.com      | Arun Kumar (IT & Systems)");
  console.log("  EMPLOYEE  | sunita.rao@example.com      | Sunita Rao (Operations & Facilities)");
  console.log("-----------------------------------------------------------------");
  console.log("SERVICES:");
  console.log("  Web Application:   http://localhost:3000");
  console.log("  Email Outbox Log:  http://localhost:3000/demo/email-inbox");
  console.log("  Email Transport:   Gmail SMTP (configured via .env)");
  console.log("=================================================================\n");
}

main()
  .catch((e) => {
    console.error("Demo reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
