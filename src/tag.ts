import { InjectRegisterConfig } from './container.types';
import { TagConfig, TagDetailedConfig, TagStrategy } from './tag.types';

const mark = Symbol('di-tag');

export class Tag<TTarget, TArgs extends any[] = any[]> {
  injectConfig: InjectRegisterConfig;
  strategy: TagStrategy;
  config: TagDetailedConfig<TTarget>;

  protected constructor(configOrToken: TagConfig<TTarget, TArgs>) {
    this.config =
      typeof configOrToken === 'object'
        ? configOrToken
        : {
            token: configOrToken,
          };

    this.strategy = this.defineStrategy();
    this.injectConfig = this.defineInjectConfig();

    this.processConfig();
  }

  private defineInjectConfig(): InjectRegisterConfig {
    return {
      __: this.config.__,
      scope: this.config.scope ?? 'transient',
    };
  }

  private defineStrategy(): TagStrategy {
    if (this.config.strategy) {
      return this.config.strategy;
    } else if (
      typeof this.config.token === 'function' ||
      this.config.classConstructor
    ) {
      return 'class-constructor';
    } else {
      return 'token';
    }
  }

  private processConfig() {
    if (this.config.classConstructor && mark in this.config.classConstructor) {
      delete this.config.classConstructor[mark];
    }

    if (this.strategy === 'class-constructor') {
      if (typeof this.config.token === 'function') {
        this.config.classConstructor = this.config.token;
      }

      Object.defineProperty(this.config.classConstructor!, mark, {
        value: this,
        configurable: false,
        writable: false,
        enumerable: false,
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
    return new Tag<TTarget, TArgs>({
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

  override(update: Partial<TagDetailedConfig<TTarget>>) {
    Object.assign(this.config, update);

    this.strategy = this.defineStrategy();
    this.injectConfig = this.defineInjectConfig();

    this.processConfig();
  }
}
