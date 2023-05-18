import axios, { AxiosInstance } from "axios";

const API = "http://api.tildacdn.info/v1/";

export interface ProjectsListRes {
    "status": string;
    "result": 
      {
        "id": string,
        "title": string,
        "descr": string
      }[]
}
export interface PagesExportsRes {
    "status": string;
    "result": {
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
export interface PagesListRes {
  "status": string,
  "result": 
    {
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
    }[],
}

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

  fetchProjects() : any {
    return this.instance.get<ProjectsListRes>("/getprojectslist").then((response) => {
      if (response && response.data && response.data.status === "FOUND") {
        return response.data.result || [];
      }
      throw new Error(JSON.stringify(response));
    });
  }

  fetchProjectPages(projectId: any) {
    return this.instance
      .get<PagesListRes>("/getpageslist", { params: { projectid: projectId } })
      .then((response) => {
        if (response && response.data && response.data.status === "FOUND") {
          return response.data.result || [];
        }
        throw new Error(JSON.stringify(response));
      })
      .then((items: any[]) => items.filter((page: { published: string; }) => page.published !== ""));
  }

  fetchPage(pageId: any) {
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
