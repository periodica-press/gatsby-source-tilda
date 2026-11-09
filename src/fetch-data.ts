import type { Reporter } from 'gatsby';
import { isAxiosError } from 'axios';
import type { PluginSettings } from './plugin-options';
import { describeError } from './utils';

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
const isRetryable = (e: unknown) => {
  if (!isAxiosError(e)) {
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
        reporter.error(`${prefix}\n  ${describeError(e)}`);
        throw e;
      }

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      reporter.warn(`${prefix}, retry in ${delay}ms\n  ${describeError(e)}`);
      await sleep(delay);
    }
  }
};

export const fetchPages = async ({
  pluginConfig,
  reporter,
}: FetchPagesProps) => {
  const { projectId } = pluginConfig;

  try {
    return await withRetries(
      `Tilda Pages list (projectId: ${projectId})`,
      () => pluginConfig.api.fetchProjectPages(projectId),
      { pluginConfig, reporter }
    );
  } catch (e) {
    reporter.panicOnBuild(`Fetch Tilda Pages failed`, e as Error);
    return [];
  }
};

export const fetchPageInfo = async ({
  pageId,
  pluginConfig,
  reporter,
}: FetchPageInfoProps) => {
  try {
    return await withRetries(
      `Tilda Page (id: ${pageId})`,
      () => pluginConfig.api.fetchPage(pageId),
      { pluginConfig, reporter }
    );
  } catch (e) {
    reporter.panicOnBuild(
      `Couldn't get Tilda Page (id: ${pageId}) Info`,
      e as Error
    );
    throw e;
  }
};
