/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { LinkedAbortController } from 'linked-abort-controller';
import { Class, Maybe } from 'yummies/utils/types';

export interface ContainerConfig {
  abortSignal?: AbortSignal;
  parent?: Container;
  containerConstructor?: Class<any>;
  id?: string;
  generateId?: () => string;
}

interface DebugConfig extends Pick<ContainerConfig, 'id'> {}

interface InjectRegisterConfig {
  scope?: 'singleton' | 'transient' | 'container';
  __?: DebugConfig;
}

const defaultInjectRegisterConfig: InjectRegisterConfig = {
  scope: 'transient',
};

const mark = Symbol('di');

export class Container {
  protected id: string;
  protected abortController: LinkedAbortController;
  protected dependencies: Map<Class<any>, any>;
  protected children: Container[];
  protected parent?: Container;
  /**
   * Полный путь исполнения контейнера
   */
  protected path: Container[];

  constructor(private config?: ContainerConfig) {
    this.path = [];
    this.id = config?.id ?? config?.generateId?.() ?? crypto.randomUUID();
    this.abortController = new LinkedAbortController(config?.abortSignal);
    this.dependencies = new Map();
    this.parent = config?.parent;
    this.children = [];

    this.abortController.signal.addEventListener('abort', () => {
      this.destroy();
    });

    this.inject = this.inject.bind(this);
    this.register = this.register.bind(this);
  }

  inject<TConstructor extends Class<any>>(
    Constructor: TConstructor,
    ...args: TConstructor extends Class<any, infer TArgs> ? TArgs : []
  ): TConstructor extends Class<infer TInstance> ? TInstance : never {
    const injectConfig = this.getInjectConfig(Constructor);

    const currentContainer = this.path.at(-1) ?? this;

    if (!injectConfig) {
      throw new Error(`Class ${Constructor.name} is not registered for DI`);
    }

    switch (injectConfig.scope) {
      case 'singleton': {
        const resolved = rootContainer.resolve(Constructor);

        if (resolved) {
          return resolved;
        }

        const instance = rootContainer.createInstance(
          Constructor,
          args,
          rootContainer,
          injectConfig.__,
        );

        return instance;
      }
      case 'container': {
        // eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
        let treeContainer: Maybe<Container> = currentContainer;

        while (treeContainer) {
          const resolved = treeContainer.resolve(Constructor);
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
      Constructor,
      args,
      currentContainer,
      injectConfig.__,
    );

    return instance;
  }

  register<TConstructor extends Class<any>>(
    Constructor: TConstructor,
    config?: InjectRegisterConfig,
  ): TConstructor {
    Object.assign(Constructor, {
      [mark]: config || defaultInjectRegisterConfig,
    });

    return Constructor;
  }

  resolve<TConstructor extends Class<any>>(
    Constructor: TConstructor,
  ): (TConstructor extends Class<infer TInstance> ? TInstance : never) | null {
    if (this.dependencies.has(Constructor)) {
      return this.dependencies.get(Constructor)!;
    }

    let instance: any = null;

    for (const child of this.children) {
      if (child.dependencies.has(Constructor)) {
        instance = child.dependencies.get(Constructor)!;
      }
    }

    return instance;
  }

  isInjectable(Constructor: Class<any>) {
    return !!this.getInjectConfig(Constructor);
  }

  protected extend(config?: Partial<Omit<ContainerConfig, 'parent' | 'id'>>) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    let ContainerConstructor: typeof Container;

    if (config?.containerConstructor) {
      ContainerConstructor = config.containerConstructor;
    } else if (this.config?.containerConstructor) {
      ContainerConstructor = this.config.containerConstructor;
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

  protected getInjectConfig(Constructor: Class<any>) {
    if (mark in Constructor) {
      return Constructor[mark] as InjectRegisterConfig;
    }

    return null;
  }

  protected getContainerFromInstance(instance: any) {
    if (mark in instance) {
      return instance[mark] as Container;
    }

    return null;
  }

  protected createInstance(
    Constructor: Class<any, any[]>,
    args: any[],
    parent: Container,
    config?: Partial<ContainerConfig>,
  ) {
    const container = parent.extend(config);

    const index = this.path.push(container) - 1;

    const instance = new Constructor(...args);

    instance[mark] = container;

    container.dependencies.set(Constructor, instance);

    this.path.splice(index);

    return instance;
  }

  destroy(instance?: any) {
    if (!instance && !this.parent) {
      throw new Error('You can destroy root container, please pass instance');
    }

    let targetToDestroy;

    if (instance instanceof Container) {
      targetToDestroy = instance;
    } else {
      targetToDestroy = this.getContainerFromInstance(instance) ?? this;
    }

    targetToDestroy.dependencies.clear();
    targetToDestroy.children.forEach((child) => child.destroy());

    delete targetToDestroy.parent;
  }
}

const rootContainer = new Container();

export const container = rootContainer;

export const { inject, register } = container;
