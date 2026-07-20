import { redirect } from "next/navigation";

/** Demoted duplicate overview — use role-specific home via Shift Dashboard as safe default. */
export default function EafDashboardPage() {
  redirect("/eaf/shift-dashboard");
}
