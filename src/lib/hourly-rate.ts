/** Employee.hourlyRate is DECIMAL(10, 4): up to 6 digits before the point, 4 after. */
export const HOURLY_RATE_SCALE = 4;
export const HOURLY_RATE_INPUT_STEP = "0.0001";
const HOURLY_RATE_MAX_INTEGER_DIGITS = 6;

/** Number, decimal string, or Prisma.Decimal (anything with toString()). */
export type HourlyRateValue = number | string | { toString(): string };

export type ParsedHourlyRate =
  | { ok: true; value: string }
  | { ok: false; error: string };

function rateSourceText(rate: HourlyRateValue): string {
  if (typeof rate === "number") {
    if (!Number.isFinite(rate)) return "";
    // 4 places, not 2 — a binary float such as 21.0635 must not collapse to cents.
    return rate.toFixed(HOURLY_RATE_SCALE);
  }
  return String(rate);
}

/**
 * Accepts a form or stored rate and returns a canonical decimal string
 * ("21.0635", "22", "21.5") with trailing zeros removed. Rejects more than
 * 4 fractional digits so DECIMAL(10, 4) does not silently round them away.
 */
export function parseHourlyRate(raw: unknown): ParsedHourlyRate {
  const text = String(raw ?? "")
    .trim()
    .replace(/\$/g, "")
    .replace(/,/g, "");
  if (!text || !/^\d+(\.\d+)?$/.test(text)) {
    return { ok: false, error: "Hourly rate must be a non-negative number." };
  }

  const [wholeRaw, fracRaw = ""] = text.split(".");
  const significant = fracRaw.replace(/0+$/, "");
  if (significant.length > HOURLY_RATE_SCALE) {
    return {
      ok: false,
      error: "Hourly rate supports at most 4 decimal places (example: 21.0635).",
    };
  }

  const whole = wholeRaw.replace(/^0+(?=\d)/, "");
  if (whole.length > HOURLY_RATE_MAX_INTEGER_DIGITS) {
    return { ok: false, error: "Hourly rate must be at most 999999.9999." };
  }

  const value = significant.length > 0 ? `${whole}.${significant}` : whole;
  return { ok: true, value };
}

/** Canonical string for inputs and Decimal writes. Empty when the value is invalid. */
export function hourlyRateDecimalString(rate: HourlyRateValue): string | null {
  const parsed = parseHourlyRate(rateSourceText(rate));
  return parsed.ok ? parsed.value : null;
}

/** Form control value: full precision, no trailing zeros. */
export function hourlyRateInputValue(rate: HourlyRateValue): string {
  return hourlyRateDecimalString(rate) ?? "";
}

/** Numeric rate for spreadsheets. Does not round to 2 decimal places. */
export function hourlyRateNumber(rate: HourlyRateValue): number {
  const text = hourlyRateDecimalString(rate);
  if (text == null) return Number.NaN;
  return Number(text);
}

/**
 * Currency display with 2–4 fraction digits. 22 stays $22.00; 21.0635 stays
 * $21.0635; trailing zeros beyond the needed places are omitted.
 */
export function formatHourlyRate(rate: HourlyRateValue): string {
  const text = hourlyRateDecimalString(rate);
  if (text == null) return "";
  const [whole, frac = ""] = text.split(".");
  const shown = (frac + "00").slice(0, Math.max(2, frac.length));
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${grouped}.${shown}`;
}
