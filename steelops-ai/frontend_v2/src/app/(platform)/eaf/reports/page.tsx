"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { eafApi, DEFAULT_RECIPE } from "@/lib/api/eaf";

async function download(format: "json" | "csv" | "pdf") {
  const { data } = await eafApi.report(DEFAULT_RECIPE, format);
  const blob = data instanceof Blob ? data : new Blob([data as string], { type: format === "json" ? "application/json" : "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eaf_report.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EafReportsPage() {
  return (
    <PageContainer title="Downloads" description="Prediction and optimization reports">
      <SectionCard title="Export Reports">
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => download("json")}>Download JSON</Button>
          <Button variant="outline" onClick={() => download("csv")}>Download CSV</Button>
          <Button variant="outline" onClick={() => download("pdf")}>Download PDF</Button>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
