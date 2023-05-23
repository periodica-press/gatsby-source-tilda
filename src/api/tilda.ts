import axios, { AxiosInstance } from "axios";

const API = "http://api.tildacdn.info/v1/";

//List
export type ProjectsListResultRes = {
  "id": string,
  "title": string,
  "descr": string
}
export interface ProjectsListRes {
    "status": string;
    "result": ProjectsListResultRes[]
}
//List

//Exports
export interface PagesExportsRes {
    "status": string;
    "result": {
      css: any;
      js: any;
      "id": string,
      "projectid": string,
      "title": string,
      "descr": string,
      "img": string,
      "featureimg": string,
      "alias": string,
      "date": string,
      "sort": string,
      "published": string,
      "images": 
        {
          "from": string,
          "to": string
        }[],
      "html": string,
      "filename": string
    }  
}
//Exports

//List
export type PagesListResultRes = {
  "id": string,
  "projectid": string,
  "title": string,
  "descr": string,
  "img": string,
  "featureimg": string,
  "alias": string,
  "date": string,
  "sort": string,
  "published": string,
  "filename": string
}
export interface PagesListRes {
  "status": string,
  "result": PagesListResultRes[],
}
//List
class TildaApi {
  publicKey: any;
  secret: any;
  instance: AxiosInstance;
  constructor(publicKey: any, secret: any) {
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
    return this.instance.get<ProjectsListRes>("/getprojectslist").then((response) => {
      if (response && response.data && response.data.status === "FOUND") {
        return response.data.result || [];
      }
      throw new Error(JSON.stringify(response));
    });
  }

  fetchProjectPages(projectId: string) {
    return this.instance
      .get<PagesListRes>("/getpageslist", { params: { projectid: projectId } })
      .then((response) => {
        if (response && response.data && response.data.status === "FOUND") {
          return response.data.result || [];
        }
        throw new Error(JSON.stringify(response));
      })
      .then((items: PagesListResultRes[]) => items.filter((page: { published: string; }) => page.published !== ""));
  }

  fetchPage(pageId: string) {
    return this.instance
      .get<PagesExportsRes>("/getpageexport", { params: { pageid: pageId } })
      .then((response) => {
        if (response && response.data && response.data.status === "FOUND") {
          return response.data.result;
        }
        throw new Error(JSON.stringify(response));
      });
  }
}

export default TildaApi;
