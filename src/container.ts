import { Class, Maybe } from 'yummies/utils/types';

import { containerMark } from './constants.js';
import { ContainerConfig } from './container.types.js';
import { tag, Tag } from './tag.js';
import { AnyTag } from './tag.types.js';
import { Destroyable } from './types.js';

export class Container implements Destroyable, Disposable {
  injections = new Map<AnyTag, any>();
  inheritInjections = new WeakMap<AnyTag, any>();
  parent?: Container;
  children = new Set<Container>();
  config: ContainerConfig;

  private static readonly transitPath: Container[] = [];
  private static lastTouchedContainer?: Container;

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

  constructor(config?: ContainerConfig & { parent?: Container }) {
    this.parent = config?.parent;
    this.config = {
      fallbackTag: config?.fallbackTag,
    };
  }

  inject<TTarget, TArgs extends any[] = []>(
    classConstructor: Class<TTarget, TArgs>,
    ...args: TArgs
  ): TTarget;

  inject<TTarget, TArgs extends any[] = []>(
    tag: Tag<TTarget, TArgs>,
    ...args: TArgs
  ): TTarget;

  inject(firstArg: any, ...args: any[]): any {
    let targetContainer: Container = this;

    const lastContainer = Container.transitPath.at(-1);

    let tag = Tag.search(firstArg);

    if (!tag) {
      if (targetContainer.config.fallbackTag) {
        const newTagOrConfig = targetContainer.config.fallbackTag(firstArg);
        tag =
          newTagOrConfig instanceof Tag
            ? newTagOrConfig
            : Tag.create(newTagOrConfig);
      } else {
        throw new Error('tag not found');
      }
    }

    let transitPathIndex: Maybe<number>;

    switch (tag.scope) {
      case 'container': {
        const parentContainer = lastContainer ?? this;
        targetContainer = parentContainer.extend();
        transitPathIndex = Container.transitPath.push(targetContainer) - 1;
        break;
      }
      case 'singleton': {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
        break;
      }
    }

    let injection: any;

    Container.lastTouchedContainer = targetContainer;

    if (targetContainer.inheritInjections.has(tag)) {
      injection = targetContainer.inheritInjections.get(tag)!;
    } else if (targetContainer.injections.has(tag)) {
      injection = targetContainer.injections.get(tag)!;
    } else {
      let inheritInjection: any;

      if (tag.scope === 'container') {
        inheritInjection = Container.getFromTransitPath(tag);
      }

      if (inheritInjection) {
        targetContainer.inheritInjections.set(tag, inheritInjection);
        injection = inheritInjection;
      } else {
        injection = tag.createValue(args as any);
        targetContainer.injections.set(tag, injection);
        tag.containersInUse.add(targetContainer);
      }
    }

    if (!(containerMark in injection)) {
      Object.defineProperty(injection!, containerMark, {
        value: targetContainer,
        configurable: true,
        writable: false,
        enumerable: false,
      });
    }
    if (tag.scope === 'container' && typeof transitPathIndex === 'number') {
      Container.transitPath.splice(transitPathIndex, 1);
    }

    return injection;
  }

  get<TTarget, TArgs extends any[] = []>(tag: Tag<TTarget, TArgs>): TTarget {
    const value = this.injections.get(tag) ?? this.inheritInjections.get(tag);

    if (!value) {
      throw new Error('value not found');
    }

    return value;
  }

  private static getFromTransitPath(tag: AnyTag): Maybe<Container> {
    for (let i = this.transitPath.length - 1; i >= 0; i--) {
      const container = this.transitPath[i];
      if (container.injections.has(tag)) {
        return container.injections.get(tag)!;
      }

      for (const child of container.children) {
        if (child.injections.has(tag)) {
          return child.injections.get(tag)!;
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

        container.injections.forEach((value, tag) => {
          tag.destroyValue(value);
          tag.containersInUse.delete(container);

          if (Container.search(value) === container) {
            delete value[containerMark];
          }
        });
        container.injections.clear();

        if (Container.lastTouchedContainer === container) {
          Container.lastTouchedContainer = undefined;
        }
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

  register = tag;

  [Symbol.dispose](): void {
    this.destroy();
  }
}

export const container = new Container();
