/**
 * Wraps the "What it tells us" heading and everything after it in a tinted
 * block, so the close of every story looks the same without any markup in
 * the story file.
 */
import type { Root, Element, ElementContent } from 'hast';

const HEADING_RE = /^\s*what it tells us\s*$/i;

function text(node: any): string {
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(text).join('');
  return '';
}

export function rehypeTellsUs() {
  return (tree: Root) => {
    const kids = tree.children;
    const idx = kids.findIndex(
      (n) => n.type === 'element' && /^h[2-4]$/.test((n as Element).tagName) && HEADING_RE.test(text(n)),
    );
    if (idx === -1) return;
    const wrapped = kids.slice(idx) as ElementContent[];
    const wrapper: Element = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['tells-us'] },
      children: wrapped,
    };
    tree.children = [...kids.slice(0, idx), wrapper];
  };
}
