/**
 * Tests for conversion utilities
 */

import { nodeToDoc, docToContent, METADATA_EMBEDDING_KEY } from '../src/conversion';
import { Edge } from '@graphrag-js/graph-retriever';

// Mock the dependencies
jest.mock('@langchain/core/documents', () => ({
  Document: jest.fn().mockImplementation((data) => data)
}));

describe('Conversion utilities', () => {
  describe('nodeToDoc', () => {
    it('should convert node to document', () => {
      const node = {
        id: 'test-id',
        content: 'test content',
        depth: 0,
        similarityScore: 0.8,
        embedding: [0.1, 0.2, 0.3],
        metadata: { key: 'value' },
        incomingEdges: new Set<Edge>(),
        outgoingEdges: new Set<Edge>(),
        extraMetadata: { extra: 'data' }
      };

      const doc = nodeToDoc(node);

      expect(doc.id).toBe('test-id');
      expect(doc.pageContent).toBe('test content');
      expect(doc.metadata).toEqual({
        key: 'value',
        extra: 'data'
      });
    });
  });

  describe('docToContent', () => {
    it('should convert document to content with embedding parameter', () => {
      const doc = {
        id: 'test-id',
        pageContent: 'test content',
        metadata: { key: 'value' }
      };
      const embedding = [0.1, 0.2, 0.3];

      const content = docToContent(doc, { embedding });

      expect(content.id).toBe('test-id');
      expect(content.content).toBe('test content');
      expect(content.embedding).toEqual(embedding);
      expect(content.metadata).toEqual({ key: 'value' });
    });

    it('should convert document to content with embedding in metadata', () => {
      const embedding = [0.1, 0.2, 0.3];
      const doc = {
        id: 'test-id',
        pageContent: 'test content',
        metadata: { 
          key: 'value',
          [METADATA_EMBEDDING_KEY]: embedding
        }
      };

      const content = docToContent(doc);

      expect(content.embedding).toEqual(embedding);
      expect(content.metadata).toEqual({ key: 'value' });
    });

    it('should throw error when document has no id', () => {
      const doc = {
        pageContent: 'test content',
        metadata: {}
      };

      expect(() => docToContent(doc)).toThrow('Document must have an id');
    });

    it('should throw error when no embedding provided', () => {
      const doc = {
        id: 'test-id',
        pageContent: 'test content',
        metadata: {}
      };

      expect(() => docToContent(doc)).toThrow('Embedding must be provided');
    });
  });
});
