import { redirect } from "next/navigation";

/** MES Search folded into Search. */
export default function MesSearchRedirectPage() {
  redirect("/eaf/search");
}
