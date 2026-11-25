import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { z } from 'zod';

type Node = DefaultTreeAdapterTypes.Node;
type Element = DefaultTreeAdapterTypes.Element;
const isElement = (node: Node): node is Element => 'tagName' in node;
const children = (node: Node) => ('childNodes' in node ? node.childNodes : []);
const attr = (element: Element | undefined, name: string) =>
  element?.attrs.find((item) => item.name === name)?.value;

function* elements(node: Node): Generator<Element> {
  if (isElement(node)) yield node;
  for (const child of children(node)) yield* elements(child);
}

function htmlText(node: Node): string {
  if ('value' in node) return node.value;
  if (
    isElement(node) &&
    /^(script|style|nav|aside|footer|button|noscript|template|svg)$/.test(
      node.tagName,
    )
  )
    return '';
  const text = children(node).map(htmlText).join('');
  return isElement(node) &&
    /^(title|h[1-6]|p|div|li|br|tr|section)$/.test(node.tagName)
    ? `\n${text}\n`
    : text;
}

const tidy = (text: string) =>
  text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const structuredPosting = z.object({
  '@type': z.union([z.string(), z.array(z.string())]),
  title: z.string().optional(),
  description: z.string(),
  hiringOrganization: z.object({ name: z.string() }).optional(),
});

function* structuredNodes(data: unknown): Generator<unknown> {
  if (Array.isArray(data)) {
    for (const item of data) yield* structuredNodes(item);
  } else if (data && typeof data === 'object') {
    yield data;
    if ('@graph' in data) yield* structuredNodes(data['@graph']);
  }
}

export function preparePostingSource(html: string) {
  const page = parse(html);
  let siteName = '';
  let structured = '';
  for (const node of elements(page)) {
    if (node.tagName === 'meta' && attr(node, 'property') === 'og:site_name')
      siteName ||= attr(node, 'content')?.trim().slice(0, 200) || '';
    if (
      node.tagName !== 'script' ||
      attr(node, 'type') !== 'application/ld+json'
    )
      continue;

    let data: unknown;
    try {
      data = JSON.parse(children(node).map(htmlText).join(''));
    } catch {
      continue;
    }

    for (const candidate of structuredNodes(data)) {
      const result = structuredPosting.safeParse(candidate);
      if (
        !result.success ||
        ![result.data['@type']].flat().includes('JobPosting')
      )
        continue;

      const { title, hiringOrganization, description } = result.data;
      const posting = [
        title && `Title: ${title}`,
        hiringOrganization?.name &&
          `Hiring organization: ${hiringOrganization.name}`,
        `Description:\n${tidy(htmlText(parse(description)))}`,
      ]
        .filter(Boolean)
        .join('\n');
      if (posting) structured += (structured ? '\n\n' : '') + posting;
      if (structured.length >= 32_000) break;
    }
    if (structured.length >= 32_000) break;
  }
  return {
    pageText: tidy(htmlText(page)).slice(0, 48_000),
    structured: structured.slice(0, 32_000),
    siteName,
  };
}
