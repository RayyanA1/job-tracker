import { lookup } from 'node:dns/promises';
import { request as http } from 'node:http';
import { request as https } from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { CvError, unreadablePosting } from '../cv.errors.ts';

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
            reject(unreadablePosting());
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
          reject(unreadablePosting());
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            res.destroy(unreadablePosting());
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

export async function fetchJobPosting(source: string): Promise<string> {
  const signal = AbortSignal.timeout(10_000);
  let url = new URL(source);
  for (let hop = 0; hop <= 4; hop++) {
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    ) {
      throw new CvError('invalid-input', 'Use a public HTTP or HTTPS job URL.');
    }
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (!isIP(hostname) && !hostname.includes('.'))
      throw new CvError('invalid-input', 'Use a public job URL.');
    const addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await lookup(hostname, { all: true });
    signal.throwIfAborted();
    if (
      !addresses.length ||
      addresses.some(({ address }) => !publicAddress(address))
    ) {
      throw new CvError('invalid-input', 'Use a public job URL.');
    }
    const result = await fetchPage(url, addresses[0]!.address, signal);
    if (typeof result === 'string') return result;
    url = result;
  }
  throw unreadablePosting();
}
