export { sourceNodes } from "./source-nodes";

export const createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  createTypes(`
    type TildaPageAsset {
      from: String,
      to: String
    }
    type TildaAsset implements Node {
      from: String,
      to: String,
      pageId: String,
      localFile: File @link(from: "fields.localFile")
    }
    type TildaPage implements Node {
      alias: String,
      pageId: String,
      featureimg: String!,
      descr: String!,
      date: Date,
      export_imgpath: String,
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
