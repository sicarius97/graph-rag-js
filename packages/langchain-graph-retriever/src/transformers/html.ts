/**
 * HTML document transformer for cleaning and processing HTML content.
 */

import { Document } from '@langchain/core/documents';

export interface HtmlTransformerConfig {
  removeHtmlTags?: boolean;
  preserveLinks?: boolean;
  extractMetadata?: boolean;
}

/**
 * Transformer for processing HTML documents.
 */
export class HtmlTransformer {
  private removeHtmlTags: boolean;
  private preserveLinks: boolean;
  private extractMetadata: boolean;

  constructor(config: HtmlTransformerConfig = {}) {
    this.removeHtmlTags = config.removeHtmlTags ?? true;
    this.preserveLinks = config.preserveLinks ?? false;
    this.extractMetadata = config.extractMetadata ?? true;
  }

  /**
   * Transform HTML documents by cleaning and extracting relevant content.
   */
  async transform(documents: Document[]): Promise<Document[]> {
    return documents.map(doc => this.transformDocument(doc));
  }

  private transformDocument(doc: Document): Document {
    let content = doc.pageContent;
    const metadata = { ...doc.metadata };

    if (this.removeHtmlTags) {
      content = this.stripHtmlTags(content);
    }

    if (this.extractMetadata) {
      const extractedMetadata = this.extractHtmlMetadata(doc.pageContent);
      Object.assign(metadata, extractedMetadata);
    }

    return new Document({
      id: doc.id,
      pageContent: content.trim(),
      metadata,
    });
  }

  private stripHtmlTags(html: string): string {
    // Simple HTML tag removal - in a real implementation, you might use a library like cheerio
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private extractHtmlMetadata(html: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    // Extract meta description
    const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    if (descriptionMatch) {
      metadata.description = descriptionMatch[1];
    }

    // Extract meta keywords
    const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]*)"[^>]*>/i);
    if (keywordsMatch) {
      metadata.keywords = keywordsMatch[1].split(',').map(k => k.trim());
    }

    return metadata;
  }
}
