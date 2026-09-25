import assert from "node:assert/strict";
import {
  cosineSimilarity,
  l2Normalize,
  topKNeighbors,
} from "../scripts/text-embeddings.ts";

const EPS = 1e-9;

function almostEqual(actual: number, expected: number, message?: string) {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    message ?? `expected ${actual} to be within ${EPS} of ${expected}`,
  );
}

function l2Norm(values: number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
}

function assertThrowsEmptyOrMismatch() {
  assert.throws(
    () => cosineSimilarity([], []),
    /equal-length non-empty/,
  );
  assert.throws(
    () => cosineSimilarity([1], [1, 0]),
    /equal-length non-empty/,
  );
  assert.throws(
    () => cosineSimilarity([1, 0], []),
    /equal-length non-empty/,
  );
  assert.throws(
    () => cosineSimilarity([], [1, 0]),
    /equal-length non-empty/,
  );
  assert.throws(
    () => cosineSimilarity([1, 0], [1]),
    /equal-length non-empty/,
  );
}

function testCosineSimilarity() {
  almostEqual(cosineSimilarity([1, 0], [1, 0]), 1, "identical unit vectors => 1");
  almostEqual(
    cosineSimilarity([0, 1, 0], [0, 1, 0]),
    1,
    "identical 3d unit vectors => 1",
  );
  almostEqual(cosineSimilarity([1, 0], [0, 1]), 0, "orthogonal => 0");
  almostEqual(cosineSimilarity([1, 0], [-1, 0]), -1, "opposite => -1");
  almostEqual(cosineSimilarity([0, 0], [1, 0]), 0, "zero vector => 0");
  assertThrowsEmptyOrMismatch();
}

function testL2Normalize() {
  const unit = l2Normalize([3, 4]);
  almostEqual(l2Norm(unit), 1, "normalized vector has L2 norm 1");
  almostEqual(unit[0], 0.6);
  almostEqual(unit[1], 0.8);

  const alreadyUnit = l2Normalize([1, 0]);
  almostEqual(l2Norm(alreadyUnit), 1);

  assert.deepEqual(l2Normalize([0, 0, 0]), [0, 0, 0], "zero vector stays zeros");
  assert.deepEqual(l2Normalize([]), []);
}

function testTopKNeighbors() {
  const embeddings = [
    [1, 0],
    [0.9, 0.1],
    [0, 1],
  ];

  const nearest = topKNeighbors(0, embeddings, 1);
  assert.equal(nearest.length, 1);
  assert.equal(nearest[0].index, 1, "point 0 is closer to 1 than to 2");
  assert.ok(!nearest.some((n) => n.index === 0), "never includes queryIndex");

  const all = topKNeighbors(0, embeddings, 10);
  assert.equal(all.length, Math.min(10, embeddings.length - 1));
  assert.ok(!all.some((n) => n.index === 0));
  for (let i = 1; i < all.length; i += 1) {
    assert.ok(all[i - 1].score >= all[i].score, "scores descending");
  }

  const two = topKNeighbors(0, embeddings, 2);
  assert.equal(two.length, 2);
  assert.deepEqual(
    two.map((n) => n.index),
    [1, 2],
  );
  assert.ok(two[0].score > two[1].score);

  const kZero = topKNeighbors(1, embeddings, 0);
  assert.equal(kZero.length, 0);

  // Input order differs from similarity order, so sorting must do real work.
  const unsorted = [[1, 0], [-1, 0], [0, 1], [0.9, 0.1]];
  assert.deepEqual(
    topKNeighbors(0, unsorted, 3).map((neighbor) => neighbor.index),
    [3, 2, 1],
  );
  for (let queryIndex = 0; queryIndex < unsorted.length; queryIndex += 1) {
    for (const k of [0, 1, 2, 3, 10]) {
      const neighbors = topKNeighbors(queryIndex, unsorted, k);
      assert.equal(neighbors.length, Math.min(k, unsorted.length - 1));
      assert.ok(
        neighbors.every((neighbor) => neighbor.index !== queryIndex),
        `query ${queryIndex} must be excluded for k=${k}`,
      );
      for (let i = 1; i < neighbors.length; i += 1) {
        assert.ok(neighbors[i - 1].score >= neighbors[i].score, "scores descending");
      }
    }
  }
  assert.deepEqual(topKNeighbors(0, [[1, 0]], 10), []);
}

testCosineSimilarity();
testL2Normalize();
testTopKNeighbors();
console.log("text-embeddings tests passed");
