import { redirect } from "next/navigation";

/** Operator Board folded into Live Board for a single floor surface. */
export default function OperatorBoardRedirectPage() {
  redirect("/eaf/live-board");
}
