import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/admin/log");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  if (session.role !== "ADMIN") {
    if (session.role === "EMPLOYEE") {
      redirect("/host");
    }
    redirect("/guard");
  }

  return <>{children}</>;
}
