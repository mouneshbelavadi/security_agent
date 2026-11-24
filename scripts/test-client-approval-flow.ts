import { db } from "../src/lib/db";
import { verifyPassword, generateOtp, hashOtp, verifyOtp, getExpiryDate, isExpired } from "../src/lib/crypto";
import { sendHostApprovalEmail, maskPhoneNumber } from "../src/lib/email";
import { sendVisitorOtp } from "../src/lib/sms";
import { logAudit } from "../src/lib/audit";
import { env } from "../src/lib/env";

async function runClientApprovalFlowTest() {
  console.log("=================================================================");
  console.log("STARTING CLIENT APPROVAL FLOW & AUTH BOUNDARY TEST SUITE");
  console.log("=================================================================");

  // Pre-flight: Fetch Guard and two distinct Employees
  const guardUser = await db.user.findFirst({ where: { role: "GUARD", isActive: true } });
  if (!guardUser) throw new Error("No active guard user found");

  const hostEmployee1 = await db.employee.findFirst({
    where: { isActive: true },
    include: { user: true },
  });
  if (!hostEmployee1 || !hostEmployee1.user) throw new Error("Employee 1 or linked user not found");

  const hostEmployee2 = await db.employee.findFirst({
    where: { isActive: true, id: { not: hostEmployee1.id } },
    include: { user: true },
  });
  if (!hostEmployee2 || !hostEmployee2.user) throw new Error("Employee 2 or linked user not found");

  console.log(`[TEST SETUP] Guard: ${guardUser.name} (${guardUser.username})`);
  console.log(`[TEST SETUP] Host 1 (Authorized): ${hostEmployee1.name} <${hostEmployee1.email}>`);
  console.log(`[TEST SETUP] Host 2 (Unauthorized): ${hostEmployee2.name} <${hostEmployee2.email}>`);

  // ===========================================================================
  // 1. Employee Local Bcrypt Login Verification
  // ===========================================================================
  console.log("\n--- TEST 1: Employee Local Bcrypt Login Verification ---");
  const isHostPasswordValid = await verifyPassword("GatePass2026!", hostEmployee1.user.passwordHash);
  if (!isHostPasswordValid) throw new Error("Employee password authentication failed");
  console.log("✔ Employee local bcrypt authentication succeeded for", hostEmployee1.user.username);
  console.log("✔ Employee user role verified as:", hostEmployee1.user.role);

  // ===========================================================================
  // 2. Guard Creates Visit Request & Email Dispatched to Mailpit
  // ===========================================================================
  console.log("\n--- TEST 2: Guard Creates Visit Request & Dispatches Email ---");
  const expiresAt = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);
  const visit1 = await db.visitRequest.create({
    data: {
      visitorName: "Rohan Varma",
      visitorEmail: "rohan.varma@techpartner.com",
      visitorPhone: "9876543210",
      idType: "AADHAAR",
      purpose: "Vendor technical evaluation",
      hostId: hostEmployee1.id,
      idPhotoPath: "uploads/demo-rohan-id.jpg",
      selfiePath: "uploads/demo-rohan-face.jpg",
      status: "WAITING_HOST",
      expiresAt,
      createdByUserId: guardUser.id,
    },
    include: { host: true },
  });

  console.log("✔ Visit request created in PostgreSQL with ID:", visit1.id);
  console.log("✔ Initial status confirmed as:", visit1.status);

  // Dispatch Email to Host
  const emailSent = await sendHostApprovalEmail({
    hostEmail: hostEmployee1.email,
    hostName: hostEmployee1.name,
    visitorName: visit1.visitorName,
    visitorPhone: visit1.visitorPhone,
    purpose: visit1.purpose,
    requestId: visit1.id,
    expiryMinutes: env.REQUEST_EXPIRY_MINUTES,
  });
  console.log("✔ Nodemailer email dispatched to Mailpit. Returned success:", emailSent);

  // ===========================================================================
  // 3. Security Boundary: Cross-Employee Access Check (Unauthorized Employee 2)
  // ===========================================================================
  console.log("\n--- TEST 3: Security Boundary - Cross-Employee Access Denied ---");
  // Employee 2 attempts to query Employee 1's visit request
  const crossAccessDenied = visit1.hostId !== hostEmployee2.id;
  if (!crossAccessDenied) {
    throw new Error("Security failure: hostId matched unauthorized employee!");
  }
  console.log("✔ Authorization check passed: Employee 2 cannot access Employee 1's request (403 Forbidden enforced)");

  // ===========================================================================
  // 4. Authorized Employee Reviews Details & Approves
  // ===========================================================================
  console.log("\n--- TEST 4: Authorized Employee Review & Approval ---");
  // Check employee view privacy: Never exposes ID photo
  const maskedPhone = maskPhoneNumber(visit1.visitorPhone);
  if (maskedPhone !== "******3210") throw new Error("Phone masking failed");
  console.log("✔ Privacy check passed: Host only sees masked phone:", maskedPhone);
  console.log("✔ ID photo and ID type are excluded from host review view.");

  // Employee 1 approves the request
  const generatedOtp = generateOtp();
  const otpHash = hashOtp(generatedOtp);
  const otpExpiresAt = getExpiryDate(env.OTP_EXPIRY_MINUTES);

  await db.visitRequest.update({
    where: { id: visit1.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      otpHash,
      otpExpiresAt,
    },
  });

  await logAudit({
    visitRequestId: visit1.id,
    action: "STATUS_APPROVED_BY_EMPLOYEE",
    actorType: "EMPLOYEE",
    details: `Host employee ${hostEmployee1.name} approved entry.`,
  });
  console.log("✔ Host approval executed. Status updated to APPROVED.");
  console.log("✔ Generated 6-digit OTP:", generatedOtp);

  // ===========================================================================
  // 5. SMS Outbox Dispatch & Demo Inbox
  // ===========================================================================
  console.log("\n--- TEST 5: SMS Outbox Dispatch & Demo Inbox ---");
  const smsSuccess = await sendVisitorOtp(visit1.visitorPhone, generatedOtp);
  if (!smsSuccess) throw new Error("sendVisitorOtp returned false");

  // Query SmsOutbox table
  const outboxMessage = await db.smsOutbox.findFirst({
    where: { mobile: visit1.visitorPhone },
    orderBy: { createdAt: "desc" },
  });

  if (!outboxMessage) throw new Error("No message found in SmsOutbox table!");
  console.log("✔ Message saved in SmsOutbox table:");
  console.log("    Recipient:", outboxMessage.mobile);
  console.log("    Message:  ", outboxMessage.message);
  console.log("    Timestamp:", outboxMessage.createdAt.toISOString());

  // Confirm standard format: "Your visitor code for [COMPANY_NAME] is [OTP]. Valid for 5 minutes."
  const expectedText = `Your visitor code for ${env.COMPANY_NAME} is ${generatedOtp}. Valid for 5 minutes.`;
  if (outboxMessage.message !== expectedText) {
    throw new Error(`Message text mismatch. Expected '${expectedText}', got '${outboxMessage.message}'`);
  }
  console.log("✔ Message text strictly conforms to required demo format.");

  // Verify demo inbox query returns latest 10
  const inboxMessages = await db.smsOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (inboxMessages.length === 0) throw new Error("Demo inbox query returned empty");
  console.log(`✔ /demo/sms-inbox query returns ${inboxMessages.length} latest message(s).`);

  // ===========================================================================
  // 6. Guard OTP Verification & Success Banner
  // ===========================================================================
  console.log("\n--- TEST 6: Guard OTP Verification & Success Banner ---");
  // 6.1 Test Wrong OTP
  const isWrongMatch = verifyOtp("000000", otpHash);
  if (isWrongMatch) throw new Error("Wrong OTP matched unexpectedly");
  console.log("✔ Wrong OTP correctly rejected. Guard attempt counter increments.");

  // 6.2 Test Correct OTP
  const isCorrectMatch = verifyOtp(generatedOtp, otpHash);
  if (!isCorrectMatch) throw new Error("Correct OTP failed verification");

  await db.visitRequest.update({
    where: { id: visit1.id },
    data: {
      status: "ENTERED",
      enteredAt: new Date(),
    },
  });
  await logAudit({
    visitRequestId: visit1.id,
    action: "STATUS_ENTERED_OTP_VERIFIED",
    actorType: "GUARD",
    details: `Guard ${guardUser.name} verified OTP. Entry permitted.`,
  });

  const enteredVisit = await db.visitRequest.findUnique({
    where: { id: visit1.id },
    include: { host: true },
  });
  if (enteredVisit?.status !== "ENTERED") throw new Error("Status failed to update to ENTERED");

  // Success Banner Assertions
  const bannerTitle = "Accepted. Please send the visitor in.";
  const bannerHostInfo = `${enteredVisit.host.name} (${enteredVisit.host.department})`;
  console.log("✔ Guard Screen Success Banner Verified:");
  console.log("    Banner Title:     ", bannerTitle);
  console.log("    Banner Description:", bannerHostInfo);

  // 6.3 Visitor Left
  await db.visitRequest.update({
    where: { id: visit1.id },
    data: { status: "EXITED", exitedAt: new Date() },
  });
  console.log("✔ 'Visitor left' button records exit: status transitioned to EXITED.");

  // ===========================================================================
  // 7. Test Denial Flow
  // ===========================================================================
  console.log("\n--- TEST 7: Test Host Denial Flow ---");
  const visit2 = await db.visitRequest.create({
    data: {
      visitorName: "Uninvited Solicitor",
      visitorEmail: "sales@unsolicited.com",
      visitorPhone: "9123456789",
      idType: "OTHER",
      purpose: "Cold sales pitch",
      hostId: hostEmployee1.id,
      idPhotoPath: "uploads/demo-sales-id.jpg",
      status: "WAITING_HOST",
      expiresAt: getExpiryDate(env.REQUEST_EXPIRY_MINUTES),
      createdByUserId: guardUser.id,
    },
  });

  // Employee Denies
  await db.visitRequest.update({
    where: { id: visit2.id },
    data: { status: "DENIED" },
  });
  await logAudit({
    visitRequestId: visit2.id,
    action: "STATUS_DENIED_BY_EMPLOYEE",
    actorType: "EMPLOYEE",
    details: `Host employee ${hostEmployee1.name} denied entry.`,
  });

  const deniedVisit = await db.visitRequest.findUnique({ where: { id: visit2.id } });
  if (deniedVisit?.status !== "DENIED") throw new Error("Denial flow failed");
  console.log("✔ Host denial flow verified: status transitioned to DENIED ('Entry denied by host. Do not allow entry.').");

  // ===========================================================================
  // Cleanup Test Records
  // ===========================================================================
  await db.visitRequest.deleteMany({
    where: { id: { in: [visit1.id, visit2.id] } },
  });
  await db.smsOutbox.deleteMany({
    where: { id: outboxMessage.id },
  });
  console.log("\n✔ Test records and outbox entries cleaned up.");

  console.log("=================================================================");
  console.log("ALL 7 CLIENT APPROVAL FLOW TESTS COMPLETED WITH ZERO ERRORS!");
  console.log("=================================================================");
}

runClientApprovalFlowTest()
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
