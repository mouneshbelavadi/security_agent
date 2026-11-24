import { db } from "../src/lib/db";
import { hashPassword, verifyPassword, hashOtp, verifyOtp, generateOtp, getExpiryDate } from "../src/lib/crypto";

async function runTest() {
  console.log("==========================================");
  console.log("Running End-to-End Guard Experience Verification");
  console.log("==========================================");

  // 1. Check Guard User
  const guard = await db.user.findUnique({ where: { username: "guard1" } });
  if (!guard) throw new Error("Guard1 not found");
  console.log("✔ Guard account verified:", guard.name, `(${guard.username})`);

  // 2. Check Host Employee
  const host = await db.employee.findFirst({ where: { isActive: true } });
  if (!host) throw new Error("No active host employee found");
  console.log("✔ Host employee verified:", host.name, `(${host.department}) <${host.email}>`);

  // 3. Simulate Intake Creation
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const approvalExpiresAt = getExpiryDate(10);
  const otpExpiresAt = getExpiryDate(5);

  const visit = await db.visitRequest.create({
    data: {
      visitorName: "Sunil Gowda",
      visitorEmail: "sunil.gowda@example.com",
      visitorPhone: "9876543210",
      idType: "AADHAAR",
      purpose: "Vendor equipment delivery",
      hostId: host.id,
      idPhotoPath: "/api/uploads/demo-id.jpg",
      status: "WAITING_HOST",
      expiresAt: approvalExpiresAt,
      createdByUserId: guard.id,
    },
  });
  console.log("✔ Step 1-3 New Visitor Check-In created in DB. Request ID:", visit.id);
  console.log("  Initial Status:", visit.status);

  // 4. Simulate Host Approval & OTP generation
  await db.visitRequest.update({
    where: { id: visit.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      otpHash,
      otpExpiresAt,
    },
  });
  console.log("✔ Host approved request. 6-digit OTP generated:", otp);

  // 5. Test Incorrect OTP Attempt
  const wrongMatch = verifyOtp("000000", otpHash);
  if (wrongMatch) throw new Error("Wrong OTP incorrectly matched!");
  console.log("✔ Incorrect OTP correctly rejected (verifyOtp returns false).");

  // 6. Test Correct OTP Verification
  const correctMatch = verifyOtp(otp, otpHash);
  if (!correctMatch) throw new Error("Correct OTP failed verification!");
  console.log("✔ Correct OTP successfully verified (verifyOtp returns true).");

  // 7. Update status to ENTERED
  const entered = await db.visitRequest.update({
    where: { id: visit.id },
    data: {
      status: "ENTERED",
      enteredAt: new Date(),
    },
  });
  console.log("✔ Status transitioned to ENTERED. Entry timestamp recorded:", entered.enteredAt?.toISOString());

  // 8. Test Visitor Exit
  const exited = await db.visitRequest.update({
    where: { id: visit.id },
    data: {
      status: "EXITED",
      exitedAt: new Date(),
    },
  });
  console.log("✔ Visitor Left (Exit) successfully recorded. Exited timestamp:", exited.exitedAt?.toISOString());

  // 9. Clean up test record
  await db.visitRequest.delete({ where: { id: visit.id } });
  console.log("✔ Test record cleaned up.");

  console.log("==========================================");
  console.log("ALL GUARD FLOW LOGIC VERIFIED SUCCESSFULLY!");
  console.log("==========================================");
}

runTest()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
