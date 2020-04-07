import ProgressBar from 'progress';
import { PAGE_ASSET_TYPE, PAGE_TYPE } from './consts';
import { createPageNodeId } from './utils';

const createTildaPageAsset = async (gatsbyFunctions, asset) => {
  const {
    actions: { createNode },
    createNodeId,
    createContentDigest,
  } = gatsbyFunctions;
  const nodeId = createNodeId(`tilda-page-asset-${asset.pageId}-${asset.from}`);
  const nodeContent = JSON.stringify(asset);
  const nodeData = {
    ...asset,
    id: nodeId,
    parent: null,
    children: [],
    internal: {
      type: PAGE_ASSET_TYPE,
      content: nodeContent,
      contentDigest: createContentDigest(asset.from),
    },
  };
  createNode(nodeData);
};

const createTildaPage = async (gatsbyFunctions, page) => {
  const {
    actions: { createNode },
    createNodeId,
    createContentDigest,
  } = gatsbyFunctions;
  const nodeId = createPageNodeId(createNodeId, page.id);

  let { html } = page;
  const initScripts = html.match(/<script[\s\S]*?>[\s\S]*?<\/script>/gi) || [];
  initScripts.forEach((script) => {
    html = html.replace(script, '');
  });

  const nodeContent = JSON.stringify(page);
  const nodeData = {
    ...page,
    initScripts,
    html,
    pageId: page.id,
    id: nodeId,
    parent: null,
    children: [],
    internal: {
      type: PAGE_TYPE,
      content: nodeContent,
      contentDigest: createContentDigest(html),
    },
  };
  createNode(nodeData);
};

const processTildaPageAssets = async (gatsbyFunctions, page) => {
  await Promise.all(page.images.map(async (asset) => {
    await createTildaPageAsset(gatsbyFunctions, { ...asset, pageId: page.id });
  }));
  await Promise.all(page.css.map(async (asset) => {
    await createTildaPageAsset(gatsbyFunctions, { ...asset, pageId: page.id });
  }));
  await Promise.all(page.js.map(async (asset) => {
    await createTildaPageAsset(gatsbyFunctions, { ...asset, pageId: page.id });
  }));
};

const processTildaPage = async (gatsbyFunction, pluginConfig, pageId) => {
  const { api } = pluginConfig;
  const page = await api.fetchPage(pageId);
  await createTildaPage(gatsbyFunction, page);
  await processTildaPageAssets(gatsbyFunction, page);
};

const bar = new ProgressBar(
  'Importing Tilda pages [:bar] :current/:total :elapsed secs :percent',
  {
    total: 0,
    width: 30,
  },
);

let totalJobs = 0;

export const createTildaPages = async (gatsbyFunctions, pluginConfig, pages) => {
  const {
    actions: { createNode },
    createNodeId,
    createContentDigest,
  } = gatsbyFunctions;

  // import all pages and its assets from tilda project
  await Promise.all(pages.map(async (p) => {
    totalJobs += 1;
    bar.total = totalJobs;
    await processTildaPage(
      {
        actions: { createNode },
        createNodeId,
        createContentDigest,
      },
      pluginConfig,
      p.id,
    );
    bar.tick();
  }));
};
