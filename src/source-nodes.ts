import isOnline from "is-online";
import { PluginOptionsProps, createPluginConfig } from "./plugin-options";
import { downloadTildaAssets } from "./download-assets";
import { createTildaPageAssets, createTildaPages } from "./create-tilda-pages";
import { fetchPages, fetchPageInfo, PluginConfigProps } from "./fetch-data";
import { OWNER, PAGE_ASSET_TYPE, PAGE_TYPE } from "./consts";


export interface SourceNodeActionsProps {
  createNode: any;
  createNodeField: any;
  touchNode: any;
  deleteNode: any;
}
export interface SourceNodeProps {
  actions: SourceNodeActionsProps;
  createNodeId: any;
  createContentDigest: any;
  getNode: any;
  getNodes: any;
  store: any;
  cache: any;
  reporter: any;
}

export const sourceNodes = async (
  {
    actions: { createNode, createNodeField, touchNode, deleteNode } ,
    createNodeId,
    createContentDigest,
    getNode,
    getNodes,
    store,
    cache,
    reporter,
  } : SourceNodeProps,
  configOptions: PluginOptionsProps
) => {
  const online = await isOnline();

  // If the user knows they are offline, serve them cached result
  // For prod builds though always fail if we can't get the latest data
  if (!online && process.env.NODE_ENV !== "production") {
    getNodes()
      .filter((n: { internal: { owner: string; }; }) => n.internal.owner === OWNER)
      .forEach((n: { id: any; }) => touchNode({ nodeId: n.id }));

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
  pages = pages.filter((p) => !config.exclude.find((item : any) => item === p.alias));

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
    (n: { internal: { owner: string; type: string; }; }) => n.internal.owner === OWNER && n.internal.type === PAGE_TYPE
  );

  const tildaAssetsNodes = getNodes().filter(
    (n: { internal: { owner: string; type: string; }; }) => n.internal.owner === OWNER && n.internal.type === PAGE_ASSET_TYPE
  );

  const deletedPageNodes = tildaPageNodes.filter(
    (n: { pageId: any; }) => !pages.find((p) => p.id === n.pageId)
  );
  const deletedAssets = tildaAssetsNodes.filter((n: { pageId: any; }) =>
    deletedPageNodes.find((pN : any) => pN.pageId === n.pageId)
  );
  const newPages = pages.filter(
    (p) => !tildaPageNodes.find((n: { pageId: any; }) => p.id === n.pageId)
  );
  const updatedPages = pages.filter((p) =>
    tildaPageNodes.find((n: { pageId: any; published: any; }) => p.id === n.pageId && n.published !== p.published)
  );
  const notModifiedPages = pages.filter((p) =>
    tildaPageNodes.find((n: { pageId: any; published: any; }) => p.id === n.pageId && n.published === p.published)
  );

  const notModifiedPgs = tildaPageNodes.filter((n: { pageId: any; published: any; }) =>
    pages.find((p) => p.id === n.pageId && n.published === p.published)
  );

  // process deleted tilda pages and assets
  const deleteTildaNode = (node: any) => {
    touchNode(node);
    deleteNode({ node });
  };
  deletedPageNodes.forEach(deleteTildaNode);
  deletedAssets.forEach(deleteTildaNode);

  // clear deleted assets from cache
  await Promise.all(
    deletedAssets.map(async (asset: { id: any; url: any; }) => {
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
  notModifiedPgs.forEach((pageNode: any) => {
    touchNode(pageNode);
  });

  // create nodes for all tilda pages
  const tildaPagesNodes : any = [];
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
  let tildaAssets : any= [];
  pagesInfo.forEach((pageInfo) => {
    tildaAssets = tildaAssets.concat(
      [...pageInfo.css, ...pageInfo.js, ...pageInfo.images].map((item) => ({
        ...item,
        pageId: pageInfo.id,
      }))
    );
  });

  const tildaAssetNodes : any= [];
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
