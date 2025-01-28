import { Class } from 'yummies/utils/types';

import { tag } from '../tag.js';
import { TagConfig } from '../tag.types.js';

export const injectable =
  <T>(config: Omit<TagConfig<NoInfer<T>>, 'token'>) =>
  (ClassConstructor: Class<T>) => {
    tag({
      ...config,
      token: ClassConstructor,
    });
    return ClassConstructor;
  };
