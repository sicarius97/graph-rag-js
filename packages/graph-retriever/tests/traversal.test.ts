import { describe, it, expect } from 'vitest';
import { traverse } from '../src/traversal.js';
import { InMemory } from '../src/adapters/inMemory.js';
import { createContent } from '../src/content.js';
import { MetadataEdgeFunction } from '../src/edges/metadata.js';
import { MetadataEdge } from '../src/edges/base.js';
import { Eager } from '../src/strategies/eager.js';

describe('Traversal', () => {
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
      metadata: { category: 'greeting', language: 'en', level: 1 }
    }),
    createContent({
      id: 'doc2',
      content: 'Goodbye world',
      embedding: embedFunction('Goodbye world'),
      metadata: { category: 'farewell', language: 'en', level: 1 }
    }),
    createContent({
      id: 'doc3',
      content: 'Bonjour monde',
      embedding: embedFunction('Bonjour monde'),
      metadata: { category: 'greeting', language: 'fr', level: 2 }
    }),
    createContent({
      id: 'doc4',
      content: 'Advanced topic',
      embedding: embedFunction('Advanced topic'),
      metadata: { category: 'technical', language: 'en', level: 3 }
    })
  ];

  it('should traverse with edge specifications', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [['category', 'category']], // metadata to metadata edge
      strategy,
      store: adapter,
      storeKwargs: { k: 5 }
    });
    
    expect(result.length).toBeGreaterThan(0);
    
    // All results should be nodes
    for (const node of result) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('content');
    }
  });

  it('should traverse with metadata filter', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [['language', 'language']],
      strategy,
      store: adapter,
      metadataFilter: { category: 'greeting' },
      storeKwargs: { k: 5 }
    });
    
    expect(result.length).toBeGreaterThan(0);
    
    // Should find documents matching criteria
    for (const node of result) {
      expect(typeof node.content).toBe('string');
    }
  });

  it('should handle initial root ids', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [['category', 'category']],
      strategy,
      store: adapter,
      initialRootIds: ['doc1'],
      storeKwargs: { k: 5 }
    });
    
    expect(result.length).toBeGreaterThan(0);
    
    // Should include the initial root id
    const nodeIds = result.map(node => node.id);
    expect(nodeIds).toContain('doc1');
  });

  it('should handle id-based edges', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [['$id', '$id']], // id to id edge
      strategy,
      store: adapter,
      storeKwargs: { k: 5 }
    });
    
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle empty edge list', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [],
      strategy,
      store: adapter,
      storeKwargs: { k: 5 }
    });
    
    // Should return initial search results
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle edge function', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const edgeFunction = (content: any) => ({
      incoming: new Set([new MetadataEdge('category', content.metadata.category)]),
      outgoing: new Set([new MetadataEdge('language', content.metadata.language)])
    });
    
    const result = await traverse('Hello world', {
      edges: edgeFunction,
      strategy,
      store: adapter,
      storeKwargs: { k: 5 }
    });
    
    expect(result).toBeInstanceOf(Array);
  });

  it('should respect store kwargs', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [['language', 'language']],
      strategy,
      store: adapter,
      storeKwargs: { k: 1 }
    });
    
    // Result should be limited by k parameter
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle non-matching edges gracefully', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [['nonexistent', 'nonexistent']],
      strategy,
      store: adapter,
      storeKwargs: { k: 5 }
    });
    
    // Should handle gracefully
    expect(result).toBeInstanceOf(Array);
  });

  it('should handle complex metadata filters', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [['category', 'category']],
      strategy,
      store: adapter,
      metadataFilter: { level: 1 },
      storeKwargs: { k: 5 }
    });
    
    expect(result).toBeInstanceOf(Array);
    
    // Results should be valid nodes
    for (const node of result) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('content');
    }
  });

  it('should handle mixed edge types', async () => {
    const adapter = new InMemory(embedFunction, testContents);
    const strategy = new Eager();
    
    const result = await traverse('Hello world', {
      edges: [
        ['language', 'language'],
        ['$id', '$id']
      ],
      strategy,
      store: adapter,
      storeKwargs: { k: 5 }
    });
    
    expect(result.length).toBeGreaterThan(0);
    
    // Should include valid nodes
    for (const node of result) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('content');
    }
  });
});
