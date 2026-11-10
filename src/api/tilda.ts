import type { AxiosInstance } from 'axios';
import axios from 'axios';

const API = 'https://api.tildacdn.info/v1/';
const REQUEST_TIMEOUT_MS = 30000;

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

// source of pages for the plugin: Tilda API itself or a snapshot of it in a storage (see SnapshotApi)
export interface TildaDataSource {
  // number of requests made to Tilda API (a snapshot makes none)
  requestCount: number;
  // when the snapshot was synced from Tilda, only for a snapshot
  snapshotSyncedAt?: string;
  fetchProjectPages(projectId: string): Promise<TildaPageInfo[]>;
  fetchPage(pageId: string): Promise<TildaPageExportInfo>;
}

class TildaApi implements TildaDataSource {
  publicKey: string;

  secret: string;

  instance: AxiosInstance;

  // every request counts towards the hourly limit of Tilda API (150 per hour)
  requestCount = 0;

  constructor(publicKey: string, secret: string) {
    this.publicKey = publicKey;
    this.secret = secret;
    this.instance = axios.create({
      baseURL: API,
      timeout: REQUEST_TIMEOUT_MS,
      params: {
        publickey: this.publicKey,
        secretkey: this.secret,
      },
    });
    this.instance.interceptors.request.use((config) => {
      this.requestCount += 1;
      return config;
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

  async fetchPage(pageId: string): Promise<TildaPageExportInfo> {
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

    return response.data.result;
  }
}

export default TildaApi;
