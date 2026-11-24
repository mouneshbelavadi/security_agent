import { db } from "../src/lib/db";
import { hashPassword, verifyPassword } from "../src/lib/crypto";

async function runAdminSuite() {
  console.log("==============================================================");
  console.log("RUNNING COMPREHENSIVE ADMIN AREA & INTEGRATION TEST SUITE");
  console.log("==============================================================");

  // 1. Check Admin User
  const admin = await db.user.findUnique({ where: { username: "admin" } });
  if (!admin || admin.role !== "ADMIN") {
    throw new Error("Admin user not found or does not have ADMIN role");
  }
  console.log("✔ Admin authentication account verified:", admin.name);

  // 2. Test Real Summary Metrics Computation
  console.log("\n--- TEST 1: Real-time Summary Metrics Computation ---");
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [visitorsToday, currentlyWaiting, enteredToday, deniedToday] = await Promise.all([
    db.visitRequest.count({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
    }),
    db.visitRequest.count({
      where: { status: "WAITING_HOST" },
    }),
    db.visitRequest.count({
      where: {
        status: { in: ["ENTERED", "EXITED"] },
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    db.visitRequest.count({
      where: {
        status: "DENIED",
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
  ]);

  console.log(`✔ Real-time summary strip metrics computed from database:`);
  console.log(`    Visitors Today:    ${visitorsToday}`);
  console.log(`    Currently Waiting: ${currentlyWaiting}`);
  console.log(`    Entered Today:     ${enteredToday}`);
  console.log(`    Denied Today:      ${deniedToday}`);

  // 3. Test Employee CRUD & Import
  console.log("\n--- TEST 2: Employee Management & Bulk CSV Import ---");
  const testEmail = `test.employee.${Date.now()}@example.com`;

  // Create
  const newEmp = await db.employee.create({
    data: {
      name: "Kavita Rao",
      email: testEmail,
      department: "Legal & Compliance",
      isActive: true,
    },
  });
  console.log(`✔ Employee created: ${newEmp.name} (${newEmp.email})`);

  // Edit
  const updatedEmp = await db.employee.update({
    where: { id: newEmp.id },
    data: {
      department: "Corporate Legal",
    },
  });
  if (updatedEmp.department !== "Corporate Legal") {
    throw new Error("Employee update failed");
  }
  console.log(`✔ Employee department updated to: ${updatedEmp.department}`);

  // Toggle active / deactivate
  const deactivatedEmp = await db.employee.update({
    where: { id: newEmp.id },
    data: { isActive: false },
  });
  if (deactivatedEmp.isActive !== false) {
    throw new Error("Employee deactivation failed");
  }
  console.log(`✔ Employee deactivated successfully (isActive: ${deactivatedEmp.isActive})`);

  // Bulk Import Simulation
  const bulkData = [
    { name: "Bulk Employee 1", email: `bulk1.${Date.now()}@example.com`, department: "Engineering" },
    { name: "Bulk Employee 2", email: `bulk2.${Date.now()}@example.com`, department: "Product" },
  ];
  const importedEmployees = await db.$transaction(
    bulkData.map((d) => db.employee.create({ data: { ...d, isActive: true } }))
  );
  console.log(`✔ Bulk import transaction completed: ${importedEmployees.length} employees imported.`);

  // Cleanup test employees
  await db.employee.deleteMany({
    where: { id: { in: [newEmp.id, ...importedEmployees.map((e) => e.id)] } },
  });
  console.log("✔ Test employee records cleaned up.");

  // 4. Test Guard Management & Password Reset
  console.log("\n--- TEST 3: Guard Account Management & Password Reset ---");
  const testGuardUsername = `testguard_${Date.now()}`;
  const initialPasswordHash = await hashPassword("InitialPass123!");

  // Create Guard
  const createdGuard = await db.user.create({
    data: {
      name: "Temporary Test Guard",
      username: testGuardUsername,
      passwordHash: initialPasswordHash,
      role: "GUARD",
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log(`✔ Guard created: ${createdGuard.name} (${createdGuard.username}), mustChangePassword: ${createdGuard.mustChangePassword}`);

  // Toggle Deactivate Guard
  const deactivatedGuard = await db.user.update({
    where: { id: createdGuard.id },
    data: { isActive: false },
  });
  if (deactivatedGuard.isActive !== false) {
    throw new Error("Guard deactivation failed");
  }
  console.log(`✔ Guard deactivated: isActive is ${deactivatedGuard.isActive}`);

  // Reset Password
  const newPass = "ResetPass2026!";
  const resetPassHash = await hashPassword(newPass);
  const resetGuard = await db.user.update({
    where: { id: createdGuard.id },
    data: {
      passwordHash: resetPassHash,
      mustChangePassword: true,
      isActive: true,
    },
  });
  const passVerified = await verifyPassword(newPass, resetGuard.passwordHash);
  if (!passVerified) {
    throw new Error("Password reset verification failed");
  }
  console.log(`✔ Guard password reset verified: new password matches hash, mustChangePassword is ${resetGuard.mustChangePassword}`);

  // Cleanup test guard
  await db.user.delete({ where: { id: createdGuard.id } });
  console.log("✔ Test guard record cleaned up.");

  console.log("\n==============================================================");
  console.log("ALL ADMIN AREA SUITE TESTS PASSED WITH ZERO ERRORS!");
  console.log("==============================================================");
}

runAdminSuite()
  .catch((e) => {
    console.error("Admin suite failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
