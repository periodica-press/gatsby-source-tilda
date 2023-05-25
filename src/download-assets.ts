import ProgressBar from 'progress';
import { createRemoteFileNode } from 'gatsby-source-filesystem';
import type {
  Actions,
  Node,
  // NodeInput,
  NodePluginArgs,
  Reporter,
} from 'gatsby';

export const downloadTildaAssets = async (gatsbyFunctions: {
  actions: {
    createNode: Actions['createNode'];
    createNodeField: Actions['createNodeField'];
    touchNode: Actions['touchNode'];
  };
  createNodeId: NodePluginArgs['createNodeId'];
  store: NodePluginArgs['store'];
  cache: NodePluginArgs['cache'];
  getNode: NodePluginArgs['getNode'];
  getNodes: NodePluginArgs['getNodes'];
  reporter: Reporter;
  assetNodes: Node[];
}) => {
  const {
    actions: { createNode, touchNode, createNodeField },
    createNodeId,
    // store,
    cache,
    // getNodes,
    getNode,
    // reporter,
    assetNodes,
  } = gatsbyFunctions;

  const bar = new ProgressBar(
    'Downloading Tilda Assets [:bar] :current/:total :elapsed secs :percent',
    {
      total: assetNodes.length,
      width: 30,
    }
  );

  await Promise.all(
    assetNodes.map(async (node) => {
      let fileNodeID;
      const { from: url, id } = node;

      const remoteDataCacheKey = `tilda-asset-${id}-${url}`;
      const cacheRemoteData = await cache.get(remoteDataCacheKey);
      // Avoid downloading the asset again if it's been cached
      // Note: Contentful Assets do not provide useful metadata
      // to compare a modified asset to a cached version?
      if (cacheRemoteData) {
        fileNodeID = cacheRemoteData.fileNodeID; // eslint-disable-line prefer-destructuring
        const cachedNode = getNode(cacheRemoteData.fileNodeID);
        if (cachedNode) {
          touchNode(cachedNode);
        }
      }

      // If we don't have cached data, download the file
      if (!fileNodeID) {
        const fileNode = await createRemoteFileNode({
          url: url as string,
          // store,
          cache,
          createNode,
          createNodeId,
          // reporter,
        });

        if (fileNode) {
          bar.tick(0, 0);
          fileNodeID = fileNode.id;
          await cache.set(remoteDataCacheKey, { fileNodeID: fileNode.id });
        }
      }

      if (fileNodeID) {
        createNodeField({ node, name: 'localFile', value: fileNodeID });
      }

      return node;
    })
  );
};
