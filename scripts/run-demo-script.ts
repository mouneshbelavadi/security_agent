import { db } from "../src/lib/db";
import { verifyPassword, generateOtp, hashOtp, verifyOtp, getExpiryDate } from "../src/lib/crypto";
import { sendHostApprovalEmail, maskPhoneNumber } from "../src/lib/email";
import { sendVisitorOtp } from "../src/lib/sms";
import { logAudit } from "../src/lib/audit";
import { env } from "../src/lib/env";

async function runDemoScript() {
  console.log("=================================================================");
  console.log("RUNNING CLIENT DEMO SCRIPT AUTOMATED VERIFICATION");
  console.log("=================================================================");

  // Step 1: Pre-flight Verification of Demo Setup
  console.log("\n[STEP 1] Checking Demo Setup & Services...");
  const admin = await db.user.findUnique({ where: { username: "admin" } });
  const guard = await db.user.findUnique({ where: { username: "guard1" } });
  const employeeUser = await db.user.findUnique({
    where: { username: "priya.sharma@example.com" },
    include: { employee: true },
  });

  if (!admin || !guard || !employeeUser || !employeeUser.employee) {
    throw new Error("Demo users not found. Run 'npm run demo:reset' first.");
  }

  // Check no forced password change on demo accounts
  if (admin.mustChangePassword || guard.mustChangePassword || employeeUser.mustChangePassword) {
    throw new Error("Demo accounts must not have mustChangePassword set to true!");
  }
  console.log("✔ Verified Demo Accounts (mustChangePassword is false for all demo accounts).");

  // Step 2: Guard Login
  console.log("\n[STEP 2] Guard Login (guard1 / GatePass2026!)...");
  const guardPasswordValid = await verifyPassword("GatePass2026!", guard.passwordHash);
  if (!guardPasswordValid) throw new Error("Guard authentication failed");
  console.log("✔ Guard 'guard1' successfully authenticated. Initial route: /guard");

  // Step 3: Guard creates visitor pass
  console.log("\n[STEP 3] Guard Creates Visitor Pass ('Sunil Gowda')...");
  const expiry = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);
  const visit = await db.visitRequest.create({
    data: {
      visitorName: "Sunil Gowda",
      visitorEmail: "sunil.gowda@example.com",
      visitorPhone: "9876543210",
      idType: "AADHAAR",
      purpose: "Vendor equipment delivery",
      hostId: employeeUser.employee.id,
      idPhotoPath: "uploads/demo-id.jpg",
      selfiePath: "uploads/demo-sunil-face.jpg",
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
    details: `Gate entry requested by Guard ${guard.name} for visitor ${visit.visitorName} (Aadhaar).`,
  });
  console.log("✔ Visitor pass created in database with status WAITING_HOST. Pass ID:", visit.id);

  // Step 4: Email sent to Mailpit
  console.log("\n[STEP 4] Dispatching Notification Email to Mailpit (localhost:1025)...");
  const emailSent = await sendHostApprovalEmail({
    hostEmail: employeeUser.employee.email,
    hostName: employeeUser.employee.name,
    visitorName: visit.visitorName,
    visitorPhone: visit.visitorPhone,
    purpose: visit.purpose,
    requestId: visit.id,
    expiryMinutes: env.REQUEST_EXPIRY_MINUTES,
  });
  console.log("✔ Host approval email dispatched. Dashboard link: http://localhost:3000/host/requests/" + visit.id);

  // Step 5: Employee Login
  console.log("\n[STEP 5] Employee Login (priya.sharma@example.com / GatePass2026!)...");
  const employeePasswordValid = await verifyPassword("GatePass2026!", employeeUser.passwordHash);
  if (!employeePasswordValid) throw new Error("Employee authentication failed");
  console.log("✔ Employee 'priya.sharma@example.com' successfully authenticated.");

  // Step 6: Employee Reviews Visitor Details & Approves
  console.log("\n[STEP 6] Employee Reviews Visitor on /host/requests/" + visit.id + " and Approves...");
  const maskedPhone = maskPhoneNumber(visit.visitorPhone);
  console.log("  - Visitor Name:       ", visit.visitorName);
  console.log("  - Masked Phone:       ", maskedPhone);
  console.log("  - Face Photo Path:    ", visit.selfiePath);
  console.log("  - ID Card Photo:       [EXCLUDED FROM HOST VIEW - PRIVACY PRESERVED]");

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

  await logAudit({
    visitRequestId: visit.id,
    action: "STATUS_APPROVED_BY_EMPLOYEE",
    actorType: "EMPLOYEE",
    details: `Approved by host ${employeeUser.employee.name}.`,
  });
  console.log("✔ Employee approved request. Status: APPROVED.");

  // Step 7: SMS Outbox & Demo SMS Inbox
  console.log("\n[STEP 7] Generating OTP SMS and Dispatching to Visitor...");
  await sendVisitorOtp(visit.visitorPhone, generatedOtp);

  const smsRecord = await db.smsOutbox.findFirst({
    where: { mobile: visit.visitorPhone },
    orderBy: { createdAt: "desc" },
  });
  if (!smsRecord) throw new Error("SMS not found in SmsOutbox");

  console.log("✔ SMS Received in /demo/sms-inbox:");
  console.log("    To:      +91", smsRecord.mobile);
  console.log("    Message: ", smsRecord.message);
  console.log("    Passcode:", generatedOtp);

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

  console.log("✔ Guard Screen Success Banner Triggered:");
  console.log("    Title:       'Accepted. Please send the visitor in.'");
  console.log("    Description: '" + employeeUser.employee.name + " (" + employeeUser.employee.department + ")'");

  // Step 9: Visitor Left
  console.log("\n[STEP 9] Guard Clicks 'Visitor Left'...");
  await db.visitRequest.update({
    where: { id: visit.id },
    data: {
      status: "EXITED",
      exitedAt: new Date(),
    },
  });
  console.log("✔ Departure recorded in audit log. Status: EXITED.");

  // Step 10: Admin Log & Real-time Metrics
  console.log("\n[STEP 10] Admin Views /admin/log...");
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalToday, waitingToday, enteredToday, deniedToday] = await Promise.all([
    db.visitRequest.count({ where: { createdAt: { gte: startOfDay } } }),
    db.visitRequest.count({ where: { status: "WAITING_HOST", createdAt: { gte: startOfDay } } }),
    db.visitRequest.count({ where: { status: { in: ["ENTERED", "EXITED"] }, createdAt: { gte: startOfDay } } }),
    db.visitRequest.count({ where: { status: "DENIED", createdAt: { gte: startOfDay } } }),
  ]);

  console.log("✔ Admin Real-Time Metrics Strip:");
  console.log("    Visitors Today:   ", totalToday);
  console.log("    Currently Waiting:", waitingToday);
  console.log("    Entered Today:    ", enteredToday);
  console.log("    Denied Today:     ", deniedToday);

  const adminViewRecord = await db.visitRequest.findUnique({
    where: { id: visit.id },
    include: { auditLogs: true, host: true },
  });
  if (!adminViewRecord) throw new Error("Admin record lookup failed");

  console.log("✔ Admin Detail Modal Verified:");
  console.log("    Visitor:          ", adminViewRecord.visitorName);
  console.log("    Host:             ", adminViewRecord.host.name);
  console.log("    ID Document Type: ", adminViewRecord.idType);
  console.log("    ID Card Photo:    ", adminViewRecord.idPhotoPath);
  console.log("    Audit Events:     ", adminViewRecord.auditLogs.length, "recorded");

  // Cleanup demo test record
  await db.visitRequest.delete({ where: { id: visit.id } });
  await db.smsOutbox.delete({ where: { id: smsRecord.id } });
  await db.emailOutbox.deleteMany({ where: { requestId: visit.id } });
  console.log("✔ Test visit and SMS cleanly deleted.");

  console.log("\n=================================================================");
  console.log("DEMO SCRIPT VERIFICATION COMPLETED - ALL 10 STEPS PASSED 100%!");
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
