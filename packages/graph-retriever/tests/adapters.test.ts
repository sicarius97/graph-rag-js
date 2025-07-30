import { describe, it, expect } from 'vitest';
import { Adapter } from '../src/adapters/base.js';
import { InMemory } from '../src/adapters/inMemory.js';
import { createContent } from '../src/content.js';
import { MetadataEdge, IdEdge } from '../src/edges/index.js';

describe('Adapters', () => {
  describe('InMemory adapter', () => {
    const embedFunction = (text: string): number[] => {
      // Simple hash-based embedding for testing
      const hash = text.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return [hash / 1000000, (hash % 1000) / 1000, Math.abs(hash % 100) / 100];
    };

    const testContents = [
      createContent({
        id: 'doc1',
        content: 'Hello world',
        embedding: embedFunction('Hello world'),
        metadata: { category: 'greeting', language: 'en' }
      }),
      createContent({
        id: 'doc2',
        content: 'Goodbye world',
        embedding: embedFunction('Goodbye world'),
        metadata: { category: 'farewell', language: 'en' }
      }),
      createContent({
        id: 'doc3',
        content: 'Bonjour monde',
        embedding: embedFunction('Bonjour monde'),
        metadata: { category: 'greeting', language: 'fr' }
      })
    ];

    it('should search by embedding similarity', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      const queryEmbedding = embedFunction('Hello world');
      
      const results = await adapter.search(queryEmbedding, { k: 2 });
      
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('doc1'); // exact match should be first
    });

    it('should search with embedding generation', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      
      const result = await adapter.searchWithEmbedding('Hello world', { k: 1 });
      
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].id).toBe('doc1');
      expect(result.queryEmbedding).toEqual(embedFunction('Hello world'));
    });

    it('should filter by metadata', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      const queryEmbedding = embedFunction('Hello');
      
      const results = await adapter.search(queryEmbedding, { 
        k: 5, 
        filter: { language: 'fr' } 
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc3');
    });

    it('should get documents by ids', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      
      const results = await adapter.get(['doc1', 'doc3'], {});
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual(['doc1', 'doc3']);
    });

    it('should handle adjacent metadata edges', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      const queryEmbedding = embedFunction('Hello');
      
      const metadataEdge = new MetadataEdge('category', 'greeting');
      
      const edges = new Set([metadataEdge]);
      const results = await adapter.adjacent(edges, queryEmbedding, { k: 3 });
      
      expect(results.length).toBeGreaterThan(0);
      // Should only return docs with category = 'greeting'
      for (const result of results) {
        expect(result.metadata.category).toBe('greeting');
      }
    });

    it('should handle adjacent id edges', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      const queryEmbedding = embedFunction('Hello');
      
      const idEdge = new IdEdge('doc2');
      
      const edges = new Set([idEdge]);
      const results = await adapter.adjacent(edges, queryEmbedding, { k: 3 });
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc2');
    });

    it('should handle mixed edge types', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      const queryEmbedding = embedFunction('Hello');
      
      const metadataEdge = new MetadataEdge('language', 'en');
      const idEdge = new IdEdge('doc3');
      
      const edges = new Set([metadataEdge, idEdge]);
      const results = await adapter.adjacent(edges, queryEmbedding, { k: 5 });
      
      expect(results.length).toBeGreaterThanOrEqual(2);
      
      // Should include doc3 (from id edge) and docs with language=en (from metadata edge)
      const ids = results.map(r => r.id);
      expect(ids).toContain('doc3');
    });

    it('should respect k parameter', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      const queryEmbedding = embedFunction('Hello');
      
      const results = await adapter.search(queryEmbedding, { k: 1 });
      
      expect(results).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      const adapter = new InMemory(embedFunction, []);
      const queryEmbedding = embedFunction('Hello');
      
      const results = await adapter.search(queryEmbedding, { k: 5 });
      
      expect(results).toHaveLength(0);
    });

    it('should handle non-existent ids', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      
      const results = await adapter.get(['nonexistent'], {});
      
      expect(results).toHaveLength(0);
    });

    it('should apply complex metadata filters', async () => {
      const adapter = new InMemory(embedFunction, testContents);
      const queryEmbedding = embedFunction('Hello');
      
      // Filter that should match no documents
      const results = await adapter.search(queryEmbedding, { 
        k: 5, 
        filter: { category: 'greeting', language: 'es' } 
      });
      
      expect(results).toHaveLength(0);
    });
  });
});
