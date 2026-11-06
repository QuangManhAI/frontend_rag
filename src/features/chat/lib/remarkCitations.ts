import { splitCitations } from './citations';

/** Minimal mdast shape this plugin touches. */
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, string> };
}

const SKIP = new Set(['inlineCode', 'code', 'inlineMath', 'math', 'link', 'linkReference']);

function walk(node: MdNode): void {
  if (!node.children) return;
  const out: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value !== undefined && /\[Paper(?:\s+ID)?:/.test(child.value)) {
      for (const part of splitCitations(child.value)) {
        if (part.kind === 'text') out.push({ type: 'text', value: part.value });
        else out.push({ type: 'citation', children: [], data: { hName: 'cite', hProperties: { dataPaperId: part.paperId } } });
      }
      continue;
    }
    if (!SKIP.has(child.type)) walk(child);
    out.push(child);
  }
  node.children = out;
}

/** Turns `[Paper: a, b]` in text nodes into <cite data-paper-id> elements (math/code untouched). */
export function remarkCitations() {
  return (tree: MdNode) => walk(tree);
}
