import type { Content } from '../content.js';
import { cosineSimilarityTopK } from './math.js';

/**
 * Select the top-k contents from the given content.
 * 
 * @param contents - The content from which to select the top-K
 * @param embedding - The embedding we're looking for
 * @param k - The number of items to select
 * @returns Top-K by similarity
 */
export function topK(
  contents: Iterable<Content>,
  options: {
    embedding: number[];
    k: number;
  }
): Content[] {
  const { embedding, k } = options;

  // Use Map to de-duplicate by ID. This ensures we choose the top K distinct
  // content (rather than K copies of the same content).
  const unscored = new Map<string, Content>();
  for (const content of contents) {
    unscored.set(content.id, content);
  }

  const topScored = similaritySortTopK(
    Array.from(unscored.values()),
    { embedding, k }
  );

  // Sort by score descending
  const sorted = Array.from(topScored.values()).sort((a, b) => b[1] - a[1]);

  return sorted.map(([content]) => content);
}

/**
 * Internal function to sort contents by similarity and return top-k.
 */
function similaritySortTopK(
  contents: Content[],
  options: { embedding: number[]; k: number }
): Map<string, [Content, number]> {
  const { embedding, k } = options;

  // Flatten the content and use a Map to deduplicate.
  // We need to do this *before* selecting the top_k to ensure we don't
  // get duplicates (and fail to produce `k`).
  const result = cosineSimilarityTopK(
    [embedding],
    contents.map(c => c.embedding),
    k
  );

  const results = new Map<string, [Content, number]>();
  for (let i = 0; i < result.indices.length; i++) {
    const [, y] = result.indices[i];
    const score = result.scores[i];
    const content = contents[y];
    results.set(content.id, [content, score]);
  }

  return results;
}
