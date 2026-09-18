import { describe, expect, it } from "vitest";
import {
  ACTION_ITEM_OVERDUE_DAYS,
  actionItemOpenDays,
  actionItemsForTab,
  actionItemsPath,
  applyComplete,
  applyReopen,
  calendarDaysBetween,
  formatOpenDays,
  isActionItemOverdue,
  isActionItemStatus,
  parseActionItemInput,
  parseActionItemTab,
} from "./action-items";

const utc = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe("calendarDaysBetween", () => {
  it("counts UTC calendar days, ignoring clock time", () => {
    expect(calendarDaysBetween(utc("2026-09-10"), utc("2026-09-18"))).toBe(8);
    expect(
      calendarDaysBetween(new Date("2026-09-10T23:59:00.000Z"), new Date("2026-09-11T00:01:00.000Z")),
    ).toBe(1);
  });

  it("is 0 on the same calendar day", () => {
    expect(calendarDaysBetween(utc("2026-09-18"), utc("2026-09-18"))).toBe(0);
  });
});

describe("actionItemOpenDays", () => {
  const today = utc("2026-09-18");

  it("returns calendar days from date to today while Open", () => {
    expect(actionItemOpenDays({ date: utc("2026-09-18"), status: "Open" }, today)).toBe(0);
    expect(actionItemOpenDays({ date: utc("2026-09-15"), status: "Open" }, today)).toBe(3);
    expect(actionItemOpenDays({ date: utc("2026-09-10"), status: "Open" }, today)).toBe(8);
  });

  it("returns null when Done so the UI can show —", () => {
    expect(actionItemOpenDays({ date: utc("2026-09-01"), status: "Done" }, today)).toBeNull();
    expect(formatOpenDays(null)).toBe("—");
    expect(formatOpenDays(0)).toBe("0");
  });

  it("clamps future start dates to 0", () => {
    expect(actionItemOpenDays({ date: utc("2026-09-20"), status: "Open" }, today)).toBe(0);
  });

  it("treats open days >= 3 as overdue", () => {
    expect(ACTION_ITEM_OVERDUE_DAYS).toBe(3);
    expect(isActionItemOverdue(2)).toBe(false);
    expect(isActionItemOverdue(3)).toBe(true);
    expect(isActionItemOverdue(null)).toBe(false);
  });
});

describe("complete / reopen", () => {
  it("sets Done + completedAt, and clears completedAt on reopen", () => {
    const now = utc("2026-09-18");
    expect(applyComplete(now)).toEqual({ status: "Done", completedAt: now });
    expect(applyReopen()).toEqual({ status: "Open", completedAt: null });
  });

  it("recognizes status labels", () => {
    expect(isActionItemStatus("Open")).toBe(true);
    expect(isActionItemStatus("Done")).toBe(true);
    expect(isActionItemStatus("open")).toBe(false);
  });
});

describe("Open / Completed tabs", () => {
  const rows = [
    { id: "1", status: "Open", task: "Restock Davie" },
    { id: "2", status: "Done", task: "Return screen rolls" },
    { id: "3", status: "Open", task: "Call Sunrise" },
  ];

  it("defaults to Open unless tab=completed", () => {
    expect(parseActionItemTab(undefined)).toBe("open");
    expect(parseActionItemTab("")).toBe("open");
    expect(parseActionItemTab("open")).toBe("open");
    expect(parseActionItemTab("bogus")).toBe("open");
    expect(parseActionItemTab("completed")).toBe("completed");
  });

  it("filters Open vs Done and never mixes them", () => {
    expect(actionItemsForTab(rows, "open").map((r) => r.id)).toEqual(["1", "3"]);
    expect(actionItemsForTab(rows, "completed").map((r) => r.id)).toEqual(["2"]);
    expect(actionItemsForTab(rows, "open").every((r) => r.status === "Open")).toBe(true);
    expect(actionItemsForTab(rows, "completed").every((r) => r.status === "Done")).toBe(true);
  });

  it("builds tab URLs for the dashboard and page", () => {
    expect(actionItemsPath("open")).toBe("/action-items");
    expect(actionItemsPath()).toBe("/action-items");
    expect(actionItemsPath("completed")).toBe("/action-items?tab=completed");
  });
});

describe("parseActionItemInput", () => {
  it("requires date and task", () => {
    expect(parseActionItemInput({ date: "", task: "Restock panels" }).ok).toBe(false);
    expect(parseActionItemInput({ date: "2026-09-18", task: "" }).ok).toBe(false);
    expect(parseActionItemInput({ date: "09/18/2026", task: "Restock panels" }).ok).toBe(false);
  });

  it("trims fields and treats blank assignedTo / notes as null", () => {
    const result = parseActionItemInput({
      date: "2026-09-18",
      task: "  Call Davie yard  ",
      assignedTo: "  Lisa Nguyen  ",
      notes: "   ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        date: "2026-09-18",
        task: "Call Davie yard",
        assignedTo: "Lisa Nguyen",
        notes: null,
      });
    }
  });
});
