import type { Reporter } from 'gatsby';
import { isAxiosError } from 'axios';
import type { PluginSettings } from './plugin-options';

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
      try {
        return await pluginConfig.api.fetchPage(pageId);
      } catch (e) {
        if (attempt >= fetchRetries || !isRetryable(e)) {
          throw e;
        }
        const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
        reporter.warn(
          `Tilda Page (id: ${pageId}) request failed (${
            (e as Error).message
          }), retry ${attempt + 1}/${fetchRetries} in ${delay}ms...`
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
