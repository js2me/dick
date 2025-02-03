import { AnyObject, Class, Maybe } from 'yummies/utils/types';

import { containerMark } from './constants.js';
import { ContainerConfig } from './container.types.js';
import { token, Token } from './token.js';
import { AnyToken } from './token.types.js';
import { Destroyable } from './types.js';

export class Container implements Destroyable, Disposable {
  injections = new Map<AnyToken, any>();
  inheritInjections = new WeakMap<AnyToken, any>();
  parent?: Container;
  children = new Set<Container>();
  config: ContainerConfig;

  private static readonly transitPath: Container[] = [];
  private static scoped: Container | null = null;

  get root(): Container {
    const parent = this.parent;

    if (!parent) {
      return this;
    }

    return parent.root;
  }

  get isRoot() {
    return this === this.root;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected resolveToken(firstArg: any, ...args: any[]) {
    const targetContainer: Container = this;

    let token = Token.search(firstArg);

    if (!token) {
      if (targetContainer.config.fallbackToken) {
        const newTokenOrConfig = targetContainer.config.fallbackToken(firstArg);
        token =
          newTokenOrConfig instanceof Token
            ? newTokenOrConfig
            : Token.create(newTokenOrConfig);
      } else {
        throw new Error('token not found');
      }
    }

    return token;
  }

  protected resolveTargetContainer(token: AnyToken) {
    const lastContainer = Container.transitPath.at(-1);
    let targetContainer: Container = this;

    switch (token.scope) {
      case 'scoped': {
        const parentContainer = Container.scoped ?? lastContainer ?? this;
        targetContainer = parentContainer.extend();
        Container.scoped = targetContainer;
        break;
      }
      case 'container': {
        const parentContainer = lastContainer ?? this;
        targetContainer = parentContainer.extend();
        Container.scoped = targetContainer;
        break;
      }
      case 'singleton': {
        targetContainer = this.root;
        break;
      }
      case 'transient': {
        if (lastContainer) {
          targetContainer = lastContainer;
        }
        break;
      }
      case 'resolution': {
        const parentContainer = lastContainer ?? this;
        targetContainer = parentContainer;
        Container.scoped = targetContainer;
        break;
      }
    }

    return targetContainer;
  }

  constructor(config?: ContainerConfig & { parent?: Container }) {
    this.parent = config?.parent;
    this.config = {
      fallbackToken: config?.fallbackToken,
    };
  }

  inject<TValue, TArgs extends any[] = []>(
    classConstructor: Class<TValue, TArgs>,
    ...args: NoInfer<TArgs>
  ): TValue;

  inject<TValue, TArgs extends any[] = []>(
    token: Token<TValue, TArgs>,
    ...args: NoInfer<TArgs>
  ): TValue;

  inject<TValue, TArgs extends any[] = []>(
    key: string | symbol,
    ...args: NoInfer<TArgs>
  ): TValue;

  inject(firstArg: any, ...args: any[]): any {
    const token = this.resolveToken(firstArg, ...args);
    const targetContainer = this.resolveTargetContainer(token);
    const processTransitPath =
      token.scope === 'container' || token.scope === 'scoped';

    let transitPathIndex: Maybe<number>;

    if (processTransitPath) {
      transitPathIndex = Container.transitPath.push(targetContainer) - 1;
    }

    let injection: any;

    if (targetContainer.inheritInjections.has(token)) {
      injection = targetContainer.inheritInjections.get(token)!;
    } else if (targetContainer.injections.has(token)) {
      injection = targetContainer.injections.get(token)!;
    } else {
      let inheritInjection: any;

      if (token.scope === 'container') {
        inheritInjection = Container.getFromTransitPath(token);
      }

      if (inheritInjection) {
        targetContainer.inheritInjections.set(token, inheritInjection);
        injection = inheritInjection;
      } else {
        injection = token.createValue(args as any);
        targetContainer.injections.set(token, injection);
        token.containersInUse.add(targetContainer);
      }
    }

    if (typeof injection === 'object' && !(containerMark in injection)) {
      Object.defineProperty(injection!, containerMark, {
        value: targetContainer,
        configurable: true,
        writable: false,
        enumerable: false,
      });
    }
    if (processTransitPath && typeof transitPathIndex === 'number') {
      Container.transitPath.splice(transitPathIndex, 1);
    }

    return injection;
  }

  get<TValue>(key: string | symbol, context?: AnyObject): TValue;
  get<TValue>(classConstructor: Class<TValue>, context?: AnyObject): TValue;
  get<TValue>(input: Token<TValue>, context?: AnyObject): TValue;

  get(input: any, context?: AnyObject): any {
    if (context) {
      return this.bind(context).get(input);
    }

    const token = Token.search(input);

    if (!token) {
      throw new Error('token not found');
    }

    let containerToSearch: Container = this;

    switch (token.scope) {
      case 'singleton': {
        containerToSearch = this.root;
        break;
      }
      case 'container':
      case 'scoped': {
        for (const child of containerToSearch.children) {
          const value =
            child.injections.get(token) ?? child.inheritInjections.get(token);

          if (value) {
            return value;
          }
        }
        break;
      }
      default: {
        break;
      }
    }

    const value =
      containerToSearch.injections.get(token) ??
      containerToSearch.inheritInjections.get(token);

    if (!value) {
      throw new Error('injection not found');
    }

    return value;
  }

  private static getFromTransitPath(token: AnyToken): Maybe<Container> {
    for (let i = this.transitPath.length - 1; i >= 0; i--) {
      const container = this.transitPath[i];
      if (container.injections.has(token)) {
        return container.injections.get(token)!;
      }

      for (const child of container.children) {
        if (child.injections.has(token)) {
          return child.injections.get(token)!;
        }
      }
    }
  }

  configure(config: Partial<ContainerConfig>) {
    Object.assign(this.config, config);
  }

  extend() {
    const child = new Container({
      ...this.config,
      parent: this,
    });
    this.children.add(child);
    return child;
  }

  bind(value: any) {
    const container = Container.search(value);

    if (!container) {
      throw new Error('container not found');
    }

    return container;
  }

  destroy(value?: any) {
    let rootContainerToDestroy: Container | undefined;

    if (value) {
      const foundContainer = Container.search(value);
      if (foundContainer) {
        rootContainerToDestroy = foundContainer;
      }
    } else {
      rootContainerToDestroy = this;
    }

    if (rootContainerToDestroy) {
      const containersToDestroy: Container[] = [rootContainerToDestroy];

      while (containersToDestroy.length > 0) {
        const container = containersToDestroy.shift()!;

        container.parent?.children.delete(container);

        containersToDestroy.push(...container.children.values());

        container.injections.forEach((value, token) => {
          token.destroyValue(value);
          token.containersInUse.delete(container);

          if (Container.search(value) === container) {
            delete value[containerMark];
          }
        });
        container.injections.clear();
      }

      const foundContainer = Container.search(value);
      if (foundContainer?.isEmpty) {
        delete value[containerMark];
      }
    }
  }

  get isEmpty() {
    return this.injections.size === 0 && this.children.size === 0;
  }

  static search(value: any): Maybe<Container> {
    if (value[containerMark]) {
      return value[containerMark];
    }

    return null;
  }

  static destroy(value: any) {
    const container = Container.search(value);
    if (container) {
      container.destroy();
    }
  }

  register = token;

  [Symbol.dispose](): void {
    this.destroy();
  }
}

export const container = new Container();
