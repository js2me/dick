import { AnyObject } from 'yummies/utils/types';

export type TagSimpleConfig<TTarget> = (string | symbol) & {
  __REF__?: TTarget;
};

export interface TagDetailedConfig<TTarget> {
  value?: TagSimpleConfig<TTarget>;
  metaData?: AnyObject;
}

export type TagConfig<TTarget> =
  | TagSimpleConfig<TTarget>
  | TagDetailedConfig<TTarget>;
