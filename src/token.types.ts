import { Class } from 'yummies/utils/types';

import { Token } from './token.js';

export type TokenType = 'class' | 'constant';

export type TokenScope =
  | 'singleton'
  | 'transient'
  | 'container'
  | 'resolution'
  | 'scoped';

export interface TokenConfig<TValue, TArgs extends any[] = []> {
  scope?: TokenScope;
  key?: string | symbol | number | Class<TValue, TArgs>;
  meta?: any;
  type?: TokenType;
  value?: TValue | ((...args: TArgs) => TValue);
  destroy?: (value: TValue) => void;
}

type InferTokenParams<T> =
  T extends Token<any, infer TParams> ? TParams : never;
type InferTokenValue<T> = T extends Token<infer TValue, any> ? TValue : never;

export type InferToken<
  T,
  TInferValue extends 'value' | 'params',
> = TInferValue extends 'value' ? InferTokenValue<T> : InferTokenParams<T>;

type InferTokenConfigParams<T> =
  T extends TokenConfig<any, infer TParams> ? TParams : never;
type InferTokenConfigValue<T> =
  T extends TokenConfig<infer TValue, any> ? TValue : never;

export type InferTokenConfig<
  T,
  TInferValue extends 'value' | 'params',
> = TInferValue extends 'value'
  ? InferTokenConfigValue<T>
  : InferTokenConfigParams<T>;

export type AnyToken = Token<any, any>;
