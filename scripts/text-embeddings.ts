export type Neighbor = {
  index: number;
  score: number;
};

export function l2Normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  let sumSquares = 0;
  for (const value of values) sumSquares += value * value;
  if (sumSquares === 0) return values.map(() => 0);
  const norm = Math.sqrt(sumSquares);
  return values.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("cosineSimilarity requires equal-length non-empty vectors");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function topKNeighbors(
  queryIndex: number,
  embeddings: number[][],
  k: number,
): Neighbor[] {
  if (queryIndex < 0 || queryIndex >= embeddings.length) {
    throw new Error("queryIndex out of range");
  }
  const query = embeddings[queryIndex];
  const ranked: Neighbor[] = [];
  for (let i = 0; i < embeddings.length; i += 1) {
    if (i === queryIndex) continue;
    ranked.push({ index: i, score: cosineSimilarity(query, embeddings[i]) });
  }
  ranked.sort((left, right) => right.score - left.score);
  return ranked.slice(0, Math.max(0, k));
}

export function embedTextOffline(text: string, dimensions = 64): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const slot = Math.abs(hash) % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[slot] += sign;
  }
  return l2Normalize(vector);
}

export async function embedTexts(
  texts: string[],
  options?: { backend?: "local" | "hash" },
): Promise<number[][]> {
  const backend = options?.backend ?? "local";
  if (backend === "hash") {
    return texts.map((text) => embedTextOffline(text));
  }

  const { pipeline } = await import("@huggingface/transformers");
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  );
  const vectors: number[][] = [];
  for (const text of texts) {
    const output = await extractor(text.slice(0, 2000), {
      pooling: "mean",
      normalize: true,
    });
    const data = Array.from(output.data as Float32Array);
    vectors.push(data);
  }
  return vectors;
}
