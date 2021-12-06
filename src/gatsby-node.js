import isOnline from "is-online";
import { createPluginConfig } from "./plugin-options";
import { downloadAssets } from "./download-assets";
import { createTildaPages } from "./create-tilda-pages";
import { fetchPages } from "./fetch-data";
import { OWNER, PAGE_ASSET_TYPE, PAGE_TYPE } from "./consts";
import { createPageNodeId } from "./utils";

export const createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  createTypes(`
    type TildaPageAsset implements Node {
      from: String,
      to: String
    }
    type TildaAsset implements Node {
      from: String,
      to: String,
      pageId: String,
      localFile: File,
    }
    type TildaPage implements Node {
      alias: String,
      pageId: String,
      featureimg: String!,
      descr: String!,
      date: Date,
      projectid: String,
      published: String,
      title: String,
      img: String,
      filename: String,
      html: String,
      initScripts: [String],
      js: [TildaPageAsset],
      css: [TildaPageAsset],
      images: [TildaPageAsset]
    }`);
};

export const sourceNodes = async (
  {
    actions: { createNode, touchNode, deleteNode },
    createNodeId,
    createContentDigest,
    getNodes,
    getNode,
    store,
    cache,
    reporter,
  },
  configOptions
) => {
  const online = await isOnline();

  // If the user knows they are offline, serve them cached result
  // For prod builds though always fail if we can't get the latest data
  if (!online && process.env.NODE_ENV !== "production") {
    getNodes()
      .filter((n) => n.internal.owner === OWNER)
      .forEach((n) => touchNode(n));

    console.log("Using Offline cache ⚠️");
    console.log(
      "Cache may be invalidated if you edit package.json, gatsby-node.js or gatsby-config.js files"
    );

    return;
  }
  const config = createPluginConfig(configOptions);

  // fetch tilda data
  let pages = await fetchPages(config, reporter);
  pages = pages.filter((p) => !config.exclude.find((item) => item === p.alias));

  // get new, updated and deleted pages
  const tildaPageNodes = getNodes().filter(
    (n) => n.internal.owner === OWNER && n.internal.type === PAGE_TYPE
  );

  const tildaAssetsNodes = getNodes().filter(
    (n) => n.internal.owner === OWNER && n.internal.type === PAGE_ASSET_TYPE
  );

  const deletedPageNodes = tildaPageNodes.filter(
    (n) => !pages.find((p) => p.id === n.pageId)
  );
  const deletedAssets = tildaAssetsNodes.filter((n) =>
    deletedPageNodes.find((pN) => pN.pageId === n.pageId)
  );
  const newPages = pages.filter(
    (p) => !tildaPageNodes.find((n) => p.id === n.pageId)
  );
  const updatedPages = pages.filter((p) =>
    tildaPageNodes.find((n) => p.id === n.pageId && n.published !== p.published)
  );
  const notModifiedPages = pages.filter((p) =>
    tildaPageNodes.find((n) => p.id === n.pageId && n.published === p.published)
  );

  // process deleted tilda pages and assets
  const deleteTildaNode = (node) => {
    touchNode(node);
    deleteNode(node);
  };
  deletedPageNodes.forEach(deleteTildaNode);
  deletedAssets.forEach(deleteTildaNode);

  // clear assets cache
  await Promise.all(
    deletedAssets.map(async (asset) => {
      const { id, url } = asset;
      const remoteDataCacheKey = `tilda-asset-${id}-${url}`;
      await cache.set(remoteDataCacheKey, null);
    })
  );

  console.log(`Deleted pages: ${deletedPageNodes.length}`);
  console.log(`Deleted assets: ${deletedAssets.length}`);
  console.log(
    `Created/Updated pages: ${[...newPages, ...updatedPages].length}`
  );
  console.log(`UnModified pages: ${notModifiedPages.length}`);

  // touch unmodified pages to keep from garbage collection
  notModifiedPages.forEach((p) => {
    const nodeId = createPageNodeId(createNodeId, p.id);
    const node = getNode(nodeId);
    touchNode(node);
  });

  // create all tilda pages and assets to gatsby nodes
  await createTildaPages(
    {
      actions: { createNode },
      createNodeId,
      createContentDigest,
    },
    config,
    [...newPages, ...updatedPages]
  );

  const existingNodes = getNodes().filter((n) => n.internal.owner === OWNER);
  existingNodes.forEach((n) => touchNode(n));

  // download locally all tilda assets from imported pages
  await downloadAssets({
    actions: { createNode, touchNode },
    createNodeId,
    store,
    cache,
    getNodes,
    reporter,
  });
};
