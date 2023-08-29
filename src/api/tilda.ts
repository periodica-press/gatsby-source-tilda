import type { AxiosInstance } from 'axios';
import axios from 'axios';

const API = 'http://api.tildacdn.info/v1/';

export interface TildaProjectInfo {
  id: string;
  title: string;
  descr: string;
}

export interface TildaPageInfo {
  id: string;
  projectid: string;
  title: string;
  descr: string;
  img: string;
  featureimg: string;
  alias: string;
  date: string;
  sort: string;
  published: string;
  filename: string;
}

export interface TildaPageExportInfo {
  id: string;
  projectid: string;
  title: string;
  descr: string;
  img: string;
  featureimg: string;
  alias: string;
  date: string;
  sort: string;
  published: string;
  images: Asset[];
  js: Asset[];
  css: Asset[];
  html: string;
  filename: string;
}

export interface ProjectsListResponse {
  status: string;
  result: TildaProjectInfo[];
}

export type Asset = {
  from: string;
  to: string;
};
export interface PagesExportsResponse {
  status: string;
  result: TildaPageExportInfo;
}
export interface PagesListResponse {
  status: string;
  result: TildaPageInfo[];
}

class TildaApi {
  publicKey: string;

  secret: string;

  instance: AxiosInstance;

  constructor(publicKey: string, secret: string) {
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

  async fetchProjects(): Promise<TildaProjectInfo[]> {
    const response = await this.instance.get<ProjectsListResponse>(
      '/getprojectslist'
    );

    if (response.data.status !== 'FOUND') {
      throw new Error(
        `Tilda Projects not found. ${JSON.stringify(response.data)}`
      );
    }

    return response.data.result || [];
  }

  async fetchProjectPages(projectId: string): Promise<TildaPageInfo[]> {
    const response = await this.instance.get<PagesListResponse>(
      '/getpageslist',
      {
        params: { projectid: projectId },
      }
    );

    if (response.data.status !== 'FOUND') {
      throw new Error(
        `Tilda Project #${projectId} pages not found. ${JSON.stringify(
          response.data
        )}`
      );
    }

    return response.data.result.filter((page) => page.published !== '') || [];
  }

  async fetchPage(pageId: string) {
    const response = await this.instance.get<PagesExportsResponse>(
      '/getpageexport',
      {
        params: { pageid: pageId },
      }
    );

    if (response.data.status !== 'FOUND') {
      throw new Error(
        `Tilda Page not found #${pageId} ${JSON.stringify(response.data)}`
      );
    }

    return response.data.result || [];
  }
}

export default TildaApi;
