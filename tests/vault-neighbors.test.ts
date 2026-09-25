import assert from "node:assert/strict";

import {
  graphDisagrees,
  hydrateSimilarGraph,
  titleKey,
  type NeighborCacheFile,
} from "../src/lib/vault-neighbors.ts";

function testTitleKey() {
  assert.equal(titleKey("  Hello   World "), "hello world");
  assert.equal(titleKey("It&#39;s time"), "it's time");
}

function testDisagreement() {
  assert.equal(graphDisagrees([], ["A"]), true);
  assert.equal(graphDisagrees(["Docker"], ["CI/CD", "Python"]), true);
  assert.equal(graphDisagrees(["Docker"], ["CI/CD", "Docker"]), false);
}

function testHydrate() {
  const cache: NeighborCacheFile = {
    model: "test",
    k: 1,
    generatedAt: "2026-09-19T00:00:00.000Z",
    records: [
      {
        slug: "a",
        title: "Alpha",
        learned: false,
        concepts: ["Programming"],
        relatedTitles: ["Beta"],
        neighbors: [{ slug: "c", title: "Gamma", score: 0.8 }],
      },
    ],
  };
  const graph = hydrateSimilarGraph(cache, [
    {
      id: "1",
      url: "https://www.youtube.com/watch?v=aaa",
      title: "Alpha",
      thumbnail: "https://i.ytimg.com/vi/aaa/hqdefault.jpg",
      category: "General",
      isLearned: false,
      createdAt: "2026-09-19T00:00:00.000Z",
    },
  ]);
  assert.equal(graph.videos.length, 1);
  assert.equal(graph.disagreementCount, 1);
  assert.equal(graph.videos[0].thumbnail?.includes("aaa"), true);
  assert.equal(graph.videos[0].neighbors[0].inGraphRelated, false);
}

testTitleKey();
testDisagreement();
testHydrate();
console.log("vault-neighbors tests passed");
