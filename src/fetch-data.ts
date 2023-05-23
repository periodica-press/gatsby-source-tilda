import TildaApi from "./api/tilda";
import { PluginOptionsProps } from "./plugin-options";

export interface PluginConfigProps {
  get: (key: string) => any;
  api: TildaApi;
  getOriginalPluginOptions: () => PluginOptionsProps;
  exclude: any;
}

export interface FetchPagesProps {
  pluginConfig: PluginConfigProps;
  reporter: any
}

export interface FetchPageInfoProps {
  pageId: any;
  pluginConfig: PluginConfigProps;
  reporter: any;
}

export const fetchPages = async ({ pluginConfig , reporter } : FetchPagesProps) => {
  try {
    const projectId = pluginConfig.get(`projectId`);
    const pages = await pluginConfig.api.fetchProjectPages(projectId);
    return pages;
  } catch (e) {
    reporter.panicOnBuild(`Fetch Tilda Pages failed`, e);
    return [];
  }
};

export const fetchPageInfo = async ({ pageId, pluginConfig, reporter } : FetchPageInfoProps) => {
  try {
    const pageInfo = await pluginConfig.api.fetchPage(pageId);
    return pageInfo;
  } catch (e) {
    reporter.panicOnBuild(`Couldn't get Tilda Page (id: ${pageId}) Info`, e);
    throw e;
  }
};
