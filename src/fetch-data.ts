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

export const fetchPages = async ({
  pluginConfig,
  reporter,
}: FetchPagesProps) => {
  try {
    const { projectId } = pluginConfig;
    const pages = await pluginConfig.api.fetchProjectPages(projectId);
    return pages;
  } catch (e) {
    reporter.panicOnBuild(`Fetch Tilda Pages failed`, e as Error);
    return [];
  }
};

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

export const fetchPageInfo = async ({
  pageId,
  pluginConfig,
  reporter,
}: FetchPageInfoProps) => {
  const { fetchRetries } = pluginConfig;

  try {
    for (let attempt = 0; ; attempt += 1) {
      const startedAt = Date.now();
      try {
        return await pluginConfig.api.fetchPage(pageId);
      } catch (e) {
        const elapsed = Date.now() - startedAt;
        if (attempt >= fetchRetries || !isRetryable(e)) {
          reporter.error(
            `Tilda Page (id: ${pageId}) attempt ${attempt + 1}/${
              fetchRetries + 1
            } failed after ${elapsed}ms\n  ${describeError(e)}`
          );
          throw e;
        }
        const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
        reporter.warn(
          `Tilda Page (id: ${pageId}) attempt ${attempt + 1}/${
            fetchRetries + 1
          } failed after ${elapsed}ms, retry in ${delay}ms\n  ${describeError(
            e
          )}`
        );
        await sleep(delay);
      }
    }
  } catch (e) {
    reporter.panicOnBuild(
      `Couldn't get Tilda Page (id: ${pageId}) Info`,
      e as Error
    );
    throw e;
  }
};
