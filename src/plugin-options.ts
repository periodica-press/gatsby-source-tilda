import type { PluginOptions } from 'gatsby';
import TildaApi from './api/tilda';

export interface PluginSettings {
  secret: string;
  publicKey: string;
  projectId: string;
  exclude: string[];
  skip?: boolean;
  downloadAssets?: boolean;
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
};

export const createPluginConfig = (pluginOptions: PluginOptions) => {
  const { secret, publicKey } = pluginOptions;
  return {
    ...defaultOptions,
    ...pluginOptions,
    api: new TildaApi(publicKey as string, secret as string),
  } as PluginSettings;
};
