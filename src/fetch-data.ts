import type { Reporter } from 'gatsby';
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

export const fetchPageInfo = async ({
  pageId,
  pluginConfig,
  reporter,
}: FetchPageInfoProps) => {
  try {
    const pageInfo = await pluginConfig.api.fetchPage(pageId);
    return pageInfo;
  } catch (e) {
    reporter.panicOnBuild(
      `Couldn't get Tilda Page (id: ${pageId}) Info`,
      e as Error
    );
    throw e;
  }
};
