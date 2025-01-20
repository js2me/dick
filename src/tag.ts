import { Class } from 'yummies/utils/types';

import { InjectRegisterConfig } from './container.types';
import { TagConfig, TagDetailedConfig } from './tag.types';

const mark = Symbol('di');

export class Tag<TTarget, TArgs extends any[] = any[]> {
  injectConfig: InjectRegisterConfig;
  strategy: 'class-constructor' | 'token';
  config: TagDetailedConfig<TTarget>;

  protected constructor(configOrToken: TagConfig<TTarget, TArgs>) {
    this.config =
      typeof configOrToken === 'object'
        ? configOrToken
        : {
            token: configOrToken,
          };

    this.strategy =
      (this.config.strategy ?? typeof this.config.token === 'function')
        ? 'class-constructor'
        : 'token';

    this.injectConfig = {
      __: this.config.__,
      scope: this.config.scope ?? 'transient',
    };

    if (
      this.strategy === 'class-constructor' &&
      typeof this.config.token === 'function'
    ) {
      Object.assign(this.config.token, {
        [mark]: this,
      });
    }
  }

  createValue(...args: any[]): TTarget {
    if (this.strategy === 'class-constructor') {
      return new (this.config.token as Class<TTarget>)(...args);
    }

    if (this.config.value) {
      return this.config.value(...args);
    }

    return this.config.token as TTarget;
  }

  static create<TTarget>(
    token?: Exclude<TagDetailedConfig<TTarget>['token'], undefined>,
    config?: Omit<TagDetailedConfig<TTarget>, 'token'>,
  ) {
    return new Tag({
      ...config,
      token,
    });
  }

  static research<TTarget = any>(value: any): Tag<TTarget> | null {
    if (value instanceof Tag) {
      return value;
    }

    if (
      typeof value === 'function' &&
      mark in value &&
      value[mark] instanceof Tag
    ) {
      return value[mark];
    }

    return null;
  }
}
