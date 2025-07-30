import { Content, Node } from '@sicarius97/graph-retriever';
import { Document } from '@langchain/core/documents';

export const METADATA_EMBEDDING_KEY = "__embedding";

export function nodeToDoc(node: Node): Document {
  return new Document({
    id: node.id,
    pageContent: node.content,
    metadata: { ...node.extraMetadata, ...node.metadata },
  });
}

export function docToContent(
  doc: Document,
  options: { embedding?: number[] } = {}
): Content {
  const { embedding } = options;
  
  if (!doc.id) {
    throw new Error("Document must have an id");
  }

  let docEmbedding = embedding;
  if (!docEmbedding) {
    docEmbedding = doc.metadata[METADATA_EMBEDDING_KEY];
    delete doc.metadata[METADATA_EMBEDDING_KEY];
  }
  
  if (!docEmbedding) {
    throw new Error("Embedding must be provided either as parameter or in metadata");
  }

  return {
    id: doc.id,
    content: doc.pageContent,
    embedding: docEmbedding,
    metadata: doc.metadata,
    mimeType: "text/plain",
  };
}
