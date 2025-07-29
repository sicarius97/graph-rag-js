/**
 * Parent document transformer for maintaining hierarchical relationships.
 */

import { Document } from '@langchain/core/documents';

export interface ParentTransformerConfig {
  parentIdField?: string;
  childrenIdsField?: string;
  preserveHierarchy?: boolean;
}

/**
 * Transformer for handling parent-child document relationships.
 */
export class ParentTransformer {
  private parentIdField: string;
  private childrenIdsField: string;
  private preserveHierarchy: boolean;

  constructor(config: ParentTransformerConfig = {}) {
    this.parentIdField = config.parentIdField || 'parent_id';
    this.childrenIdsField = config.childrenIdsField || 'children_ids';
    this.preserveHierarchy = config.preserveHierarchy ?? true;
  }

  /**
   * Transform documents to establish parent-child relationships.
   */
  async transform(documents: Document[]): Promise<Document[]> {
    if (!this.preserveHierarchy) {
      return documents;
    }

    const documentMap = new Map<string, Document>();
    const childrenMap = new Map<string, string[]>();

    // First pass: index all documents and build children map
    for (const doc of documents) {
      if (doc.id) {
        documentMap.set(doc.id, doc);
        
        const parentId = doc.metadata[this.parentIdField];
        if (parentId) {
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }
          childrenMap.get(parentId)!.push(doc.id);
        }
      }
    }

    // Second pass: update documents with children information
    const transformedDocs: Document[] = [];
    for (const doc of documents) {
      const children = doc.id ? childrenMap.get(doc.id) || [] : [];
      
      transformedDocs.push(new Document({
        id: doc.id,
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          [this.childrenIdsField]: children,
        },
      }));
    }

    return transformedDocs;
  }

  /**
   * Get all descendants of a document (recursive).
   */
  getDescendants(
    documentId: string, 
    documents: Document[]
  ): Document[] {
    const descendants: Document[] = [];
    const documentMap = new Map<string, Document>();
    
    for (const doc of documents) {
      if (doc.id) {
        documentMap.set(doc.id, doc);
      }
    }

    const visited = new Set<string>();
    const toVisit = [documentId];

    while (toVisit.length > 0) {
      const currentId = toVisit.pop()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      const doc = documentMap.get(currentId);
      
      if (doc) {
        const children = doc.metadata[this.childrenIdsField] || [];
        for (const childId of children) {
          if (!visited.has(childId)) {
            toVisit.push(childId);
            const childDoc = documentMap.get(childId);
            if (childDoc) {
              descendants.push(childDoc);
            }
          }
        }
      }
    }

    return descendants;
  }
}
