const getTildaPages = async (pluginConfig) => {
  console.time('Fetch Tilda Pages data');
  console.log('Starting to fetch data from Tilda');

  const projectId = pluginConfig.get('projectId');
  const { api } = pluginConfig;
  const pages = await api.fetchProjectPages(projectId);
  return pages;
};

export const fetchPages = async (pluginConfig, reporter) => {
  try {
    const pages = await getTildaPages(pluginConfig);
    return pages;
  } catch (e) {
    reporter.panic(`Fetch Tilda Pages failed: ${e}`);
    return [];
  }
};
