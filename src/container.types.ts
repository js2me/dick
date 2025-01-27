import { Maybe } from 'yummies/utils/types';

import { TagConfig } from './tag.types.js';

export interface ContainerConfig {
  fallbackTag?: Maybe<(value: any) => TagConfig<any, any>>;
}
