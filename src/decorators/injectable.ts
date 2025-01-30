import { Class } from 'yummies/utils/types';

import { tag } from '../tag.js';
import { TagConfig } from '../tag.types.js';

export const injectable =
  <T extends Class<any>>(
    config: Omit<
      TagConfig<T extends Class<infer TValue> ? TValue : any>,
      'token'
    >,
  ) =>
  (ClassConstructor: T): T => {
    tag({
      ...config,
      token: ClassConstructor,
    });
    return ClassConstructor as unknown as T;
  };
