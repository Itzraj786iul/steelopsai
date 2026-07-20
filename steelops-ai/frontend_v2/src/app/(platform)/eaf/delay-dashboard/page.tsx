import { redirect } from "next/navigation";

/** Delay Dashboard folded into Delay Log. */
export default function DelayDashboardRedirectPage() {
  redirect("/eaf/delays");
}
