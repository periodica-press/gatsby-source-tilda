import TildaApi from './api/tilda';
import { PluginConfigProps } from './fetch-data';

export interface PluginOptionsProps {
  secret: any;
  publicKey: any;
}

const defaultOptions = { exclude: [] };

export const createPluginConfig : (arg0: PluginOptionsProps) => PluginConfigProps = (pluginOptions: PluginOptionsProps) => {
  const { secret, publicKey } = pluginOptions;
  const conf = { ...defaultOptions, ...pluginOptions };

  return {
    get: (key: string) => conf[key as keyof typeof conf],
    api: new TildaApi(publicKey, secret),
    getOriginalPluginOptions: () => pluginOptions,
    exclude: conf.exclude,
  };
};
