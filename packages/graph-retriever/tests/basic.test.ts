import { describe, it, expect } from 'vitest';
import { createContent } from '../src/content.js';
import { InMemory } from '../src/adapters/inMemory.js';
import { Eager } from '../src/strategies/eager.js';
import { traverse } from '../src/traversal.js';

describe('Graph Retriever', () => {
  it('should create content', () => {
    const content = createContent({
      id: 'test-1',
      content: 'This is test content',
      embedding: [0.1, 0.2, 0.3],
      metadata: { category: 'test' }
    });

    expect(content).toEqual({
      id: 'test-1',
      content: 'This is test content',
      embedding: [0.1, 0.2, 0.3],
      metadata: { category: 'test' },
      mimeType: 'text/plain'
    });
  });

  it('should work with in-memory adapter', async () => {
    const contents = [
      createContent({
        id: 'doc1',
        content: 'Hello world',
        embedding: [1, 0, 0]
      }),
      createContent({
        id: 'doc2',
        content: 'Goodbye world',
        embedding: [0, 1, 0]
      })
    ];

    const embedFunction = (text: string) => [0.5, 0.5, 0];
    const adapter = new InMemory(embedFunction, contents);

    const result = await adapter.search([1, 0, 0], { k: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('doc1');
  });

  it('should perform basic traversal', async () => {
    const contents = [
      createContent({
        id: 'doc1',
        content: 'Hello world',
        embedding: [1, 0, 0],
        metadata: { type: 'greeting' }
      })
    ];

    const embedFunction = (text: string) => [1, 0, 0];
    const adapter = new InMemory(embedFunction, contents);
    const strategy = new Eager({ selectK: 5 });

    const nodes = await traverse('test query', {
      edges: [],
      strategy,
      store: adapter
    });

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('doc1');
  });
});
