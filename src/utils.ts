export const createPageNodeId = (createNodeId: (arg0: string) => string, pageId: string) => createNodeId(`tilda-page-${pageId}`);
