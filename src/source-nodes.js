import isOnline from "is-online";
import { createPluginConfig } from "./plugin-options";
import { downloadTildaAssets } from "./download-assets";
import { createTildaPageAssets, createTildaPages } from "./create-tilda-pages";
import { fetchPages, fetchPageInfo } from "./fetch-data";
import { OWNER, PAGE_ASSET_TYPE, PAGE_TYPE } from "./consts";

export const sourceNodes = async (
  {
    actions: { createNode, createNodeField, touchNode, deleteNode },
    createNodeId,
    createContentDigest,
    getNode,
    getNodes,
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
      .forEach((n) => touchNode({ nodeId: n.id }));

    console.log("Using Offline cache ⚠️");
    console.log(
      "Cache may be invalidated if you edit package.json, gatsby-node.js or gatsby-config.js files"
    );

    return;
  }
  const config = createPluginConfig(configOptions);

  if (config.get('skip')) {
    reporter.info(
      `Skip tilda sync...`
    );

    return;
  }

  // fetch tilda data
  reporter.info(
    `Fetch Tilda Pages for projectId: ${config.get(`projectId`)}...`
  );
  let pages = await fetchPages({ pluginConfig: config, reporter });
  pages = pages.filter((p) => !config.exclude.find((item) => item === p.alias));

  reporter.info(`Fetch Tilda Pages info...`);
  const pagesInfo = await Promise.all(
    pages.map((p) => {
      reporter.info(`Fetching '${p.alias}' – '${p.title}' info...`);
      return fetchPageInfo({
        pageId: p.id,
        pluginConfig: config,
        reporter,
      });
    })
  );

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

  const notModifiedPgs = tildaPageNodes.filter((n) =>
    pages.find((p) => p.id === n.pageId && n.published === p.published)
  );

  // process deleted tilda pages and assets
  const deleteTildaNode = (node) => {
    touchNode(node);
    deleteNode({ node });
  };
  deletedPageNodes.forEach(deleteTildaNode);
  deletedAssets.forEach(deleteTildaNode);

  // clear deleted assets from cache
  await Promise.all(
    deletedAssets.map(async (asset) => {
      const { id, url } = asset;
      const remoteDataCacheKey = `tilda-asset-${id}-${url}`;
      await cache.set(remoteDataCacheKey, null);
    })
  );

  reporter.info(`Total TildaPages: ${tildaPageNodes.length}`);
  reporter.info(
    `Created/Updated pages: ${[...newPages, ...updatedPages].length}`
  );
  reporter.info(`UnModified pages: ${notModifiedPgs.length}`);
  reporter.info(`Deleted pages: ${deletedPageNodes.length}`);
  reporter.info(`Total TildaAssets: ${tildaAssetsNodes.length}`);
  reporter.info(`Deleted assets: ${deletedAssets.length}`);

  // touch unmodified pages to keep from garbage collection
  notModifiedPgs.forEach((pageNode) => {
    touchNode(pageNode);
  });

  // create nodes for all tilda pages
  const tildaPagesNodes = [];
  tildaPagesNodes.push(
    ...(await Promise.all(
      createTildaPages(
        {
          actions: { createNode },
          createNodeId,
          createContentDigest,
        },
        config,
        pagesInfo
      )
    ))
  );

  // create nodes for all tilda assets
  let tildaAssets = [];
  pagesInfo.forEach((pageInfo) => {
    tildaAssets = tildaAssets.concat(
      [...pageInfo.css, ...pageInfo.js, ...pageInfo.images].map((item) => ({
        ...item,
        pageId: pageInfo.id,
      }))
    );
  });

  const tildaAssetNodes = [];
  tildaAssetNodes.push(
    ...(await Promise.all(
      createTildaPageAssets(
        {
          actions: { createNode },
          createNodeId,
          createContentDigest,
        },
        tildaAssets
      )
    ))
  );

  //   const existingNodes = getNodes().filter((n) => n.internal.owner === OWNER);
  //   existingNodes.forEach((n) => touchNode(n));

  //   console.log({ tildaAssetNodes });

  //   download locally all tilda assets from imported pages
  await downloadTildaAssets({
    actions: { createNode, createNodeField, touchNode },
    createNodeId,
    store,
    cache,
    getNode,
    getNodes,
    reporter,
    assetNodes: tildaAssetNodes,
  });
};
