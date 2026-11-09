import type { PluginOptions } from 'gatsby';
import TildaApi from './api/tilda';

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
  api: TildaApi;
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
  const { secret, publicKey } = pluginOptions;
  return {
    ...defaultOptions,
    ...pluginOptions,
    api: new TildaApi(publicKey as string, secret as string),
  } as PluginSettings;
};
