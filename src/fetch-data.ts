import type { Reporter } from 'gatsby';
import { isAxiosError } from 'axios';
import type { PluginSettings } from './plugin-options';
import { describeError, isTildaLimitError } from './utils';

export interface FetchPagesProps {
  pluginConfig: PluginSettings;
  reporter: Reporter;
}

export interface FetchPageInfoProps {
  pageId: string;
  pluginConfig: PluginSettings;
  reporter: Reporter;
}

const RETRY_BASE_DELAY_MS = 1000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// retry only transient failures: network errors, 429 and 5xx
// (not the hourly limit: it is not going to pass in a few seconds)
const isRetryable = (e: unknown) => {
  if (!isAxiosError(e) || isTildaLimitError(e)) {
    return false;
  }
  const status = e.response?.status;
  return status === undefined || status === 429 || status >= 500;
};

const withRetries = async <T>(
  label: string,
  request: () => Promise<T>,
  {
    pluginConfig,
    reporter,
  }: { pluginConfig: PluginSettings; reporter: Reporter }
): Promise<T> => {
  const { fetchRetries } = pluginConfig;

  for (let attempt = 0; ; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await request();
      reporter.info(
        `${label} ok in ${Date.now() - startedAt}ms (attempt ${attempt + 1})`
      );
      return result;
    } catch (e) {
      const elapsed = Date.now() - startedAt;
      const prefix = `${label} attempt ${attempt + 1}/${
        fetchRetries + 1
      } failed after ${elapsed}ms`;

      if (attempt >= fetchRetries || !isRetryable(e)) {
        reporter.error(
          `${prefix}${
            isTildaLimitError(e)
              ? ', Tilda API limit (150 requests per hour) is exceeded, try again in about an hour'
              : ''
          }\n  ${describeError(e)}`
        );
        throw e;
      }

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      reporter.warn(`${prefix}, retry in ${delay}ms\n  ${describeError(e)}`);
      await sleep(delay);
    }
  }
};

// errors are thrown to the caller, which decides to fail the build or use cached data
export const fetchPages = async ({
  pluginConfig,
  reporter,
}: FetchPagesProps) => {
  const { projectId } = pluginConfig;

  return withRetries(
    `Tilda Pages list (projectId: ${projectId})`,
    () => pluginConfig.api.fetchProjectPages(projectId),
    { pluginConfig, reporter }
  );
};

export const fetchPageInfo = async ({
  pageId,
  pluginConfig,
  reporter,
}: FetchPageInfoProps) =>
  withRetries(
    `Tilda Page (id: ${pageId})`,
    () => pluginConfig.api.fetchPage(pageId),
    {
      pluginConfig,
      reporter,
    }
  );
