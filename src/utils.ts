import { isAxiosError } from 'axios';

export const createPageNodeId = (
  createNodeId: (arg0: string) => string,
  pageId: string
) => createNodeId(`tilda-page-${pageId}`);

const SENSITIVE_PARAMS = ['publickey', 'secretkey'];
const BODY_LIMIT = 500;
const LOGGED_HEADERS = new RegExp(
  '^(retry-after|content-type|content-length|server|date|via|cf-ray|x-request-id|x-ratelimit-.*)$'
);

const truncate = (text: string) =>
  text.length > BODY_LIMIT ? `${text.slice(0, BODY_LIMIT)}…` : text;

// human-readable error details for build logs, never includes api keys
export const describeError = (e: unknown): string => {
  if (!isAxiosError(e)) {
    return e instanceof Error ? e.message : String(e);
  }

  const { config, response, code, message } = e;
  const params = Object.entries(config?.params ?? {})
    .filter(([key]) => !SENSITIVE_PARAMS.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const lines = [
    message,
    `request: ${config?.method?.toUpperCase()} ${`${config?.baseURL ?? ''}/${
      config?.url ?? ''
    }`.replace(/([^:])\/{2,}/g, '$1/')}${params && `?${params}`}`,
  ];

  if (code) {
    lines.push(`code: ${code}`);
  }

  if (response) {
    lines.push(`status: ${response.status} ${response.statusText}`);
    const headers = Object.entries(response.headers ?? {})
      .filter(([name]) => LOGGED_HEADERS.test(name))
      .map(([name, value]) => `${name}=${value}`);
    if (headers.length) {
      lines.push(`headers: ${headers.join(', ')}`);
    }
    const body =
      typeof response.data === 'string'
        ? response.data
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : JSON.stringify(response.data);
    if (body) {
      lines.push(`body: ${truncate(body)}`);
    }
  } else {
    lines.push('no response received (network error or timeout)');
  }

  return lines.join('\n  ');
};
