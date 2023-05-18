export const fetchPages = async ({ pluginConfig, reporter }) => {
  try {
    const projectId = pluginConfig.get(`projectId`);
    const pages = await pluginConfig.api.fetchProjectPages(projectId);
    return pages;
  } catch (e) {
    reporter.panicOnBuild(`Fetch Tilda Pages failed`, e);
    return [];
  }
};

export const fetchPageInfo = async ({ pageId, pluginConfig, reporter }) => {
  try {
    const pageInfo = await pluginConfig.api.fetchPage(pageId);
    return pageInfo;
  } catch (e) {
    reporter.panicOnBuild(`Couldn't get Tilda Page (id: ${pageId}) Info`, e);
    throw e;
  }
};
