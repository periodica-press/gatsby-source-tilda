import axios from "axios";

const API = "http://api.tildacdn.info/v1/";

class TildaApi {
  constructor(publicKey, secret) {
    this.publicKey = publicKey;
    this.secret = secret;
    this.instance = axios.create({
      baseURL: API,
      params: {
        publickey: this.publicKey,
        secretkey: this.secret,
      },
    });
  }

  fetchProjects() {
    return this.instance.get("/getprojectslist").then((response) => {
      if (response && response.data && response.data.status === "FOUND") {
        return response.data.result || [];
      }
      throw new Error(response);
    });
  }

  fetchProjectPages(projectId) {
    return this.instance
      .get("/getpageslist", { params: { projectid: projectId } })
      .then((response) => {
        if (response && response.data && response.data.status === "FOUND") {
          return response.data.result || [];
        }
        throw new Error(response);
      })
      .then((items) => items.filter((page) => page.published !== ""));
  }

  fetchPage(pageId) {
    return this.instance
      .get("/getpageexport", { params: { pageid: pageId } })
      .then((response) => {
        if (response && response.data && response.data.status === "FOUND") {
          return response.data.result;
        }
        throw new Error(response);
      });
  }
}

export default TildaApi;
