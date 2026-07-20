import { redirect } from "next/navigation";

/** Reports hub is /eaf/reports. */
export default function OpsReportsRedirectPage() {
  redirect("/eaf/reports");
}
