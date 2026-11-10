import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type {
  PagesExportsResponse,
  PagesListResponse,
  TildaDataSource,
  TildaPageExportInfo,
  TildaPageInfo,
} from './tilda';

const SCHEMA_VERSION = 1;
const REQUEST_TIMEOUT_MS = 30000;

interface SnapshotManifest {
  schemaVersion: number;
  projectId: string;
  syncedAt?: string;
  pages: Record<string, string>;
}

// Reads pages from a snapshot of Tilda API in a storage (files are written by `tilda-sync` function):
//   {snapshotUrl}/v1/{projectId}/manifest.json
//   {snapshotUrl}/v1/{projectId}/pages.json        (answer of getpageslist)
//   {snapshotUrl}/v1/{projectId}/pages/{id}.json   (answer of getpageexport)
class SnapshotApi implements TildaDataSource {
  // snapshot is read from a storage, requests to Tilda API are not made
  requestCount = 0;

  snapshotSyncedAt?: string;

  instance: AxiosInstance;

  projectId: string;

  constructor(snapshotUrl: string, projectId: string) {
    this.projectId = projectId;
    this.instance = axios.create({
      baseURL: `${snapshotUrl.replace(
        /\/+$/,
        ''
      )}/v${SCHEMA_VERSION}/${projectId}`,
      timeout: REQUEST_TIMEOUT_MS,
    });
  }

  async fetchProjectPages(projectId: string): Promise<TildaPageInfo[]> {
    const manifest = (
      await this.instance.get<SnapshotManifest>('/manifest.json')
    ).data;
    if (manifest.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `Tilda snapshot has schemaVersion ${manifest.schemaVersion}, the plugin supports ${SCHEMA_VERSION}`
      );
    }
    this.snapshotSyncedAt = manifest.syncedAt;

    const response = await this.instance.get<PagesListResponse>('/pages.json');
    if (response.data.status !== 'FOUND') {
      throw new Error(
        `Tilda snapshot of project #${projectId} pages not found. ${JSON.stringify(
          response.data
        )}`
      );
    }

    return response.data.result.filter((page) => page.published !== '');
  }

  async fetchPage(pageId: string): Promise<TildaPageExportInfo> {
    const response = await this.instance.get<PagesExportsResponse>(
      `/pages/${pageId}.json`
    );
    if (response.data.status !== 'FOUND' || !response.data.result) {
      throw new Error(
        `Tilda snapshot of page #${pageId} not found ${JSON.stringify(
          response.data
        )}`
      );
    }

    return response.data.result;
  }
}

export default SnapshotApi;
