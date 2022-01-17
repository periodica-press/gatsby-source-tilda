import ProgressBar from "progress";
import { PAGE_ASSET_TYPE, PAGE_TYPE } from "./consts";
import { createPageNodeId } from "./utils";

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

  const node = createNode(nodeData);
  return node?.then ? node.then(() => nodeData) : nodeData;
  // return createNode(nodeData);
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

export const createTildaPages = (gatsbyFunctions, pluginConfig, pages) => {
  // create nodes for all tilda pages
  const progressBar = new ProgressBar(
    "Creating TildaPage Nodes [:bar] :current/:total :elapsed secs :percent",
    {
      total: pages.length,
      width: 30,
    }
  );
  const createNodePromises = [];
  pages.forEach((page) => {
    const node = createTildaPage(gatsbyFunctions, page);
    createNodePromises.push(node);
    progressBar.tick();
  });

  return createNodePromises;
};

export const createTildaPageAssets = (gatsbyFunctions, assets) => {
  const progressBar = new ProgressBar(
    "Creating TildaPageAsset Nodes [:bar] :current/:total :elapsed secs :percent",
    {
      total: assets.length,
      width: 30,
    }
  );
  const createNodePromises = [];
  assets.forEach((asset) => {
    const node = createTildaPageAsset(gatsbyFunctions, asset);
    createNodePromises.push(node);
    progressBar.tick();
  });

  return createNodePromises;
};
