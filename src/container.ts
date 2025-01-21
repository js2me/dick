/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { LinkedAbortController } from 'linked-abort-controller';
import { Class, Maybe } from 'yummies/utils/types';

import { ContainerConfig } from './container.types.js';
import { Tag } from './tag.js';
import { TagConfig, TagDetailedConfig } from './tag.types.js';

const mark = Symbol('di-container');

export class Container<TContainerInstance = any> {
  protected id: string;
  protected abortController: LinkedAbortController;
  protected dependencies: Map<Tag<any>, any>;
  protected children: Container[];
  protected parent?: Container;
  /**
   * Полный путь исполнения контейнера
   */
  protected path: Container[];

  constructor(private config?: ContainerConfig<TContainerInstance>) {
    this.path = [];
    this.id = config?.id ?? config?.generateId?.() ?? crypto.randomUUID();
    this.abortController = new LinkedAbortController(config?.abortSignal);
    this.dependencies = new Map();
    this.parent = config?.parent;
    this.children = [];

    this.abortController.signal.addEventListener('abort', () => {
      this.destroy();
    });
  }

  inject<TConstructor extends Class<any>>(
    Constructor: TConstructor,
    ...args: TConstructor extends Class<any, infer TArgs> ? TArgs : []
  ): TConstructor extends Class<infer TInstance> ? TInstance : never;

  inject<TTag extends Tag<any>>(
    tag: TTag,
    ...args: TTag extends Tag<any, infer TArgs> ? TArgs : []
  ): TTag extends Tag<infer TTarget> ? TTarget : never;

  inject<TConstructor extends Class<any>>(
    Constructor: TConstructor,
    ...args: TConstructor extends Class<any, infer TArgs> ? TArgs : []
  ): TConstructor extends Class<infer TInstance> ? TInstance : never {
    const tag = this.getTag(Constructor);

    const currentContainer = this.path.at(-1) ?? this;

    if (!tag) {
      throw new Error(`Class ${Constructor.name} is not registered for DI`);
    }

    switch (tag.injectConfig.scope) {
      case 'singleton': {
        const resolved = rootContainer.get(Constructor);

        if (resolved) {
          return resolved;
        }

        const instance = rootContainer.createInstance(
          tag,
          args,
          rootContainer,
          tag.injectConfig.__,
        );

        return instance;
      }
      case 'container': {
        // eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
        let treeContainer: Maybe<Container> = currentContainer;

        while (treeContainer) {
          const resolved = treeContainer.get(Constructor);
          if (resolved) {
            return resolved;
          }
          treeContainer = treeContainer.parent;
        }

        break;
      }
      default: {
        break;
      }
    }

    const instance = this.createInstance(
      tag,
      args,
      currentContainer,
      tag.injectConfig.__,
    );

    return instance;
  }

  register<TConstructor extends Class<any>>(
    Constructor: TConstructor,
    config?: Omit<TagDetailedConfig<TConstructor>, 'token'>,
  ): Tag<TConstructor extends Class<infer TInstance> ? TInstance : never>;

  register<TTarget>(target: TagConfig<TTarget>): Tag<TTarget>;

  register(constructorOrTagConfig: any, config?: any): any {
    if (typeof constructorOrTagConfig === 'function') {
      const tag = Tag.create(constructorOrTagConfig, { ...config });
      return tag;
    }

    const { token, ...tagConfig } = constructorOrTagConfig || {};

    return Tag.create(token, tagConfig);
  }

  private get<TConstructor extends Class<any>>(
    Constructor: TConstructor,
  ): (TConstructor extends Class<infer TInstance> ? TInstance : never) | null {
    const tag = Tag.research(Constructor);

    if (!tag) {
      return null;
    }

    if (this.dependencies.has(tag)) {
      return this.dependencies.get(tag)!;
    }

    let instance: any = null;

    for (const child of this.children) {
      if (child.dependencies.has(tag)) {
        instance = child.dependencies.get(tag)!;
      }
    }

    return instance;
  }

  isInjectable(Constructor: Class<any>) {
    return !!this.getTag(Constructor);
  }

  protected extend(config?: Partial<Omit<ContainerConfig, 'parent' | 'id'>>) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    let ContainerConstructor: typeof Container;

    if (config?.containerConstructor) {
      ContainerConstructor = config.containerConstructor;
    } else if (this.config?.containerConstructor) {
      ContainerConstructor = this.config.containerConstructor as any;
    } else {
      ContainerConstructor = Container;
    }

    const container = new ContainerConstructor({
      ...this.config,
      ...config,
      parent: this,
    });

    container.path = this.path;
    container.abortController.link(this.abortController.signal);

    this.children.push(container);

    return container;
  }

  protected getTag(value: any) {
    return Tag.research(value);
  }

  protected getContainer<T extends Container = Container>(instance: any) {
    if (mark in instance) {
      return instance[mark] as T;
    }

    return null;
  }

  protected createInstance(
    tag: Tag<any>,
    args: any[],
    currentContainer: Container,
    config?: Partial<ContainerConfig>,
  ) {
    const container = currentContainer.extend(config);

    const index = this.path.push(container) - 1;

    const instance = tag.createValue(...args);

    if (tag.strategy === 'class-constructor') {
      Object.defineProperty(instance, mark, {
        value: container,
        configurable: false,
        writable: false,
        enumerable: false,
      });
    }

    container.dependencies.set(tag, instance);

    this.path.splice(index);

    return instance;
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  destroy(instance?: any) {
    let destroyTarget: Container;

    if (instance == null) {
      // eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
      destroyTarget = this;
    } else if (instance instanceof Container) {
      destroyTarget = instance;
    } else {
      destroyTarget = this.getContainer(instance) ?? this;
    }

    if (destroyTarget === rootContainer) {
      throw new Error("You can't destroy root container, please pass instance");
    }

    destroyTarget.dependencies.clear();

    while (destroyTarget) {
      while (destroyTarget.children.length > 0) {
        const child = destroyTarget.children.shift();
        child?.destroy();
      }

      if (destroyTarget.parent) {
        const thisIndexInParent =
          destroyTarget.parent.children.indexOf(destroyTarget);

        if (thisIndexInParent !== -1) {
          destroyTarget.parent.children.splice(thisIndexInParent, 1);
        }

        const parentDepsMap = destroyTarget.parent.dependencies;

        parentDepsMap.forEach((parentDep, tag) => {
          const dependencyContainer = this.getContainer(parentDep);

          if (destroyTarget && dependencyContainer === destroyTarget) {
            parentDepsMap.delete(tag);
          }
        });

        if (destroyTarget.parent === rootContainer) {
          return;
        } else {
          const destroyedTarget = destroyTarget;

          destroyTarget = destroyTarget.parent;

          delete destroyedTarget.parent;
        }
      } else {
        return;
      }
    }
  }
}

export const rootContainer = new Container();
