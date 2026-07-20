"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";

/** Retired — Accept / Modify / Reject lives on Optimizer. */
export default function EafFeedbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/eaf/optimizer");
  }, [router]);

  return (
    <div className="p-6">
      <PageLoadingSkeleton />
    </div>
  );
}
