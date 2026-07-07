import {
  deviationPct,
  formatElapsed,
  isLiveHeatWorkspacePath,
  normalizeLiveList,
  stageProgress,
} from "@/features/live/utils/live-utils";

describe("live-utils", () => {
  it("formats elapsed seconds", () => {
    expect(formatElapsed(125)).toBe("02:05");
  });

  it("normalizes live list response", () => {
    const result = normalizeLiveList({ items: [{ id: "1", heat_number: "H-1", status: "MELTING" }], total: 1 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it("computes deviation percentage", () => {
    expect(deviationPct(100, 110)).toBeCloseTo(10);
  });

  it("maps stage progress from status", () => {
    expect(stageProgress("MELTING")).toBeGreaterThan(stageProgress("CHARGING"));
    expect(stageProgress("COMPLETED")).toBe(100);
  });

  it("detects immersive live workspace paths", () => {
    expect(isLiveHeatWorkspacePath("/live/abc-123")).toBe(true);
    expect(isLiveHeatWorkspacePath("/live/floor")).toBe(false);
    expect(isLiveHeatWorkspacePath("/live")).toBe(false);
  });
});
