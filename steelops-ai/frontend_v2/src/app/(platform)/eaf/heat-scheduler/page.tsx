import { redirect } from "next/navigation";

/** Heat Scheduler folded into Heat Queue. */
export default function HeatSchedulerRedirectPage() {
  redirect("/eaf/heat-queue");
}
