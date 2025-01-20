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

    if (this.config.strategy) {
      this.strategy = this.config.strategy;
    } else if (typeof this.config.token === 'function') {
      this.strategy = 'class-constructor';
      this.config.classConstructor = this.config.token;
    } else if (this.config.classConstructor) {
      this.strategy = 'class-constructor';
    } else {
      this.strategy = 'token';
    }

    this.injectConfig = {
      __: this.config.__,
      scope: this.config.scope ?? 'transient',
    };

    if (this.strategy === 'class-constructor') {
      Object.assign(this.config.classConstructor!, {
        [mark]: this,
      });
    }
  }

  createValue(...args: any[]): TTarget {
    if (this.strategy === 'class-constructor') {
      return new this.config.classConstructor!(...args);
    }

    if (this.config.value) {
      return this.config.value(...args);
    }

    return this.config.token as TTarget;
  }

  static create<TTarget, TArgs extends any[] = any[]>(
    token?: Exclude<TagDetailedConfig<TTarget, TArgs>['token'], undefined>,
    config?: Omit<TagDetailedConfig<TTarget, TArgs>, 'token'>,
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
