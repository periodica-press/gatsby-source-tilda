import type { PluginOptions } from 'gatsby';
import TildaApi from './api/tilda';
import type { TildaDataSource } from './api/tilda';
import SnapshotApi from './api/snapshot';

export interface PluginSettings {
  secret: string;
  publicKey: string;
  projectId: string;
  exclude: string[];
  skip?: boolean;
  downloadAssets?: boolean;
  refetchAll?: boolean;
  onFetchError: 'fail' | 'use-cache';
  fetchConcurrency: number;
  fetchRetries: number;
  snapshotUrl?: string;
  api: TildaDataSource;
}

const defaultOptions: Omit<PluginSettings, 'api'> = {
  secret: '',
  projectId: '',
  publicKey: '',
  exclude: [],
  fetchConcurrency: 5,
  fetchRetries: 3,
  onFetchError: 'fail',
};

export const createPluginConfig = (pluginOptions: PluginOptions) => {
  const { secret, publicKey, snapshotUrl, projectId } = pluginOptions;
  return {
    ...defaultOptions,
    ...pluginOptions,
    // with snapshotUrl pages are read from a snapshot in a storage instead of Tilda API
    api: snapshotUrl
      ? new SnapshotApi(snapshotUrl as string, projectId as string)
      : new TildaApi(publicKey as string, secret as string),
  } as PluginSettings;
};
