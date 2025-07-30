/**
 * Tests for document graph utilities
 */

import { createGraph, groupByCommunity } from '../src/document-graph';

// Mock the dependencies
jest.mock('@langchain/core/documents', () => ({
  Document: jest.fn().mockImplementation((data) => data)
}));

jest.mock('@sicarius97/graph-retriever', () => ({
  MetadataEdgeFunction: jest.fn().mockImplementation((edges) => {
    return jest.fn().mockReturnValue({
      incoming: [],
      outgoing: []
    });
  })
}));

describe('Document Graph', () => {
  const mockDocuments = [
    {
      id: 'doc1',
      pageContent: 'Content 1',
      metadata: { category: 'A', keywords: ['test'] }
    },
    {
      id: 'doc2', 
      pageContent: 'Content 2',
      metadata: { category: 'B', keywords: ['test'] }
    }
  ];

  it('should create a graph from documents', () => {
    const edges: [string, string][] = [['category', 'category']];
    const graph = createGraph(mockDocuments, edges);

    expect(graph).toBeDefined();
    expect(graph.getNodes().length).toBe(2);
  });

  it('should group documents by community', () => {
    const edges: [string, string][] = [['category', 'category']];
    const graph = createGraph(mockDocuments, edges);
    const communities = groupByCommunity(graph);

    expect(communities).toBeDefined();
    expect(Array.isArray(communities)).toBe(true);
  });

  it('should throw error for documents without id', () => {
    const invalidDocs = [{ pageContent: 'test', metadata: {} }];
    const edges: [string, string][] = [['category', 'category']];

    expect(() => createGraph(invalidDocs, edges))
      .toThrow('Document must have an id');
  });
});
