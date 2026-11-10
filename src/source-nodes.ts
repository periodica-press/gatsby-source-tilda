import isOnline from 'is-online';
import type { GatsbyNode, NodeInput } from 'gatsby';
import { createPluginConfig } from './plugin-options';
import { downloadTildaAssets } from './download-assets';
import { createTildaPageAssets, createTildaPages } from './create-tilda-pages';
import { fetchPages, fetchPageInfo } from './fetch-data';
import { OWNER, PAGE_ASSET_TYPE, PAGE_TYPE } from './consts';
import { isTildaLimitError } from './utils';
import type { TildaPageInfo, TildaPageExportInfo } from './api/tilda';
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

  // fetch tilda pages list
  reporter.info(`Fetch Tilda Pages for projectId: ${config.projectId}...`);
  let pages: TildaPageInfo[];
  try {
    pages = await fetchPages({ pluginConfig: config, reporter });
  } catch (e) {
    // keep cached nodes from garbage collection (the build may go on, e.g. in develop)
    const cachedNodes = getNodes().filter((n) => n.internal.owner === OWNER);
    cachedNodes.forEach((n) => touchNode(n));
    reporter.info(`Tilda API requests this build: ${config.api.requestCount}`);

    if (config.onFetchError === 'use-cache' && cachedNodes.length) {
      reporter.warn(
        `Tilda pages list is unavailable, using ${cachedNodes.length} cached Tilda nodes. Content may be outdated!`
      );
      return;
    }

    reporter.panicOnBuild(`Fetch Tilda Pages failed`, e as Error);
    return;
  }
  if (config.api.snapshotSyncedAt) {
    reporter.info(`Tilda snapshot synced at ${config.api.snapshotSyncedAt}`);
  }
  pages = pages.filter(
    (p) => !config.exclude.find((item: any) => item === p.alias)
  );

  // get new, updated, unmodified and deleted pages comparing with cached nodes
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
  const notModifiedPgs = tildaPageNodes.filter((n) =>
    pages.find((p) => p.id === n.pageId && n.published === p.published)
  );

  // Tilda API is limited (150 requests per hour), so request the page export
  // only for pages that are not in the cache or were republished since then
  const pagesToFetch = config.refetchAll
    ? pages
    : [...newPages, ...updatedPages];

  reporter.info(
    `Fetch Tilda Pages info: ${pagesToFetch.length} of ${pages.length} pages` +
      ` (new: ${newPages.length}, updated: ${updatedPages.length}, cached: ${notModifiedPgs.length})...`
  );
  const { default: PQueue } = await import('p-queue');
  const pagesQueue = new PQueue({ concurrency: config.fetchConcurrency });
  let started = 0;
  let limitError: unknown;
  const failures = new Map<string, { page: TildaPageInfo; error: unknown }>();
  const fetched = await Promise.all(
    pagesToFetch.map((p) =>
      pagesQueue.add(
        async () => {
          // the hourly limit is exceeded, other requests are going to fail too
          if (limitError) {
            failures.set(p.id, { page: p, error: limitError });
            return null;
          }
          started += 1;
          reporter.info(
            `Fetching '${p.alias}' – '${p.title}' info (${started}/${pagesToFetch.length}, in flight: ${pagesQueue.pending})...`
          );
          try {
            return await fetchPageInfo({
              pageId: p.id,
              pluginConfig: config,
              reporter,
            });
          } catch (error) {
            if (isTildaLimitError(error)) {
              limitError = error;
            }
            failures.set(p.id, { page: p, error });
            return null;
          }
        },
        { throwOnTimeout: true }
      )
    )
  );
  const pagesInfo = fetched.filter((info): info is TildaPageExportInfo =>
    Boolean(info)
  );
  reporter.info(`Tilda API requests this build: ${config.api.requestCount}`);

  // pages that can't be fetched, but have a cached version, stay as they were
  const outdatedPageIds = new Set<string>();
  const failedWithoutCache = [...failures.values()].filter(
    ({ page }) =>
      config.onFetchError !== 'use-cache' ||
      !tildaPageNodes.some((n) => n.pageId === page.id)
  );
  if (failedWithoutCache.length) {
    // keep cached nodes from garbage collection (the build may go on, e.g. in develop)
    [...tildaPageNodes, ...tildaAssetsNodes].forEach((n) => touchNode(n));
    reporter.panicOnBuild(
      `Couldn't get ${
        failedWithoutCache.length
      } Tilda page(s) info: ${failedWithoutCache
        .map(({ page }) => `'${page.alias}' (id: ${page.id})`)
        .join(', ')}`,
      failedWithoutCache[0].error as Error
    );
    return;
  }
  failures.forEach(({ page }) => {
    outdatedPageIds.add(page.id);
    reporter.warn(
      `Tilda page '${page.alias}' (id: ${page.id}) is unavailable, using cached version. Content may be outdated!`
    );
  });

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
  reporter.info(`Outdated pages (cached fallback): ${outdatedPageIds.size}`);
  reporter.info(`Deleted pages: ${deletedPageNodes.length}`);
  reporter.info('');
  reporter.info(`Fetched TildaAssets: ${tildaAssets.length}`);
  reporter.info(`Cached TildaAssets: ${tildaAssetsNodes.length}`);
  reporter.info(`Deleted assets: ${deletedAssets.length}`);
  reporter.info('');

  // touch unmodified pages and their assets to keep from garbage collection
  // (their exports were not fetched, so nodes are not recreated)
  const keptPageIds = new Set([
    ...notModifiedPgs.map((n) => n.pageId),
    ...outdatedPageIds,
  ]);
  tildaPageNodes
    .filter((n) => keptPageIds.has(n.pageId))
    .forEach((pageNode: any) => {
      touchNode(pageNode);
    });
  tildaAssetsNodes
    .filter((n) => keptPageIds.has(n.pageId))
    .forEach((assetNode: any) => {
      touchNode(assetNode);
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

  if (config.downloadAssets) {
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
  }
};
