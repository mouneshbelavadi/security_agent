import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function GuardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/guard");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  if (session.role === "EMPLOYEE") {
    redirect("/host");
  }

  return <>{children}</>;
}
