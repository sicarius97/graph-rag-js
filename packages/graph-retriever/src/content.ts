/**
 * Content model representing retrieved content.
 */
export interface Content {
  /** The ID of the content */
  id: string;
  /** The content */
  content: string;
  /** The embedding of the content */
  embedding: number[];
  /** The metadata associated with the content */
  metadata: Record<string, any>;
  /** The MIME type of the content */
  mimeType: string;
}

/**
 * Create a new Content instance.
 */
export function createContent(options: {
  id: string;
  content: string;
  embedding: number[] | ((content: string) => number[]);
  metadata?: Record<string, any>;
  mimeType?: string;
}): Content {
  const { id, content, embedding, metadata = {}, mimeType = "text/plain" } = options;
  
  return {
    id,
    content,
    embedding: typeof embedding === 'function' ? embedding(content) : embedding,
    metadata,
    mimeType,
  };
}
