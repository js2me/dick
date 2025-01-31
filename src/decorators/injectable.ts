import { Class } from 'yummies/utils/types';

import { token } from '../token.js';
import { TokenConfig } from '../token.types.js';

export const injectable =
  <T extends Class<any>>(
    config: Omit<
      TokenConfig<T extends Class<infer TValue> ? TValue : any>,
      'key'
    >,
  ) =>
  (ClassConstructor: T): T => {
    token({
      ...config,
      key: ClassConstructor,
    });
    return ClassConstructor as unknown as T;
  };
