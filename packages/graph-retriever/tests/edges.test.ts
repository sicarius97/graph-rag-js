import { describe, it, expect } from 'vitest';
import { MetadataEdge, IdEdge } from '../src/edges/index.js';

describe('Edges', () => {
  describe('MetadataEdge', () => {
    it('should create a metadata edge', () => {
      const edge = new MetadataEdge('category', 'greeting');
      
      expect(edge.type).toBe('metadata');
      expect(edge.incomingField).toBe('category');
      expect(edge.value).toBe('greeting');
    });

    it('should compare metadata edges correctly', () => {
      const edge1 = new MetadataEdge('category', 'greeting');
      const edge2 = new MetadataEdge('category', 'greeting');
      const edge3 = new MetadataEdge('category', 'farewell');
      const edge4 = new MetadataEdge('language', 'greeting');
      
      expect(edge1.equals(edge2)).toBe(true);
      expect(edge1.equals(edge3)).toBe(false);
      expect(edge1.equals(edge4)).toBe(false);
    });

    it('should not equal non-metadata edges', () => {
      const metadataEdge = new MetadataEdge('category', 'greeting');
      const idEdge = new IdEdge('doc1');
      
      expect(metadataEdge.equals(idEdge)).toBe(false);
    });

    it('should handle complex values', () => {
      const edge1 = new MetadataEdge('score', 0.5);
      const edge2 = new MetadataEdge('score', 0.5);
      const edge3 = new MetadataEdge('score', 0.6);
      
      expect(edge1.equals(edge2)).toBe(true);
      expect(edge1.equals(edge3)).toBe(false);
    });

    it('should handle null values', () => {
      const edge1 = new MetadataEdge('optional', null);
      const edge2 = new MetadataEdge('optional', null);
      const edge3 = new MetadataEdge('optional', 'value');
      
      expect(edge1.equals(edge2)).toBe(true);
      expect(edge1.equals(edge3)).toBe(false);
    });
  });

  describe('IdEdge', () => {
    it('should create an id edge', () => {
      const edge = new IdEdge('doc1');
      
      expect(edge.type).toBe('id');
      expect(edge.id).toBe('doc1');
    });

    it('should compare id edges correctly', () => {
      const edge1 = new IdEdge('doc1');
      const edge2 = new IdEdge('doc1');
      const edge3 = new IdEdge('doc2');
      
      expect(edge1.equals(edge2)).toBe(true);
      expect(edge1.equals(edge3)).toBe(false);
    });

    it('should not equal non-id edges', () => {
      const idEdge = new IdEdge('doc1');
      const metadataEdge = new MetadataEdge('category', 'greeting');
      
      expect(idEdge.equals(metadataEdge)).toBe(false);
    });

    it('should handle numeric ids', () => {
      const edge1 = new IdEdge('123');
      const edge2 = new IdEdge('123');
      const edge3 = new IdEdge('456');
      
      expect(edge1.equals(edge2)).toBe(true);
      expect(edge1.equals(edge3)).toBe(false);
    });
  });

  describe('Edge Sets', () => {
    it('should work correctly in Sets', () => {
      const edge1 = new MetadataEdge('category', 'greeting');
      const edge2 = new MetadataEdge('category', 'greeting');
      const edge3 = new IdEdge('doc1');
      
      const edgeSet = new Set([edge1, edge2, edge3]);
      
      // Should only have 2 unique edges (edge1 and edge2 are equal but Sets use reference equality)
      expect(edgeSet.size).toBe(3);
      
      // Manual deduplication using equals
      const uniqueEdges = [edge1, edge2, edge3].filter((edge, index, arr) => 
        arr.findIndex(e => e.equals(edge)) === index
      );
      
      expect(uniqueEdges).toHaveLength(2);
    });

    it('should handle mixed edge types in collections', () => {
      const edges = [
        new MetadataEdge('category', 'greeting'),
        new IdEdge('doc1'),
        new MetadataEdge('language', 'en'),
        new IdEdge('doc2'),
        new MetadataEdge('category', 'greeting'), // duplicate
      ];
      
      const uniqueEdges = edges.filter((edge, index, arr) => 
        arr.findIndex(e => e.equals(edge)) === index
      );
      
      expect(uniqueEdges).toHaveLength(4);
    });
  });
});
