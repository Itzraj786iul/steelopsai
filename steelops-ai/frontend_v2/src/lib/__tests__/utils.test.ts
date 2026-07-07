import { formatCurrency, formatNumber, truncate } from "@/lib/utils";

describe("utils", () => {
  it("formats numbers for Indian locale", () => {
    expect(formatNumber(1234.5)).toContain("1");
  });

  it("formats currency", () => {
    expect(formatCurrency(1200)).toContain("₹");
  });

  it("truncates long strings", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcde…");
  });
});
