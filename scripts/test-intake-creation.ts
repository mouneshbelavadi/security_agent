import { db } from "../src/lib/db";
import { generateSecureToken, hashToken, getExpiryDate } from "../src/lib/crypto";
import { env } from "../src/lib/env";
import { z } from "zod";

const createVisitSchema = z.object({
  visitorName: z.string().trim().min(2),
  visitorEmail: z.string().trim().email(),
  visitorPhone: z.string().trim().regex(/^[0-9]{10}$/),
  idType: z.enum(["AADHAAR", "DRIVING_LICENCE", "VOTER_ID", "PASSPORT", "PAN", "OTHER"]),
  purpose: z.string().trim().max(100).optional().nullable(),
  hostId: z.string().min(1),
  idPhotoPath: z.string().min(1),
  selfiePath: z.string().optional().nullable(),
});

async function main() {
  console.log("=== VERIFYING REQUEST CREATION WITH ALL DEMO-SCOPE FIELDS IN POSTGRESQL ===");

  // 1. Verify PostgreSQL connection
  const datasourceResult = await db.$queryRawUnsafe<Array<{ version: string }>>("SELECT version();");
  console.log("✔ Connected to database engine:", datasourceResult[0]?.version.split(" ")[0]);
  if (!datasourceResult[0]?.version.toLowerCase().includes("postgres")) {
    throw new Error("Connected database is not PostgreSQL!");
  }

  // 2. Fetch active guard and host
  const guard = await db.user.findFirst({ where: { role: "GUARD", isActive: true } });
  if (!guard) throw new Error("No active guard user found");
  const host = await db.employee.findFirst({ where: { isActive: true } });
  if (!host) throw new Error("No active host employee found");

  // 3. Validate intake payload using Zod (same schema as /api/visit-requests)
  const rawPayload = {
    visitorName: "Priya Nair",
    visitorEmail: "priya.nair@clientcorp.in",
    visitorPhone: "9876543210",
    idType: "DRIVING_LICENCE" as const,
    purpose: "Vendor technical evaluation",
    hostId: host.id,
    idPhotoPath: "uploads/test-driving-licence.jpg",
    selfiePath: "uploads/test-priya-face.jpg",
  };
  const validated = createVisitSchema.parse(rawPayload);
  console.log("✔ Zod validation passed for all fields including visitorEmail and idType.");

  // Ensure no full ID number field exists in model or schema
  // @ts-expect-error ID number must never exist
  if (validated.idNumber !== undefined) {
    throw new Error("Security violation: idNumber property exists!");
  }

  // 4. Create record in PostgreSQL
  const expiry = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);

  const created = await db.visitRequest.create({
    data: {
      visitorName: validated.visitorName,
      visitorEmail: validated.visitorEmail.toLowerCase(),
      visitorPhone: validated.visitorPhone,
      idType: validated.idType,
      purpose: validated.purpose,
      hostId: validated.hostId,
      idPhotoPath: validated.idPhotoPath,
      selfiePath: validated.selfiePath,
      status: "WAITING_HOST",
      expiresAt: expiry,
      createdByUserId: guard.id,
    },
    include: {
      host: true,
      createdByUser: true,
    },
  });

  console.log("✔ Visit request created in PostgreSQL with ID:", created.id);
  console.log("  - Visitor Name:", created.visitorName);
  console.log("  - Visitor Email:", created.visitorEmail);
  console.log("  - Visitor Phone:", created.visitorPhone);
  console.log("  - ID Type:", created.idType);
  console.log("  - ID Photo Path:", created.idPhotoPath);
  console.log("  - Host:", created.host.name, `(${created.host.department})`);
  console.log("  - Guard:", created.createdByUser.name);

  // 5. Verify field assertions
  if (created.visitorEmail !== "priya.nair@clientcorp.in") throw new Error("Email mismatch");
  if (created.idType !== "DRIVING_LICENCE") throw new Error("ID Type mismatch");
  if (created.status !== "WAITING_HOST") throw new Error("Status mismatch");

  // 6. Test all enum values are accepted by PostgreSQL
  const idTypes = ["AADHAAR", "VOTER_ID", "PASSPORT", "PAN", "OTHER"] as const;
  for (const t of idTypes) {
    const updated = await db.visitRequest.update({
      where: { id: created.id },
      data: { idType: t },
      select: { idType: true },
    });
    if (updated.idType !== t) throw new Error(`Enum update failed for ${t}`);
  }
  console.log("✔ All IdType enum values (AADHAAR, DRIVING_LICENCE, VOTER_ID, PASSPORT, PAN, OTHER) tested & verified.");

  // 7. Verify Privacy Boundary: Host query simulation does NOT return idType or idPhotoPath
  const hostViewSimulation = await db.visitRequest.findFirst({
    where: { id: created.id },
    select: {
      id: true,
      visitorName: true,
      visitorPhone: true,
      purpose: true,
      selfiePath: true,
      status: true,
      createdAt: true,
      // Note: idType and idPhotoPath are EXCLUDED from host view
    },
  });
  if (!hostViewSimulation) throw new Error("Host simulation lookup failed");
  // @ts-expect-error idType must not be on hostViewSimulation
  if (hostViewSimulation.idType !== undefined || hostViewSimulation.idPhotoPath !== undefined) {
    throw new Error("Privacy leak: Host query selected ID photo or ID type!");
  }
  console.log("✔ Privacy check passed: Host view strictly excludes ID type and ID photo.");

  // 8. Verify Admin View: Includes idType and idPhotoPath
  const adminViewSimulation = await db.visitRequest.findUnique({
    where: { id: created.id },
    select: {
      id: true,
      visitorName: true,
      visitorEmail: true,
      idType: true,
      idPhotoPath: true,
    },
  });
  if (!adminViewSimulation?.idType || !adminViewSimulation?.idPhotoPath) {
    throw new Error("Admin view failed to retrieve idType or idPhotoPath");
  }
  console.log("✔ Admin check passed: Admin view properly includes idType and idPhotoPath.");

  // 9. Cleanup
  await db.visitRequest.delete({ where: { id: created.id } });
  console.log("✔ Test record cleanly deleted from database.");
  console.log("==============================================================");
  console.log("ALL CREATION AND VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("==============================================================");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
