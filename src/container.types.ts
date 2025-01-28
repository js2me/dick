import { Maybe } from 'yummies/utils/types';

import { Tag } from './tag.js';
import { TagConfig } from './tag.types.js';

export interface ContainerConfig {
  fallbackTag?: Maybe<(value: any) => TagConfig<any, any> | Tag<any, any>>;
}
