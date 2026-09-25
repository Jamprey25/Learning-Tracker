import assert from "node:assert/strict";

import {
  draftsFromStudy,
  dueAfter,
  interleaveByConcept,
  nextIntervalDays,
} from "../src/lib/recall-schedule.ts";

function testIntervals() {
  assert.equal(nextIntervalDays(0, "again"), 1);
  assert.equal(nextIntervalDays(0, "hard"), 1);
  assert.equal(nextIntervalDays(0, "good"), 2);
  assert.equal(nextIntervalDays(4, "good"), 8);
  assert.equal(nextIntervalDays(4, "easy"), 14);
  assert.equal(nextIntervalDays(10, "hard"), 6);
}

function testDueAfterUsesUtcDays() {
  const due = dueAfter(new Date("2026-09-24T23:30:00.000Z"), 1);
  assert.equal(due.toISOString().slice(0, 10), "2026-09-25");
}

function testInterleaveSeparatesConcepts() {
  const cards = [
    { id: "a1", concept: "Systems", dueAt: new Date("2026-01-01") },
    { id: "a2", concept: "Systems", dueAt: new Date("2026-01-02") },
    { id: "b1", concept: "Markets", dueAt: new Date("2026-01-01") },
  ];
  const mixed = interleaveByConcept(cards, 5);
  assert.deepEqual(
    mixed.map((card) => card.id),
    ["a1", "b1", "a2"],
  );
  assert.notEqual(mixed[0]?.concept, mixed[1]?.concept);
}

function testDraftsAreGrounded() {
  const drafts = draftsFromStudy("Indexes", {
    summary: "A B-tree keeps range scans ordered.",
    takeaways: ["Never scan the heap when the index covers the query."],
    concepts: ["Databases", "Indexes"],
  });
  assert.equal(drafts.length, 3);
  assert.equal(drafts[0]?.kind, "mechanism");
  assert.match(drafts[0]?.answer ?? "", /B-tree/);
  assert.match(drafts[1]?.answer ?? "", /heap/);
  assert.match(drafts[2]?.answer ?? "", /Databases/);
}

testIntervals();
testDueAfterUsesUtcDays();
testInterleaveSeparatesConcepts();
testDraftsAreGrounded();
console.log("recall-schedule tests passed");
