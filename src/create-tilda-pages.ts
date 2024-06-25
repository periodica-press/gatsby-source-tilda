import type { Actions, NodeInput, NodePluginArgs } from 'gatsby';
import ProgressBar from 'progress';
import { PAGE_ASSET_TYPE, PAGE_TYPE } from './consts';
import { createPageNodeId } from './utils';
import type { PluginSettings } from './plugin-options';
import type { TildaPageExportInfo } from './api/tilda';
import type { TildaAsset } from './types';

const createTildaPageAsset = async (
  gatsbyFunctions: {
    actions: { createNode: Actions['createNode'] };
    createNodeId: NodePluginArgs['createNodeId'];
    createContentDigest: NodePluginArgs['createContentDigest'];
  },
  asset: TildaAsset
) => {
  const {
    actions: { createNode },
    createNodeId,
    createContentDigest,
  } = gatsbyFunctions;
  const nodeId = createNodeId(`tilda-page-asset-${asset.pageId}-${asset.from}`);
  const nodeContent = JSON.stringify(asset);
  const nodeData: NodeInput = {
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

  await createNode(nodeData);
  return nodeData;
};

const createTildaPage = async (
  gatsbyFunctions: {
    actions: { createNode: Actions['createNode'] };
    createNodeId: NodePluginArgs['createNodeId'];
    createContentDigest: NodePluginArgs['createContentDigest'];
  },
  page: TildaPageExportInfo
) => {
  const {
    actions: { createNode },
    createNodeId,
    createContentDigest,
  } = gatsbyFunctions;
  const nodeId = createPageNodeId(createNodeId, page.id);

  let { html } = page;
  const initScripts = html.match(/<script[\s\S]*?>[\s\S]*?<\/script>/gi) || [];
  initScripts.forEach((script: string) => {
    html = html.replace(script, '');
  });

  const nodeContent = JSON.stringify(page);
  const nodeData: NodeInput = {
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
  return createNode(nodeData);
};

export const createTildaPages = (
  gatsbyFunctions: {
    actions: { createNode: Actions['createNode'] };
    createNodeId: NodePluginArgs['createNodeId'];
    createContentDigest: NodePluginArgs['createContentDigest'];
  },
  pluginConfig: PluginSettings,
  pages: TildaPageExportInfo[]
) => {
  // create nodes for all tilda pages
  const progressBar = new ProgressBar(
    'Creating TildaPage Nodes [:bar] :current/:total :elapsed secs :percent',
    {
      total: pages.length,
      width: 30,
    }
  );
  const createNodePromises: Promise<void>[] = [];
  pages.forEach((page) => {
    const node = createTildaPage(gatsbyFunctions, page);
    createNodePromises.push(node);
    progressBar.tick(0, 0);
  });

  return createNodePromises;
};

export const createTildaPageAssets = (
  gatsbyFunctions: {
    actions: { createNode: Actions['createNode'] };
    createNodeId: NodePluginArgs['createNodeId'];
    createContentDigest: NodePluginArgs['createContentDigest'];
  },
  assets: TildaAsset[]
) => {
  const progressBar = new ProgressBar(
    'Creating TildaPageAsset Nodes [:bar] :current/:total :elapsed secs :percent',
    {
      total: assets.length,
      width: 30,
    }
  );
  const createNodePromises: Promise<NodeInput>[] = [];
  assets.forEach((asset) => {
    const node = createTildaPageAsset(gatsbyFunctions, asset);
    createNodePromises.push(node);
    progressBar.tick(0, 0);
  });

  return createNodePromises;
};
