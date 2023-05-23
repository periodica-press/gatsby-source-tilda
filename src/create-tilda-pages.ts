import ProgressBar from "progress";
import { PAGE_ASSET_TYPE, PAGE_TYPE } from "./consts";
import { createPageNodeId } from "./utils";
import TildaApi from "./api/tilda";
import { PluginConfigProps } from "./fetch-data";

const createTildaPageAsset = async (
  gatsbyFunctions: { 
  actions: { createNode: any; }; 
  createNodeId: any; 
  createContentDigest: any; 
}, 
  asset: { 
    pageId: any; 
    from: any; 
  }) => {
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

  const node = createNode(nodeData);
  return node?.then ? node.then(() => nodeData) : nodeData;
  // return createNode(nodeData);
};

const createTildaPage = async (gatsbyFunctions: { actions: any; createNodeId: any; createContentDigest: any; }, page: { id?: any; html?: any; }) => {
  const {
    actions: { createNode },
    createNodeId,
    createContentDigest,
  } = gatsbyFunctions;
  const nodeId = createPageNodeId(createNodeId, page.id);

  let { html } = page;
  const initScripts = html.match(/<script[\s\S]*?>[\s\S]*?<\/script>/gi) || [];
  initScripts.forEach((script: any) => {
    html = html.replace(script, "");
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
  return createNode(nodeData);
};

export const createTildaPages = (
  gatsbyFunctions: { 
    actions: { createNode: any; }; 
    createNodeId: any; 
    createContentDigest: any; 
  }, 
  pluginConfig: PluginConfigProps, 
  pages: any[]) => {
  // create nodes for all tilda pages
  const progressBar = new ProgressBar(
    "Creating TildaPage Nodes [:bar] :current/:total :elapsed secs :percent",
    {
      total: pages.length,
      width: 30,
    }
  );
  const createNodePromises : any = [];
  pages.forEach((page) => {
    const node = createTildaPage(gatsbyFunctions, page);
    createNodePromises.push(node);
    progressBar.tick(0, 0);
  });

  return createNodePromises;
};

export const createTildaPageAssets = (gatsbyFunctions: { actions: { createNode: any; }; createNodeId: any; createContentDigest: any; }, assets: any[]) => {
  const progressBar = new ProgressBar(
    "Creating TildaPageAsset Nodes [:bar] :current/:total :elapsed secs :percent",
    {
      total: assets.length,
      width: 30,
    }
  );
  const createNodePromises: any = [];
  assets.forEach((asset: any) => {
    const node = createTildaPageAsset(gatsbyFunctions, asset);
    createNodePromises.push(node);
    progressBar.tick(0, 0);
  });

  return createNodePromises;
};
