import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  if (session.role === "ADMIN") {
    redirect("/admin");
  }

  if (session.role === "EMPLOYEE") {
    redirect("/host");
  }

  redirect("/guard");
}
