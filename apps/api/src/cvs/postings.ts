import { lookup } from 'node:dns/promises';
import { request as http } from 'node:http';
import { request as https } from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { z } from 'zod';
import type { JobPosting } from '@tracker/shared';
import { CvError } from './profile.ts';

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
    throw unreadable();
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

const unreadable = () =>
  new CvError(
    422,
    'Could not read this posting. Paste the job description to continue.',
  );

export function publicAddress(address: string) {
  const ip = ipaddr.process(address);
  return (
    ip.range() === 'unicast' &&
    (ip instanceof ipaddr.IPv4 || ip.match(ipaddr.IPv6.parse('2000::'), 3))
  );
}

function fetchPage(
  url: URL,
  address: string,
  signal: AbortSignal,
): Promise<string | URL> {
  return new Promise((resolve, reject) => {
    const request = url.protocol === 'https:' ? https : http;
    const family = isIP(address);
    const req = request(
      url,
      {
        agent: false,
        family,
        signal,
        lookup: (_host, _options, callback) => callback(null, address, family),
        headers: { Accept: 'text/html,application/xhtml+xml' },
      },
      (res) => {
        res.on('error', reject);
        const status = res.statusCode ?? 0;
        if (
          [301, 302, 303, 307, 308].includes(status) &&
          res.headers.location
        ) {
          res.resume();
          try {
            resolve(new URL(res.headers.location, url));
          } catch {
            reject(unreadable());
          }
          return;
        }
        if (
          status !== 200 ||
          !/^text\/html\b|^application\/xhtml\+xml\b/i.test(
            res.headers['content-type'] || '',
          )
        ) {
          res.destroy();
          reject(unreadable());
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            res.destroy(unreadable());
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      },
    );
    req.on('error', reject);
  });
}

export async function importPosting(source: string): Promise<JobPosting> {
  const signal = AbortSignal.timeout(10_000);
  try {
    let url = new URL(source);
    for (let hop = 0; hop <= 4; hop++) {
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.port
      ) {
        throw new CvError(400, 'Use a public HTTP or HTTPS job URL.');
      }
      const hostname = url.hostname.replace(/^\[|\]$/g, '');
      if (!isIP(hostname) && !hostname.includes('.'))
        throw new CvError(400, 'Use a public job URL.');
      const addresses = isIP(hostname)
        ? [{ address: hostname }]
        : await lookup(hostname, { all: true });
      signal.throwIfAborted();
      if (
        !addresses.length ||
        addresses.some(({ address }) => !publicAddress(address))
      ) {
        throw new CvError(400, 'Use a public job URL.');
      }
      const result = await fetchPage(url, addresses[0]!.address, signal);
      if (typeof result === 'string') return extractPosting(result, source);
      url = result;
    }
  } catch (error) {
    if (error instanceof CvError) throw error;
  }
  throw unreadable();
}
