import type { Content } from '../content.js';
import { Edge, Edges, IdEdge, MetadataEdge } from './base.js';

const BASIC_TYPES = ['string', 'boolean', 'number', 'bigint'];
const ID_MAGIC_STRING = '$id';

/**
 * Place-holder class indicating that the ID should be used.
 * @deprecated Use "$id" instead.
 */
export class Id {}

/**
 * The definition of an edge for traversal, represented as a pair of fields
 * representing the source and target of the edge. Each may be:
 * - A string, `key`, indicating `doc.metadata[key]` as the value.
 * - The magic string `"$id"`, indicating `doc.id` as the value.
 * 
 * Examples:
 * - url_to_href_edge = ["url", "href"]
 * - keywords_to_keywords_edge = ["keywords", "keywords"]
 * - mentions_to_id_edge = ["mentions", "$id"]
 * - id_to_mentions_edge = ["$id", "mentions"]
 */
export type EdgeSpec = [string | Id, string | Id];

/**
 * Get nested value from metadata using dot notation.
 */
function nestedGet(metadata: Record<string, any>, key: string): any {
  let value = metadata;
  const keyParts = key.split('.');
  
  for (const keyPart of keyParts) {
    if (value && typeof value === 'object' && keyPart in value) {
      value = value[keyPart];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Helper for extracting and encoding edges in metadata.
 * 
 * This class provides tools to extract incoming and outgoing edges from
 * document metadata. Both incoming and outgoing edges use the same target
 * name, enabling equality matching for keys.
 */
export class MetadataEdgeFunction {
  constructor(private edges: EdgeSpec[]) {
    // Validate edge definitions
    for (const [source, target] of edges) {
      if (typeof source !== 'string' && !(source instanceof Id)) {
        throw new Error(`Expected 'string | Id' but got: ${source}`);
      }
      if (typeof target !== 'string' && !(target instanceof Id)) {
        throw new Error(`Expected 'string | Id' but got: ${target}`);
      }
    }
  }

  /**
   * Extract edges from the metadata based on declared edge definitions.
   */
  private edgesFromDict(
    id: string,
    metadata: Record<string, any>,
    options: { incoming?: boolean } = {}
  ): Set<Edge> {
    const { incoming = false } = options;
    const edges = new Set<Edge>();

    for (let [sourceKey, targetKey] of this.edges) {
      if (incoming) {
        sourceKey = targetKey;
      }

      const mkEdge = (targetKey === ID_MAGIC_STRING || targetKey instanceof Id)
        ? (v: any) => new IdEdge(String(v))
        : (v: any) => new MetadataEdge(typeof targetKey === 'string' ? targetKey : '$id', v);

      if (sourceKey === ID_MAGIC_STRING || sourceKey instanceof Id) {
        edges.add(mkEdge(id));
      } else if (typeof sourceKey === 'string') {
        const value = nestedGet(metadata, sourceKey);
        
        if (value !== undefined && BASIC_TYPES.includes(typeof value)) {
          edges.add(mkEdge(value));
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (BASIC_TYPES.includes(typeof item)) {
              edges.add(mkEdge(item));
            } else {
              console.warn(`Unsupported item value ${item} in '${sourceKey}'`);
            }
          }
        } else if (value !== undefined) {
          console.warn(`Unsupported value ${value} in '${sourceKey}'`);
        }
      }
    }

    return edges;
  }

  /**
   * Extract incoming and outgoing edges for a piece of content.
   */
  call(content: Content): Edges {
    const outgoingEdges = this.edgesFromDict(content.id, content.metadata);
    const incomingEdges = this.edgesFromDict(content.id, content.metadata, { incoming: true });

    return {
      incoming: incomingEdges,
      outgoing: outgoingEdges,
    };
  }
}
