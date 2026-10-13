import { describe, expect, it } from "vitest";
import { formatSchedule, type ScheduleLabels } from "./schedule";

const labels: ScheduleLabels = {
  everyDay: "every day",
  noTimes: "No times set",
  dayNames: { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" },
};

describe("formatSchedule", () => {
  it("shows a no-times message when there is no schedule", () => {
    expect(formatSchedule(null, labels)).toBe("No times set");
    expect(formatSchedule(undefined, labels)).toBe("No times set");
  });

  it("shows a no-times message when times is empty", () => {
    expect(formatSchedule({ times: [], daysOfWeek: null }, labels)).toBe("No times set");
  });

  it("joins times and shows every day when daysOfWeek is null", () => {
    expect(formatSchedule({ times: ["08:00", "20:00"], daysOfWeek: null }, labels)).toBe(
      "08:00, 20:00 · every day",
    );
  });

  it("joins times and shows every day when daysOfWeek is empty", () => {
    expect(formatSchedule({ times: ["08:00"], daysOfWeek: [] }, labels)).toBe("08:00 · every day");
  });

  it("maps selected days to short names, sorted", () => {
    expect(formatSchedule({ times: ["09:00"], daysOfWeek: [5, 1, 3] }, labels)).toBe(
      "09:00 · Mon, Wed, Fri",
    );
  });

  it("maps a single day", () => {
    expect(formatSchedule({ times: ["21:30"], daysOfWeek: [7] }, labels)).toBe("21:30 · Sun");
  });
});


it("shows selected days even when no time is set", () => {
  expect(formatSchedule({ times: [], daysOfWeek: [1, 3] }, labels)).toBe("No times set · Mon, Wed");
  expect(formatSchedule({ times: [], daysOfWeek: [1] }, {
    everyDay: "每日", noTimes: "未設定服用時間",
    dayNames: { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "日" },
  })).toBe("未設定服用時間 · 一");
});
