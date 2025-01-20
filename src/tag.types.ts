import { Class } from 'yummies/utils/types';

import { InjectRegisterConfig } from './container.types';

export type TagSimpleConfig<TTarget> = (string | symbol) & {
  __REF__?: TTarget;
};

export interface TagDetailedConfig<TTarget, TArgs extends any[] = any[]>
  extends InjectRegisterConfig {
  token?: TagSimpleConfig<TTarget> | Class<TTarget>;
  meta?: any;
  value?: (...args: TArgs) => TTarget;
  classConstructor?: Class<TTarget>;
  strategy?: 'class-constructor' | 'token';
}

export type TagConfig<TTarget, TArgs extends any[] = any[]> =
  | TagDetailedConfig<TTarget, TArgs>
  | TagSimpleConfig<TTarget>;
