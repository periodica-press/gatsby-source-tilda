import ProgressBar from "progress";
import { createRemoteFileNode } from "gatsby-source-filesystem";

export const downloadTildaAssets = async (
    gatsbyFunctions: { 
      actions: any; 
      createNodeId: any; 
      store: any; 
      cache: any; 
      getNode: any; 
      getNodes: any; 
      reporter: any; 
      assetNodes: any; 
  }) => {
  const {
    actions: { createNode, touchNode, createNodeField },
    createNodeId,
    store,
    cache,
    getNodes,
    getNode,
    reporter,
    assetNodes,
  } = gatsbyFunctions;

  const bar = new ProgressBar(
    "Downloading Tilda Assets [:bar] :current/:total :elapsed secs :percent",
    {
      total: assetNodes.length,
      width: 30,
    }
  );

  await Promise.all(
    assetNodes.map(async (node: { from: any; id: any; }) => {
      let fileNodeID;
      const { from: url, id } = node;

      const remoteDataCacheKey = `tilda-asset-${id}-${url}`;
      const cacheRemoteData = await cache.get(remoteDataCacheKey);
      // Avoid downloading the asset again if it's been cached
      // Note: Contentful Assets do not provide useful metadata
      // to compare a modified asset to a cached version?
      if (cacheRemoteData) {
        fileNodeID = cacheRemoteData.fileNodeID; // eslint-disable-line prefer-destructuring
        touchNode(getNode(cacheRemoteData.fileNodeID));
      }

      // If we don't have cached data, download the file
      if (!fileNodeID) {
        const fileNode = await createRemoteFileNode({
          url,
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
        createNodeField({ node, name: "localFile", value: fileNodeID });
      }

      return node;
    })
  );
};
