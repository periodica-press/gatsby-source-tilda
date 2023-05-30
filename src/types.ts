import type { Asset } from './api/tilda';

export interface TildaAsset extends Asset {
  pageId: string;
}
