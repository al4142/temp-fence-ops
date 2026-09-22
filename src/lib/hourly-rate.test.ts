import { describe, expect, it } from "vitest";
import {
  formatHourlyRate,
  hourlyRateInputValue,
  parseHourlyRate,
} from "./hourly-rate";

describe("parseHourlyRate", () => {
  it("accepts four decimal places and existing shorter rates", () => {
    expect(parseHourlyRate("21.0635")).toEqual({ ok: true, value: "21.0635" });
    expect(parseHourlyRate("21.06350")).toEqual({ ok: true, value: "21.0635" });
    expect(parseHourlyRate("$21.0635")).toEqual({ ok: true, value: "21.0635" });
    expect(parseHourlyRate("22")).toEqual({ ok: true, value: "22" });
    expect(parseHourlyRate("22.00")).toEqual({ ok: true, value: "22" });
    expect(parseHourlyRate("20.5")).toEqual({ ok: true, value: "20.5" });
    expect(parseHourlyRate("1,234.50")).toEqual({ ok: true, value: "1234.5" });
    expect(parseHourlyRate("0")).toEqual({ ok: true, value: "0" });
  });

  it("rejects negatives, junk, and more than 4 decimal places", () => {
    expect(parseHourlyRate("-1").ok).toBe(false);
    expect(parseHourlyRate("").ok).toBe(false);
    expect(parseHourlyRate("abc").ok).toBe(false);
    expect(parseHourlyRate("21.06355")).toEqual({
      ok: false,
      error: "Hourly rate supports at most 4 decimal places (example: 21.0635).",
    });
    expect(parseHourlyRate("1000000").ok).toBe(false);
    expect(parseHourlyRate("999999.9999")).toEqual({ ok: true, value: "999999.9999" });
  });
});

describe("formatHourlyRate", () => {
  it("shows up to 4 decimals without trailing zeros or cent rounding", () => {
    expect(formatHourlyRate("21.0635")).toBe("$21.0635");
    expect(formatHourlyRate("21.0635")).not.toBe("$21.06");
    expect(formatHourlyRate(21.0635)).toBe("$21.0635");
    expect(formatHourlyRate("21.063")).toBe("$21.063");
    expect(formatHourlyRate("22")).toBe("$22.00");
    expect(formatHourlyRate("22.0000")).toBe("$22.00");
    expect(formatHourlyRate("20.5")).toBe("$20.50");
    expect(formatHourlyRate("20.50")).toBe("$20.50");
    expect(hourlyRateInputValue("21.0635")).toBe("21.0635");
    expect(hourlyRateInputValue("22.0000")).toBe("22");
    expect(hourlyRateInputValue(22)).toBe("22");
  });
});
