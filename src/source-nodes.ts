import isOnline from 'is-online';
import type { GatsbyNode, NodeInput } from 'gatsby';
import { createPluginConfig } from './plugin-options';
import { downloadTildaAssets } from './download-assets';
import { createTildaPageAssets, createTildaPages } from './create-tilda-pages';
import { fetchPages, fetchPageInfo } from './fetch-data';
import { OWNER, PAGE_ASSET_TYPE, PAGE_TYPE } from './consts';
import type { TildaAsset } from './types';

export const sourceNodes: GatsbyNode['sourceNodes'] = async (
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
  if (!online && process.env.NODE_ENV !== 'production') {
    getNodes()
      .filter((n) => n.internal.owner === OWNER)
      .forEach((n) => touchNode(n));

    reporter.info('Using Offline cache ⚠️');
    reporter.info(
      'Cache may be invalidated if you edit package.json, gatsby-node.js or gatsby-config.js files'
    );

    return;
  }
  const config = createPluginConfig(configOptions);

  if (config.skip) {
    reporter.info(`Skip tilda sync...`);

    return;
  }

  // fetch tilda data
  reporter.info(`Fetch Tilda Pages for projectId: ${config.projectId}...`);
  let pages = await fetchPages({ pluginConfig: config, reporter });
  pages = pages.filter(
    (p) => !config.exclude.find((item: any) => item === p.alias)
  );

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
    (n: { internal: { owner: string; type: string } }) =>
      n.internal.owner === OWNER && n.internal.type === PAGE_TYPE
  );

  const tildaAssetsNodes = getNodes().filter(
    (n: { internal: { owner: string; type: string } }) =>
      n.internal.owner === OWNER && n.internal.type === PAGE_ASSET_TYPE
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

  // const notModifiedPages = pages.filter((p) =>
  //   tildaPageNodes.find((n) => p.id === n.pageId && n.published === p.published)
  // );

  const notModifiedPgs = tildaPageNodes.filter((n) =>
    pages.find((p) => p.id === n.pageId && n.published === p.published)
  );

  // process deleted tilda pages and assets
  const deleteTildaNode = (node: NodeInput) => deleteNode(node);
  deletedPageNodes.forEach(deleteTildaNode);
  deletedAssets.forEach(deleteTildaNode);

  // clear deleted assets from cache
  await Promise.all(
    deletedAssets.map(async (asset) => {
      const { id, url } = asset;
      const remoteDataCacheKey = `tilda-asset-${id}-${url}`;
      await cache.del(remoteDataCacheKey);
    })
  );

  // create nodes for all tilda assets
  let tildaAssets: TildaAsset[] = [];
  pagesInfo.forEach((pageInfo) => {
    tildaAssets = tildaAssets.concat(
      [...pageInfo.css, ...pageInfo.js, ...pageInfo.images].map((item) => ({
        ...item,
        pageId: pageInfo.id,
      }))
    );
  });

  reporter.info('');
  reporter.info(`Total TildaPages: ${tildaPageNodes.length}`);
  reporter.info(
    `Created/Updated pages: ${[...newPages, ...updatedPages].length}`
  );
  reporter.info(`Unmodified pages: ${notModifiedPgs.length}`);
  reporter.info(`Deleted pages: ${deletedPageNodes.length}`);
  reporter.info('');
  reporter.info(`Total TildaAssets: ${tildaAssets.length}`);
  reporter.info(`Cached TildaAssets: ${tildaAssetsNodes.length}`);
  reporter.info(`Deleted assets: ${deletedAssets.length}`);
  reporter.info('');

  // touch unmodified pages to keep from garbage collection
  notModifiedPgs.forEach((pageNode: any) => {
    touchNode(pageNode);
  });

  // create nodes for all tilda pages
  await Promise.all(
    createTildaPages(
      {
        actions: { createNode },
        createNodeId,
        createContentDigest,
      },
      config,
      pagesInfo
    )
  );

  await Promise.all(
    createTildaPageAssets(
      {
        actions: { createNode },
        createNodeId,
        createContentDigest,
      },
      tildaAssets
    )
  );

  const tildaAssetNodes = getNodes().filter(
    (n: { internal: { owner: string; type: string } }) =>
      n.internal.owner === OWNER && n.internal.type === PAGE_ASSET_TYPE
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
