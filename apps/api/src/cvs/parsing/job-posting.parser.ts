import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { z } from 'zod';
import type { JobPosting } from '@tracker/shared';
import { unreadablePosting } from '../cv.errors.ts';

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
    /^(script|style|nav|aside|footer|button|noscript|header)$/.test(
      node.tagName,
    )
  )
    return '';
  const text = children(node).map(htmlText).join('');
  return isElement(node) &&
    /^(h[1-6]|p|div|li|br|tr|section)$/.test(node.tagName)
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

export function extractPosting(html: string, url: string): JobPosting {
  const nodes = [...elements(parse(html))];
  for (const node of nodes) {
    if (
      node.tagName !== 'script' ||
      attr(node, 'type') !== 'application/ld+json'
    )
      continue;
    try {
      const json: unknown = JSON.parse(children(node).map(htmlText).join(''));
      for (const candidate of structuredNodes(json)) {
        const result = structuredPosting.safeParse(candidate);
        if (
          !result.success ||
          ![result.data['@type']].flat().includes('JobPosting')
        )
          continue;
        const description = tidy(htmlText(parse(result.data.description)));
        if (description)
          return {
            url,
            company: (result.data.hiringOrganization?.name || '').slice(0, 200),
            title: (result.data.title || '').slice(0, 200),
            description: description.slice(0, 30_000),
          };
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }

  const main =
    nodes.find(
      (node) => node.tagName === 'main' || attr(node, 'role') === 'main',
    ) ?? nodes.find((node) => node.tagName === 'article');
  const description = main ? tidy(htmlText(main)) : '';
  if (
    description.length < 100 ||
    !/responsibilit|requirement|qualification|about the role|what you.ll do|job description/i.test(
      description,
    )
  ) {
    throw unreadablePosting();
  }
  const titleNode =
    nodes.find((node) => node.tagName === 'h1') ??
    nodes.find((node) => node.tagName === 'title');
  return {
    url,
    company: (
      attr(
        nodes.find((node) => attr(node, 'property') === 'og:site_name'),
        'content',
      ) || ''
    ).slice(0, 200),
    title: titleNode ? tidy(htmlText(titleNode)).slice(0, 200) : '',
    description: description.slice(0, 30_000),
  };
}
