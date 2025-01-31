import { Maybe } from 'yummies/utils/types';

import { Token } from './token.js';
import { TokenConfig } from './token.types.js';

export interface ContainerConfig {
  fallbackToken?: Maybe<
    (value: any) => TokenConfig<any, any> | Token<any, any>
  >;
}
