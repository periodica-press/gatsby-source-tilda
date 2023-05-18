import TildaApi from './api/tilda';

const defaultOptions = { exclude: [] };

export const createPluginConfig = (pluginOptions) => {
  const { secret, publicKey } = pluginOptions;
  const conf = { ...defaultOptions, ...pluginOptions };

  return {
    get: (key) => conf[key],
    api: new TildaApi(publicKey, secret),
    getOriginalPluginOptions: () => pluginOptions,
    exclude: conf.exclude,
  };
};
