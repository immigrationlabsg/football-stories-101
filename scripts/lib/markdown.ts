/**
 * Turns a story's MDX body into plain Markdown for email and social captions.
 * Handles the three components the site provides (PullQuote, Timeline,
 * Figure) and strips anything else that looks like JSX.
 */

export function mdxToMarkdown(body: string, opts: { absoluteUrl: (p: string) => string }): string {
  let md = body.replace(/^import\s.+$/gm, '').trim();

  // <PullQuote cite="X">text</PullQuote>
  md = md.replace(/<PullQuote(?:\s+cite=["']([^"']*)["'])?\s*>([\s\S]*?)<\/PullQuote>/g, (_m, cite, text) => {
    const lines = String(text).trim().split('\n').map((l: string) => `> ${l.trim()}`);
    if (cite) lines.push(`> — ${cite}`);
    return `\n${lines.join('\n')}\n`;
  });

  // <Timeline title="T" items={[ { when: '…', what: '…' }, … ]} />
  md = md.replace(/<Timeline([\s\S]*?)\/>/g, (_m, attrs) => {
    const title = /title=["']([^"']*)["']/.exec(attrs)?.[1];
    const items: string[] = [];
    const re = /when:\s*(['"])((?:\\.|(?!\1).)*)\1\s*,\s*what:\s*(['"])((?:\\.|(?!\3).)*)\3/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(attrs))) items.push(`- **${unescape(m[2])}**: ${unescape(m[4])}`);
    return `\n${title ? `**${title}**\n\n` : ''}${items.join('\n')}\n`;
  });

  // <Figure src alt caption credit />
  md = md.replace(/<Figure([\s\S]*?)\/>/g, (_m, attrs) => {
    const get = (k: string) => new RegExp(`${k}=["']([^"']*)["']`).exec(attrs)?.[1] ?? '';
    const cap = [get('caption'), get('credit')].filter(Boolean).join(' · ');
    return `\n![${get('alt')}](${opts.absoluteUrl(get('src'))})\n${cap ? `\n*${cap}*\n` : ''}`;
  });

  // Any other JSX tag: drop the tag, keep the inner text.
  md = md.replace(/<\/?[A-Z][A-Za-z0-9]*[^>]*>/g, '');
  // Root-relative links to absolute
  md = md.replace(/\]\(\/(?!\/)/g, `](${opts.absoluteUrl('/')}`.replace(/\/$/, '/'));
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function unescape(s: string): string {
  return s.replace(/\\(['"])/g, '$1');
}

/** Markdown to plain text, good enough for captions. */
export function markdownToText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The paragraphs under "What it tells us" (the close), as plain text. */
export function extractClose(md: string): string {
  const m = /^#{2,4}\s*what it tells us\s*$/im.exec(md);
  if (!m) return '';
  const after = md.slice(m.index + m[0].length);
  const nextHeading = after.search(/^#{1,6}\s/m);
  return markdownToText(nextHeading === -1 ? after : after.slice(0, nextHeading));
}

/** First paragraph of the body, plain text. */
export function firstParagraph(md: string): string {
  const paras = markdownToText(md).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paras[0] ?? '';
}
