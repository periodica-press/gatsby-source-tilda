import ProgressBar from 'progress';
import { createRemoteFileNode } from 'gatsby-source-filesystem';
import { OWNER, PAGE_ASSET_TYPE } from './consts';

const bar = new ProgressBar(
  'Downloading Tilda Assets [:bar] :current/:total :elapsed secs :percent',
  {
    total: 0,
    width: 30,
  },
);

let totalJobs = 0;

export const downloadAssets = async (gatsbyFunctions) => {
  const {
    actions: { createNode, touchNode },
    createNodeId,
    store,
    cache,
    getNodes,
    getNode,
    reporter,
  } = gatsbyFunctions;

  const assetNodes = getNodes().filter(
    (n) => n.internal.owner === OWNER && n.internal.type === PAGE_ASSET_TYPE,
  );

  await Promise.all(
    assetNodes.map(async (node) => {
      totalJobs += 1;
      bar.total = totalJobs;
      let fileNodeID;
      const { from: url, id } = node;
      const remoteDataCacheKey = `tilda-asset-${id}-${url}`;
      const cacheRemoteData = await cache.get(remoteDataCacheKey);
      // Avoid downloading the asset again if it's been cached
      // Note: Contentful Assets do not provide useful metadata
      // to compare a modified asset to a cached version?
      if (cacheRemoteData) {
        fileNodeID = cacheRemoteData.fileNodeID; // eslint-disable-line prefer-destructuring
        const node = getNode(fileNodeID);
        touchNode(node);
      }

      // If we don't have cached data, download the file
      if (!fileNodeID) {
        try {
          const fileNode = await createRemoteFileNode({
            url,
            store,
            cache,
            createNode,
            createNodeId,
            reporter,
          });

          if (fileNode) {
            fileNodeID = fileNode.id;
            await cache.set(remoteDataCacheKey, { fileNodeID });
          }
        } catch (err) {
          // Ignore
        }
      }

      if (fileNodeID) {
        bar.tick();
        // eslint-disable-next-line no-param-reassign
        node.localFile___NODE = fileNodeID;
      }

      return node;
    }),
  );
};
