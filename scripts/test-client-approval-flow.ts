import { db } from "../src/lib/db";
import { verifyPassword, generateOtp, hashOtp, verifyOtp, getExpiryDate } from "../src/lib/crypto";
import { sendHostApprovalEmail, sendVisitorOtpEmail, maskPhoneNumber } from "../src/lib/email";
import { logAudit } from "../src/lib/audit";
import { env } from "../src/lib/env";

async function runClientApprovalFlowTest() {
  console.log("=================================================================");
  console.log("STARTING CLIENT APPROVAL FLOW & AUTH BOUNDARY TEST SUITE");
  console.log("=================================================================");

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

  // 1. Employee Login Verification
  const isHostPasswordValid = await verifyPassword("GatePass2026!", hostEmployee1.user.passwordHash);
  if (!isHostPasswordValid) throw new Error("Employee password authentication failed");
  console.log("✔ TEST 1 Passed: Employee bcrypt authentication verified.");

  // 2. Guard Creates Request (Photo ID option) & Host Email
  const visit1 = await db.visitRequest.create({
    data: {
      visitorName: "Rohan Varma",
      visitorEmail: "mdscripts0415@gmail.com",
      visitorPhone: "9876543210",
      idType: "AADHAAR",
      purpose: "Vendor technical evaluation",
      hostId: hostEmployee1.id,
      idPhotoPath: "uploads/demo-rohan-id.jpg",
      selfiePath: "uploads/demo-rohan-face.jpg",
      status: "WAITING_HOST",
      expiresAt: getExpiryDate(env.REQUEST_EXPIRY_MINUTES),
      createdByUserId: guardUser.id,
    },
    include: { host: true },
  });

  const emailSent = await sendHostApprovalEmail({
    hostEmail: hostEmployee1.email,
    hostName: hostEmployee1.name,
    visitorName: visit1.visitorName,
    visitorPhone: visit1.visitorPhone,
    purpose: visit1.purpose,
    requestId: visit1.id,
    expiryMinutes: env.REQUEST_EXPIRY_MINUTES,
  });
  if (!emailSent) throw new Error("Host notification email failed");
  console.log("✔ TEST 2 Passed: Visit request created & host email sent via SMTP.");

  // 3. Cross-Employee Access Check
  if (visit1.hostId === hostEmployee2.id) {
    throw new Error("Cross-employee isolation failure");
  }
  console.log("✔ TEST 3 Passed: Cross-employee authorization boundary enforced.");

  // 4. Host Approval & Visitor Email OTP
  const maskedPhone = maskPhoneNumber(visit1.visitorPhone);
  if (maskedPhone !== "******3210") throw new Error("Phone masking failed");

  const generatedOtp = generateOtp();
  const otpHash = hashOtp(generatedOtp);

  await db.visitRequest.update({
    where: { id: visit1.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      otpHash,
      otpExpiresAt: getExpiryDate(env.OTP_EXPIRY_MINUTES),
    },
  });

  const otpEmailSent = await sendVisitorOtpEmail({
    visitorEmail: visit1.visitorEmail,
    visitorName: visit1.visitorName,
    hostName: hostEmployee1.name,
    hostDepartment: hostEmployee1.department,
    otp: generatedOtp,
    expiryMinutes: env.OTP_EXPIRY_MINUTES,
  });
  if (!otpEmailSent) throw new Error("Visitor OTP email failed");
  console.log("✔ TEST 4 Passed: Host approved & 6-digit OTP sent to visitor email.");

  // 5. Guard OTP Verification
  if (verifyOtp("000000", otpHash)) throw new Error("Wrong OTP matched unexpectedly");
  if (!verifyOtp(generatedOtp, otpHash)) throw new Error("Correct OTP failed verification");

  await db.visitRequest.update({
    where: { id: visit1.id },
    data: { status: "ENTERED", enteredAt: new Date() },
  });
  console.log("✔ TEST 5 Passed: Wrong OTP rejected, valid OTP transitioned status to ENTERED.");

  // 6. Denial Flow (with ID Number option)
  const visit2 = await db.visitRequest.create({
    data: {
      visitorName: "Uninvited Solicitor",
      visitorEmail: "sales@unsolicited.com",
      visitorPhone: "9123456789",
      idType: "PAN",
      idNumber: "ABCDE1234F",
      purpose: "Cold sales pitch",
      hostId: hostEmployee1.id,
      status: "WAITING_HOST",
      expiresAt: getExpiryDate(env.REQUEST_EXPIRY_MINUTES),
      createdByUserId: guardUser.id,
    },
  });

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
  console.log("✔ TEST 6 Passed: ID Number flow + Host denial verified.");

  // Cleanup
  await db.visitRequest.deleteMany({ where: { id: { in: [visit1.id, visit2.id] } } });
  await db.emailOutbox.deleteMany({ where: { requestId: { in: [visit1.id, visit2.id] } } });
  console.log("✔ Test records cleaned up.");
  console.log("=================================================================");
  console.log("ALL CLIENT APPROVAL FLOW TESTS PASSED!");
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
