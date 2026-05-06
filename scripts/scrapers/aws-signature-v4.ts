import { createHmac, createHash } from 'node:crypto';

/** AWS credential pair for request signing */
export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

const EMPTY_PAYLOAD_HASH = createHash('sha256').update('').digest('hex');

/**
 * Minimal AWS Signature V4 request signer.
 *
 * Signs a single HTTP request using the AWS Signature V4 algorithm
 * (AWS4-HMAC-SHA256). This replaces the 50MB AWS SDK for the handful
 * of Pricing API calls the pipeline needs.
 *
 * @param method      - HTTP method (GET, POST, etc.)
 * @param url         - Full request URL including query string
 * @param credentials - AWS access key pair
 * @param region      - AWS region (default: 'us-east-1')
 * @param service     - AWS service name (default: 'pricing')
 * @returns Headers object ready to pass to fetch()
 */
export function signRequest(
  method: string,
  url: string,
  credentials: AwsCredentials,
  region: string = 'us-east-1',
  service: string = 'pricing',
): Headers {
  try {
    const parsed = new URL(url);
    const now = new Date();
    const amzDate = formatDate(now);
    const dateStamp = amzDate.slice(0, 8);

    // Canonical URI -- must be URI-encoded
    const canonicalUri = encodeUri(parsed.pathname || '/');

    // Canonical query string -- sorted by parameter name
    const canonicalQueryString = buildCanonicalQueryString(parsed.searchParams);

    // Host header
    const host = parsed.host;

    // Canonical headers and signed headers
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${EMPTY_PAYLOAD_HASH}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    // Canonical request
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      EMPTY_PAYLOAD_HASH,
    ].join('\n');

    // Credential scope
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    // String to sign
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Signing key derivation chain
    const kDate = hmac(`AWS4${credentials.secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');

    // Signature
    const signature = hmac(kSigning, stringToSign).toString('hex');

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers = new Headers();
    headers.set('Host', host);
    headers.set('X-Amz-Date', amzDate);
    headers.set('X-Amz-Content-Sha256', EMPTY_PAYLOAD_HASH);
    headers.set('Authorization', authorization);

    return headers;
  } catch {
    throw new Error('Failed to sign AWS request');
  }
}

/**
 * Formats a Date as an ISO 8601 basic timestamp (YYYYMMDDTHHmmssZ).
 */
function formatDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Builds a canonical query string from URLSearchParams, sorted by key.
 */
function buildCanonicalQueryString(params: URLSearchParams): string {
  const entries: [string, string][] = [];
  params.forEach((value, key) => {
    entries.push([key, value]);
  });
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return entries
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(v)}`,
    )
    .join('&');
}

/**
 * RFC 3986 URI encoding for path segments.
 * Encodes everything except forward slashes.
 */
function encodeUri(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Computes HMAC-SHA256 of data using key.
 * Accepts string or Buffer keys; returns Buffer for chaining.
 */
function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}
