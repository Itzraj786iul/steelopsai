"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { eafApi, DEFAULT_RECIPE } from "@/lib/api/eaf";

export default function EafHistoricalPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof eafApi.historical>>["data"] | null>(null);

  useEffect(() => {
    eafApi.historical(DEFAULT_RECIPE).then(({ data: d }) => setData(d));
  }, []);

  const vars = data?.variables ?? [];
  const dist = data?.distribution?.HM ?? [];

  return (
    <PageContainer title="Historical Analysis" description="Compare current recipe inputs against plant operating history">
      <SectionCard title="Operating Comparison">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 text-left">Variable</th>
                <th>Current</th>
                <th>Median</th>
                <th>P5</th>
                <th>P95</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vars.map((v) => (
                <tr key={v.variable} className="border-b border-border/50">
                  <td className="py-2 font-medium">{v.variable}</td>
                  <td className="font-mono">{v.current.toFixed(2)}</td>
                  <td className="font-mono">{v.median.toFixed(2)}</td>
                  <td className="font-mono">{v.p5.toFixed(2)}</td>
                  <td className="font-mono">{v.p95.toFixed(2)}</td>
                  <td>
                    <span
                      className={
                        v.status === "Normal"
                          ? "text-green-600"
                          : v.status === "Below normal"
                            ? "text-amber-600"
                            : "text-red-600"
                      }
                    >
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      {dist.length > 0 ? (
        <SectionCard title="HM Distribution" className="mt-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist.slice(0, 40).map((v, i) => ({ bin: i, count: 1, val: v }))}>
                <XAxis dataKey="val" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.6} />
                {vars[0] ? (
                  <>
                    <ReferenceLine x={vars[0].median} stroke="#0B3D6B" label="Median" />
                    <ReferenceLine x={vars[0].current} stroke="#B83232" label="Current" />
                  </>
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
