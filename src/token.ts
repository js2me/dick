/* eslint-disable sonarjs/new-cap */
import { AnyPrimitive, Class } from 'yummies/utils/types';

import { tokenMark } from './constants.js';
import { Container } from './container.js';
import { AnyToken, TokenConfig, TokenScope, TokenType } from './token.types.js';
import { Destroyable } from './types.js';

declare const process: { env: { NODE_ENV?: string } };

export class Token<TValue, TArgs extends any[] = []>
  implements Destroyable, Disposable
{
  static readonly tokensMap = new Map<AnyToken['key'], AnyToken>();

  static search<TClass extends Class<any>>(
    Class: TClass,
  ): Token<TClass extends Class<infer Value> ? Value : never> | null;
  static search<TValue = any>(key: string | symbol): Token<TValue> | null;
  static search<TValue = any>(token: Token<TValue>): Token<TValue> | null;

  static search(value: any) {
    if (value instanceof Token) {
      return value;
    }

    if (
      typeof value === 'function' &&
      tokenMark in value &&
      value[tokenMark] instanceof Token
    ) {
      return value[tokenMark];
    }

    if (Token.tokensMap.has(value)) {
      return Token.tokensMap.get(value)!;
    }

    return null;
  }

  static create<TValue, TArgs extends any[] = []>(
    key: Extract<TokenConfig<any>['key'], AnyPrimitive>,
    config: Omit<TokenConfig<TValue, TArgs>, 'key'>,
  ): Token<TValue, TArgs>;
  static create<TClass extends Class<any>>(
    classKey: TClass,
    config?: Omit<
      TokenConfig<
        TClass extends Class<infer TValue> ? TValue : never,
        TClass extends Class<any, infer TArgs> ? TArgs : never
      >,
      'key'
    >,
  ): Token<
    TClass extends Class<infer TValue> ? TValue : never,
    TClass extends Class<any, infer TArgs> ? TArgs : never
  >;
  static create<TValue, TArgs extends any[] = []>(
    config: TokenConfig<TValue, TArgs>,
  ): Token<TValue, TArgs>;

  static create(...args: any[]): any {
    if (args.length === 2) {
      return new this({
        ...args[1],
        key: args[0],
      });
    }
    if (args.length === 1) {
      if (typeof args[0] === 'function') {
        return new this({ key: args[0] });
      }
      return new this(args[0]);
    }
    throw new Error('invalid configuration');
  }

  type: TokenType;
  config: TokenConfig<TValue, TArgs>;
  references: Set<TValue>;
  key: Exclude<TokenConfig<TValue, TArgs>['key'], undefined>;
  scope: TokenScope;
  containersInUse: WeakSet<Container>;

  constructor(config: TokenConfig<TValue, TArgs>) {
    this.config = config;
    this.scope = this.defineScope();
    this.key = this.defineKey();
    this.references = new Set<TValue>();
    this.containersInUse = new WeakSet();
    this.type = this.defineType();

    this.processConfig();

    Token.tokensMap.set(this.key, this);
  }

  createValue(args: TArgs): TValue {
    let value: TValue = undefined as TValue;

    if (this.type === 'class' && typeof this.config.key === 'function') {
      value = new this.config.key(...args);
    } else if (this.config.value) {
      if (typeof this.config.value === 'function') {
        // @ts-expect-error invalid TS check
        return this.config.value(...args);
      } else {
        return this.config.value;
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn('value definition is not provided for token');
    }

    this.references.add(value);

    return value;
  }

  destroyValue(value: TValue) {
    this.references.delete(value);
    this.config.destroy?.(value);
  }

  override(update: Partial<TokenConfig<TValue, TArgs>>) {
    Object.assign(this.config, update);

    this.scope = this.defineScope();
    this.key = this.defineKey();
    this.type = this.defineType();

    this.processConfig();
  }

  private defineScope() {
    return this.config.scope ?? 'transient';
  }

  private defineKey() {
    return this.config.key ?? Symbol();
  }

  private defineType(): TokenType {
    if (this.config.type) {
      return this.config.type;
    } else if (typeof this.config.key === 'function') {
      return 'class';
    } else {
      return 'constant';
    }
  }

  private processConfig() {
    if (
      this.type === 'class' &&
      typeof this.config.key === 'function' &&
      tokenMark in this.config.key
    ) {
      delete this.config.key[tokenMark];
    }

    if (typeof this.key === 'function') {
      Object.defineProperty(this.key!, tokenMark, {
        value: this,
        configurable: false,
        writable: false,
        enumerable: false,
      });
    }
  }

  destroy() {
    this.references.forEach((reference) => {
      this.destroyValue(reference);
    });
    this.references.clear();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }
}

export const token = Token.create.bind(Token);
