import { Class } from 'yummies/utils/types';

import { InjectRegisterConfig } from './container.types';
import { Tag } from './tag';

export type TagSimpleConfig<TTarget> = (string | symbol) & {
  __REF__?: TTarget;
};

export type TagStrategy = 'class-constructor' | 'token';

export interface TagDetailedConfig<TTarget, TArgs extends any[] = any[]>
  extends InjectRegisterConfig {
  token?: TagSimpleConfig<TTarget> | Class<TTarget, TArgs>;
  meta?: any;
  classConstructor?: Class<TTarget, TArgs>;
  strategy?: TagStrategy;
  value?: (...args: TArgs) => TTarget;
  destroy?: (value: TTarget) => void;
}

export type TagConfig<TTarget, TArgs extends any[] = any[]> =
  | TagDetailedConfig<TTarget, TArgs>
  | TagSimpleConfig<TTarget>;

export type InferTagParams<T> =
  T extends Tag<any, infer TParams> ? TParams : never;

export type InferTagTarget<T> =
  T extends Tag<infer TTarget, any> ? TTarget : never;
