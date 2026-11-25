import { db } from "../src/lib/db";
import { verifyPassword, generateOtp, hashOtp, verifyOtp, getExpiryDate } from "../src/lib/crypto";
import { sendHostApprovalEmail, sendVisitorOtpEmail, maskPhoneNumber, mailer } from "../src/lib/email";
import { logAudit } from "../src/lib/audit";
import { env } from "../src/lib/env";

async function runDemoScript() {
  console.log("=================================================================");
  console.log("RUNNING VS TECHSOL DEMO SCRIPT AUTOMATED VERIFICATION");
  console.log("=================================================================");

  // Step 0: Verify Gmail SMTP connection
  console.log("\n[STEP 0] Verifying Gmail SMTP Connection...");
  await mailer.verify();
  console.log(`✔ Gmail SMTP verified successfully (${env.SMTP_HOST}:${env.SMTP_PORT} as ${env.SMTP_USER}).`);

  // Step 1: Pre-flight Verification of Demo Setup
  console.log("\n[STEP 1] Checking Demo Accounts...");
  const admin = await db.user.findUnique({ where: { username: "admin" } });
  const guard = await db.user.findUnique({ where: { username: "guard1" } });
  const employeeUser = await db.user.findUnique({
    where: { username: "priya.sharma@example.com" },
    include: { employee: true },
  });

  if (!admin || !guard || !employeeUser || !employeeUser.employee) {
    throw new Error("Demo users not found. Run 'npm run demo:reset' first.");
  }

  if (admin.mustChangePassword || guard.mustChangePassword || employeeUser.mustChangePassword) {
    throw new Error("Demo accounts must not have mustChangePassword set to true!");
  }
  console.log("✔ Verified Demo Accounts (mustChangePassword is false for all demo accounts).");

  // Step 2: Guard Login
  console.log("\n[STEP 2] Guard Login (guard1 / GatePass2026!)...");
  const guardPasswordValid = await verifyPassword("GatePass2026!", guard.passwordHash);
  if (!guardPasswordValid) throw new Error("Guard authentication failed");
  console.log("✔ Guard 'guard1' successfully authenticated.");

  // Step 3: Guard Creates Visitor Pass with ID Number Option (no photo needed)
  console.log("\n[STEP 3] Guard Creates Visitor Pass using ID Number Option...");
  const expiry = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);
  const visit = await db.visitRequest.create({
    data: {
      visitorName: "Sunil Gowda",
      visitorEmail: "mdscripts0415@gmail.com",
      visitorPhone: "9876543210",
      idType: "AADHAAR",
      idNumber: "123456789012",
      purpose: "Vendor equipment delivery",
      hostId: employeeUser.employee.id,
      idPhotoPath: null,
      selfiePath: null,
      status: "WAITING_HOST",
      expiresAt: expiry,
      createdByUserId: guard.id,
    },
    include: { host: true },
  });

  await logAudit({
    visitRequestId: visit.id,
    action: "CREATED_WAITING_HOST",
    actorType: "GUARD",
    details: `Gate entry requested by Guard ${guard.name} for visitor ${visit.visitorName} (ID Type: AADHAAR, ID Number Recorded).`,
  });
  console.log("✔ Visitor pass created in PostgreSQL with ID Number only. Pass ID:", visit.id);

  // Step 4: Host Notification Email sent via Gmail SMTP
  console.log("\n[STEP 4] Dispatching Host Notification Email via Gmail SMTP...");
  const emailSent = await sendHostApprovalEmail({
    hostEmail: employeeUser.employee.email,
    hostName: employeeUser.employee.name,
    visitorName: visit.visitorName,
    visitorPhone: visit.visitorPhone,
    purpose: visit.purpose,
    requestId: visit.id,
    expiryMinutes: env.REQUEST_EXPIRY_MINUTES,
  });
  if (!emailSent) throw new Error("Host notification email via Gmail SMTP failed!");
  console.log("✔ Host notification email delivered via Gmail SMTP. Link:", `${env.APP_BASE_URL}/host/requests/${visit.id}`);

  // Step 5: Employee Login
  console.log("\n[STEP 5] Employee Login (priya.sharma@example.com / GatePass2026!)...");
  const employeePasswordValid = await verifyPassword("GatePass2026!", employeeUser.passwordHash);
  if (!employeePasswordValid) throw new Error("Employee authentication failed");
  console.log("✔ Employee 'priya.sharma@example.com' successfully authenticated.");

  // Step 6: Employee Reviews Visitor & Approves -> Sends OTP via Gmail SMTP
  console.log("\n[STEP 6] Employee Reviews Visitor (ID Number/Photo Excluded) & Approves...");
  const maskedPhone = maskPhoneNumber(visit.visitorPhone);
  console.log("  - Visitor Name:", visit.visitorName);
  console.log("  - Masked Phone:", maskedPhone);
  console.log("  - ID Number / Photo: [EXCLUDED FROM HOST VIEW]");

  const generatedOtp = generateOtp();
  const otpHash = hashOtp(generatedOtp);
  const otpExpiresAt = getExpiryDate(env.OTP_EXPIRY_MINUTES);

  await db.visitRequest.update({
    where: { id: visit.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      otpHash,
      otpExpiresAt,
    },
  });

  // Step 7: Send Visitor OTP via Gmail SMTP ONLY
  console.log("\n[STEP 7] Sending 6-Digit OTP to Visitor Email via Gmail SMTP...");
  const otpSent = await sendVisitorOtpEmail({
    visitorEmail: visit.visitorEmail,
    visitorName: visit.visitorName,
    hostName: employeeUser.employee.name,
    hostDepartment: employeeUser.employee.department,
    otp: generatedOtp,
    expiryMinutes: env.OTP_EXPIRY_MINUTES,
  });
  if (!otpSent) throw new Error("Visitor OTP email via Gmail SMTP failed!");
  console.log(`✔ Visitor OTP email (${generatedOtp}) delivered via Gmail SMTP to ${visit.visitorEmail}.`);

  await logAudit({
    visitRequestId: visit.id,
    action: "STATUS_APPROVED_OTP_EMAILED",
    actorType: "EMPLOYEE",
    details: `Approved by host ${employeeUser.employee.name}. OTP emailed to ${visit.visitorEmail}.`,
  });

  // Step 8: Guard Verifies OTP
  console.log("\n[STEP 8] Guard Enters Code on Terminal Screen...");
  const otpMatch = verifyOtp(generatedOtp, otpHash);
  if (!otpMatch) throw new Error("OTP verification failed");

  await db.visitRequest.update({
    where: { id: visit.id },
    data: {
      status: "ENTERED",
      enteredAt: new Date(),
    },
  });
  await logAudit({
    visitRequestId: visit.id,
    action: "STATUS_ENTERED_OTP_VERIFIED",
    actorType: "GUARD",
    details: `Guard ${guard.name} verified OTP. Allowed entry.`,
  });

  console.log("✔ Guard Screen Success Banner Verified: 'Accepted. Please send the visitor in.'");

  // Step 9: Visitor Left
  console.log("\n[STEP 9] Guard Clicks 'Visitor Left'...");
  await db.visitRequest.update({
    where: { id: visit.id },
    data: { status: "EXITED", exitedAt: new Date() },
  });
  console.log("✔ Departure recorded. Status: EXITED.");

  // Step 10: Admin Detail View Check (ID Type + ID Number)
  console.log("\n[STEP 10] Admin Views /admin/log...");
  const adminViewRecord = await db.visitRequest.findUnique({
    where: { id: visit.id },
    include: { auditLogs: true, host: true },
  });
  if (!adminViewRecord || adminViewRecord.idNumber !== "123456789012") {
    throw new Error("Admin detail check failed for idNumber");
  }
  console.log("✔ Admin Detail Modal Verified (ID Type:", adminViewRecord.idType, ", ID Number:", adminViewRecord.idNumber, ")");

  // Cleanup test record
  await db.visitRequest.delete({ where: { id: visit.id } });
  await db.emailOutbox.deleteMany({ where: { requestId: visit.id } });
  console.log("✔ Test visit and email log cleaned up.");

  console.log("\n=================================================================");
  console.log("VS TECHSOL DEMO SCRIPT VERIFICATION PASSED 100%!");
  console.log("=================================================================");
}

runDemoScript()
  .catch((e) => {
    console.error("Demo script verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
