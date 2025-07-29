/**
 * Document shredding transformer for preparing documents for vector storage.
 */

import { Document } from '@langchain/core/documents';

export interface ShreddingConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  separator?: string;
}

/**
 * Transformer that shreds documents into smaller chunks for vector storage.
 */
export class ShreddingTransformer {
  private chunkSize: number;
  private chunkOverlap: number;
  private separator: string;

  constructor(config: ShreddingConfig = {}) {
    this.chunkSize = config.chunkSize || 1000;
    this.chunkOverlap = config.chunkOverlap || 200;
    this.separator = config.separator || '\n\n';
  }

  /**
   * Transform documents by shredding them into smaller chunks.
   */
  async transform(documents: Document[]): Promise<Document[]> {
    const shreddedDocs: Document[] = [];

    for (const doc of documents) {
      const chunks = this.shredDocument(doc);
      shreddedDocs.push(...chunks);
    }

    return shreddedDocs;
  }

  private shredDocument(doc: Document): Document[] {
    const text = doc.pageContent;
    const chunks = this.splitText(text);
    
    return chunks.map((chunk, index) => new Document({
      id: `${doc.id}_chunk_${index}`,
      pageContent: chunk,
      metadata: {
        ...doc.metadata,
        chunk_index: index,
        parent_id: doc.id,
      },
    }));
  }

  private splitText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + this.chunkSize;
      
      // If we're not at the end of the text, try to find a good break point
      if (end < text.length) {
        const separatorIndex = text.lastIndexOf(this.separator, end);
        if (separatorIndex > start) {
          end = separatorIndex + this.separator.length;
        }
      }

      chunks.push(text.slice(start, end));
      start = Math.max(start + this.chunkSize - this.chunkOverlap, end);
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }
}
