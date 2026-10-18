/**
 * Turns a plain Markdown blockquote into a styled pull quote so that the
 * owner never needs to write a component tag. The last line of the quote,
 * if it starts with an em dash or a double hyphen, becomes the attribution:
 *
 *   > He went past Wright like a fire engine going to the wrong fire.
 *   > — Geoffrey Green, The Times, 1953
 */
import type { Root, Blockquote, Paragraph, PhrasingContent } from 'mdast';

const CITE_RE = /^\s*(?:—|--|–)\s*(.+)$/;

export function remarkPullQuotes() {
  return (tree: Root) => {
    walk(tree);
  };
}

function walk(node: any) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children as any[]) {
    if (child.type === 'blockquote') transform(child as Blockquote);
    else walk(child);
  }
}

function transform(quote: Blockquote) {
  const paragraphs = quote.children.filter((c) => c.type === 'paragraph') as Paragraph[];
  let cite: PhrasingContent[] | null = null;

  if (paragraphs.length > 0) {
    const last = paragraphs[paragraphs.length - 1];
    // Case 1: the attribution is its own paragraph.
    const lastText = toText(last.children);
    const whole = lastText.match(CITE_RE);
    if (whole && paragraphs.length > 1) {
      cite = stripDash(last.children);
      quote.children.splice(quote.children.indexOf(last), 1);
    } else {
      // Case 2: the attribution is the final line of the final paragraph (after a soft break).
      const kids = last.children;
      for (let i = kids.length - 1; i >= 0; i--) {
        const k = kids[i];
        if (k.type === 'break') {
          const tail = kids.slice(i + 1);
          if (CITE_RE.test(toText(tail))) {
            cite = stripDash(tail);
            last.children = kids.slice(0, i);
          }
          break;
        }
        if (k.type === 'text' && k.value.includes('\n')) {
          const parts = k.value.split('\n');
          const tailText = parts[parts.length - 1];
          if (CITE_RE.test(tailText)) {
            const headText = parts.slice(0, -1).join('\n');
            const tail: PhrasingContent[] = [{ type: 'text', value: tailText }, ...kids.slice(i + 1)];
            cite = stripDash(tail);
            last.children = [...kids.slice(0, i), ...(headText ? [{ type: 'text', value: headText } as PhrasingContent] : [])];
          }
          break;
        }
      }
    }
  }

  const inner: any = {
    type: 'blockquote',
    children: quote.children,
    data: { hName: 'blockquote' },
  };
  const figureChildren: any[] = [inner];
  if (cite && cite.length) {
    figureChildren.push({
      type: 'paragraph',
      children: cite,
      data: { hName: 'figcaption' },
    });
  }
  // Mutate the original node into a <figure class="pullquote">.
  const q = quote as any;
  q.type = 'pullquote';
  q.children = figureChildren;
  q.data = { hName: 'figure', hProperties: { className: ['pullquote'] } };
}

function toText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n: any) => (n.type === 'text' ? n.value : Array.isArray(n.children) ? toText(n.children) : ''))
    .join('');
}

function stripDash(nodes: PhrasingContent[]): PhrasingContent[] {
  const out = nodes.map((n) => ({ ...n })) as PhrasingContent[];
  for (const n of out) {
    if (n.type === 'text') {
      n.value = n.value.replace(/^\s*(?:—|--|–)\s*/, '');
      break;
    }
  }
  return out;
}
