import assert from "node:assert/strict";

import { buildVideoReference } from "../src/lib/video-reference.ts";

function testPalantirIsSpecific() {
  const note = buildVideoReference({
    title: "What does Palantir actually do?",
    category: "Business",
    isLearned: true,
    url: "https://www.youtube.com/watch?v=KipDBa4bTl8",
  });
  assert.match(note.summary, /ontology|object model/i);
  assert.match(note.summary, /What does Palantir actually do/);
  assert.ok(note.summary.split(/(?<=[.!?])\s+/).length >= 4);
  assert.ok(note.remember.some((item) => /write-back|ontology/i.test(item)));
  assert.ok(!note.summary.includes("Use the title as a hypothesis"));
}

function testTransformerDoesNotUseGenericBusinessLens() {
  const note = buildVideoReference({
    title: "The Transformer Explained: A Complete Layer-by-Layer Visual Breakdown",
    category: "General",
  });
  assert.match(note.summary, /attention|residual/i);
  assert.ok(note.concepts.includes("Large Language Models"));
}

function testPluralDataCentersMatch() {
  const note = buildVideoReference({
    title: "How AI Data Centers Will Break America (Like 2008)",
    category: "Business",
  });
  assert.match(note.summary, /megawatts|interconnect|power plant/i);
  assert.ok(note.concepts.includes("Data Centers"));
}

function testUnknownTitleStillHasAStudyCard() {
  const note = buildVideoReference({
    title: "A completely unknown lecture about something new",
    category: "Other",
  });
  assert.match(note.summary, /A completely unknown lecture about something new/);
  assert.ok(note.remember.length >= 3);
  assert.ok(note.questions.length >= 3);
  assert.ok(note.takeaways.length >= 2);
}

testPalantirIsSpecific();
testTransformerDoesNotUseGenericBusinessLens();
testPluralDataCentersMatch();
testUnknownTitleStillHasAStudyCard();
console.log("video-reference tests passed");
