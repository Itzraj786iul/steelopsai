import { redirect } from "next/navigation";

/** Alias of Shift Dashboard — keep one plant overview. */
export default function PlantDashboardRedirectPage() {
  redirect("/eaf/shift-dashboard");
}
