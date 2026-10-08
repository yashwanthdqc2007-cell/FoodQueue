import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeRescueClock } from "../lib/rules/rescue-clock";

describe("Food Rescue Clock Calculation & Boundaries", () => {
  const referenceTime = new Date("2026-10-08T10:00:00Z").getTime();

  it("1. Calculates ACTIVE status when remaining time is > 60 minutes", () => {
    // 2 hours remaining
    const deadline = new Date(referenceTime + 2 * 3600 * 1000).toISOString();
    const result = computeRescueClock(deadline, referenceTime);

    assert.equal(result.status, "ACTIVE");
    assert.equal(result.isExpired, false);
    assert.equal(result.remainingMinutes, 120);
    assert.equal(result.formattedRemaining, "02:00:00 remaining");
  });

  it("2. Calculates URGENT status when remaining time is exactly 60 minutes", () => {
    // Exactly 60 minutes (boundary)
    const deadline = new Date(referenceTime + 60 * 60 * 1000).toISOString();
    const result = computeRescueClock(deadline, referenceTime);

    assert.equal(result.status, "URGENT");
    assert.equal(result.isExpired, false);
    assert.equal(result.remainingMinutes, 60);
    assert.equal(result.formattedRemaining, "01:00:00 remaining");
  });

  it("3. Calculates URGENT status when remaining time is <= 60 minutes", () => {
    // 25 minutes remaining
    const deadline = new Date(referenceTime + 25 * 60 * 1000 + 30 * 1000).toISOString();
    const result = computeRescueClock(deadline, referenceTime);

    assert.equal(result.status, "URGENT");
    assert.equal(result.isExpired, false);
    assert.equal(result.remainingMinutes, 25);
    assert.equal(result.formattedRemaining, "00:25:30 remaining");
  });

  it("4. Calculates EXPIRED status when deadline is in the past", () => {
    // 10 minutes past deadline
    const deadline = new Date(referenceTime - 10 * 60 * 1000).toISOString();
    const result = computeRescueClock(deadline, referenceTime);

    assert.equal(result.status, "EXPIRED");
    assert.equal(result.isExpired, true);
    assert.equal(result.remainingMinutes, 0);
    assert.equal(result.formattedRemaining, "Expired");
  });

  it("5. Handles null or undefined deadline gracefully", () => {
    const result = computeRescueClock(null, referenceTime);
    assert.equal(result.status, "EXPIRED");
    assert.equal(result.isExpired, true);
    assert.equal(result.deadlineIso, null);
  });

  it("6. Handles malformed date string gracefully", () => {
    const result = computeRescueClock("not-a-date", referenceTime);
    assert.equal(result.status, "EXPIRED");
    assert.equal(result.isExpired, true);
    assert.equal(result.deadlineIso, null);
  });
});
