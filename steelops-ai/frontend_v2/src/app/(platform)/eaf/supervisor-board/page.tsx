import { redirect } from "next/navigation";

/** Supervisor Board folded into Live Board. */
export default function Page() {
  redirect("/eaf/live-board");
}
