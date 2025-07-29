/**
 * Basic test setup for the graph retriever
 */

import { GraphRetriever } from '../src/graph-retriever';

// Mock the dependencies since they're not available
jest.mock('@graphrag-js/graph-retriever', () => ({
  traverse: jest.fn(),
  atraverse: jest.fn(),
  Eager: jest.fn().mockImplementation(() => ({})),
  Strategy: {
    build: jest.fn().mockImplementation(({ baseStrategy, ...kwargs }) => ({
      ...baseStrategy,
      ...kwargs
    }))
  }
}));

jest.mock('@langchain/core/documents', () => ({
  Document: jest.fn().mockImplementation((data) => data)
}));

jest.mock('@langchain/core/retrievers', () => ({
  BaseRetriever: class BaseRetriever {}
}));

jest.mock('@langchain/core/vectorstores', () => ({
  VectorStore: class VectorStore {}
}));

describe('GraphRetriever', () => {
  let mockVectorStore: any;

  beforeEach(() => {
    mockVectorStore = {
      embeddings: {
        embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
      },
      similaritySearchVectorWithScore: jest.fn().mockResolvedValue([])
    };
  });

  it('should create a GraphRetriever instance', () => {
    const retriever = new GraphRetriever({
      store: mockVectorStore,
      edges: [['field1', 'field2']]
    });

    expect(retriever).toBeDefined();
    expect(retriever.store).toBe(mockVectorStore);
  });

  it('should handle extra configuration parameters', () => {
    const retriever = new GraphRetriever({
      store: mockVectorStore,
      edges: [['field1', 'field2']],
      k: 10,
      customParam: 'value'
    });

    expect(retriever.strategy).toEqual(
      expect.objectContaining({
        selectK: 10,
        customParam: 'value'
      })
    );
  });

  it('should throw error when no edges provided', async () => {
    const retriever = new GraphRetriever({
      store: mockVectorStore
    });

    await expect(
      retriever._getRelevantDocuments('test query')
    ).rejects.toThrow("'edges' must be provided");
  });
});
