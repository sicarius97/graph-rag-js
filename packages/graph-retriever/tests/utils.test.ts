import { describe, it, expect } from 'vitest';
import { batched } from '../src/utils/batched.js';
import { cosineSimilarity, cosineSimilarityTopK } from '../src/utils/math.js';
import { topK } from '../src/utils/topK.js';
import { amerge } from '../src/utils/merge.js';

describe('Utils', () => {
  describe('batched', () => {
    it('should batch empty iterable', () => {
      const result = Array.from(batched([], 2));
      expect(result).toEqual([]);
    });

    it('should batch elements into chunks', () => {
      const result = Array.from(batched([0, 1, 2, 3, 4], 2));
      expect(result).toEqual([[0, 1], [2, 3], [4]]);
    });

    it('should batch with exact chunk size', () => {
      const result = Array.from(batched([0, 1, 2, 3, 4, 5], 2));
      expect(result).toEqual([[0, 1], [2, 3], [4, 5]]);
    });

    it('should handle single element batches', () => {
      const result = Array.from(batched([1, 2, 3], 1));
      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should handle batch size larger than array', () => {
      const result = Array.from(batched([1, 2, 3], 5));
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should throw error for invalid batch size', () => {
      expect(() => Array.from(batched([1, 2, 3], 0))).toThrow('n must be at least one');
      expect(() => Array.from(batched([1, 2, 3], -1))).toThrow('n must be at least one');
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const result = cosineSimilarity(a, b);
      expect(result).toEqual([[0]]);
    });

    it('should handle identical vectors', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      const result = cosineSimilarity(a, b);
      expect(result[0][0]).toBeCloseTo(1.0);
    });

    it('should handle opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      const result = cosineSimilarity(a, b);
      expect(result[0][0]).toBeCloseTo(-1.0);
    });

    it('should handle zero vector', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      const result = cosineSimilarity(a, b);
      expect(result).toEqual([[0]]);
    });
  });

  describe('cosineSimilarityTopK', () => {
    it('should return top k similar vectors', () => {
      const query = [1, 0, 0];
      const vectors = [
        [1, 0, 0],   // similarity = 1
        [0, 1, 0],   // similarity = 0
        [0.8, 0.6, 0], // similarity ≈ 0.8
        [-1, 0, 0]   // similarity = -1
      ];
      
      const result = cosineSimilarityTopK(query, vectors, 2);
      expect(result.indices).toHaveLength(2);
      expect(result.scores).toHaveLength(2);
      expect(result.indices[0]).toEqual([0, 0]); // most similar
    });

    it('should handle k larger than array size', () => {
      const query = [1, 0, 0];
      const vectors = [[1, 0, 0], [0, 1, 0]];
      
      const result = cosineSimilarityTopK(query, vectors, 5);
      expect(result.indices).toHaveLength(2);
      expect(result.scores).toHaveLength(2);
    });
  });

  describe('topK', () => {
    it('should return top k items by embedding similarity', () => {
      const items = [
        { id: '1', content: 'test1', embedding: [1, 0, 0], metadata: {}, mimeType: 'text/plain' },
        { id: '2', content: 'test2', embedding: [0, 1, 0], metadata: {}, mimeType: 'text/plain' },
        { id: '3', content: 'test3', embedding: [0.8, 0.6, 0], metadata: {}, mimeType: 'text/plain' }
      ];
      
      const result = topK(items, { embedding: [1, 0, 0], k: 2 });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1'); // most similar
      expect(result[1].id).toBe('3'); // second most similar
    });

    it('should handle empty array', () => {
      const result = topK([], { embedding: [1, 0, 0], k: 2 });
      expect(result).toEqual([]);
    });
  });

  describe('amerge', () => {
    it('should merge async iterables', async () => {
      async function* gen1() {
        yield 1;
        yield 3;
        yield 5;
      }
      
      async function* gen2() {
        yield 2;
        yield 4;
        yield 6;
      }
      
      const result: number[] = [];
      for await (const value of amerge(gen1(), gen2())) {
        result.push(value);
      }
      
      expect(result.sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle empty iterables', async () => {
      async function* gen() {
        // empty generator
      }
      
      const result: never[] = [];
      for await (const value of amerge(gen())) {
        result.push(value);
      }
      
      expect(result).toEqual([]);
    });
  });
});
