import { LinkedAbortController } from 'linked-abort-controller';
import { describe, expect, it, vi } from 'vitest';

import { Container } from './container.js';
import { ContainerConfig } from './container.types.js';

const createContainerMock = () => {
  const counter = (() => {
    let counter = 0;
    return () => ++counter;
  })();

  return class ContainerMock extends Container {
    static readonly contstructorSpy = vi.fn();

    constructor(config?: ContainerConfig) {
      super({
        ...config,
        generateId: () => `${counter()}`,
      });
      ContainerMock.contstructorSpy();
    }

    getChildren(): ContainerMock[] {
      return this.children as any[];
    }

    getParent() {
      return this.parent as ContainerMock | undefined;
    }

    getDependencies() {
      return this.dependencies;
    }
  };
};

describe('Container', () => {
  it('register test', () => {
    const ContainerMock = createContainerMock();
    const container = new ContainerMock({
      containerConstructor: ContainerMock,
    });

    class AbortController extends LinkedAbortController {
      static readonly contstructorSpy = vi.fn();

      constructor(
        ...args: ConstructorParameters<typeof LinkedAbortController>
      ) {
        super(...args);
        AbortController.contstructorSpy();
      }
    }

    expect(container.isInjectable(AbortController)).toBe(false);

    container.register(AbortController);

    expect(container.isInjectable(AbortController)).toBe(true);
  });

  it('family test', () => {
    const Container = createContainerMock();
    const container = new Container({ containerConstructor: Container });

    class SingletonEntity {}
    container.register(SingletonEntity, {
      scope: 'singleton',
      __: { id: 'signleton' },
    });

    class ContaineredEntity {}
    container.register(ContaineredEntity, {
      scope: 'container',
      __: { id: 'container' },
    });

    class TransientEntity1 {
      containered = container.inject(ContaineredEntity);
      singleton = container.inject(SingletonEntity);
    }
    container.register(TransientEntity1, {
      scope: 'transient',
      __: { id: 'transient-1' },
    });

    class TransientEntity2 {
      containered = container.inject(ContaineredEntity);
      singleton = container.inject(SingletonEntity);
    }
    container.register(TransientEntity2, {
      scope: 'transient',
      __: { id: 'transient-2' },
    });

    class Main {
      containered = container.inject(ContaineredEntity);
      transient1 = container.inject(TransientEntity1);
      transient2 = container.inject(TransientEntity2);
    }
    container.register(Main, { scope: 'transient', __: { id: 'main' } });

    const main = container.inject(Main);

    expect(main.transient1.singleton).toBe(main.transient2.singleton);

    expect(container.getParent()).toBeUndefined();
    expect(container.getChildren()).toHaveLength(1); // Container for Main
    expect(container.getDependencies().size).toBe(0);

    const mainContainerExpect = container.getChildren()[0];

    expect(mainContainerExpect.getDependencies().size).toBe(1);

    const mainInstanceExpect = [
      ...mainContainerExpect.getDependencies().values(),
    ][0];

    expect(mainInstanceExpect).toBeInstanceOf(Main);
    expect(mainInstanceExpect).toBe(main);
  });

  it('complex', () => {
    const ContainerMock = createContainerMock();
    const container = new ContainerMock({
      containerConstructor: ContainerMock,
    });
    const { register, inject } = container;

    class AbortController extends LinkedAbortController {
      static readonly contstructorSpy = vi.fn();

      constructor(
        ...args: ConstructorParameters<typeof LinkedAbortController>
      ) {
        super(...args);
        AbortController.contstructorSpy();
      }
    }

    register(AbortController, { scope: 'container' });

    class AnimalDetails {
      static readonly contstructorSpy = vi.fn();

      protected abortController = inject(AbortController);

      constructor(private config: { name: string }) {
        AnimalDetails.contstructorSpy();
      }

      get name() {
        return this.config.name;
      }
    }

    register(AnimalDetails);

    class Dog {
      static readonly contstructorSpy = vi.fn();

      protected abortController = inject(AbortController);

      details = inject(AnimalDetails, { name: 'Fluffy' });

      details1 = inject(AnimalDetails, { name: 'Borya' });

      constructor() {
        Dog.contstructorSpy();
      }
    }

    register(Dog);

    const dog = inject(Dog);

    expect(dog.details.name).toBe('Fluffy');
    expect(dog).toBeInstanceOf(Dog);
    expect(AbortController.contstructorSpy).toBeCalledTimes(1);
    expect(AnimalDetails.contstructorSpy).toBeCalledTimes(2);
    expect(Dog.contstructorSpy).toBeCalledTimes(1);
    expect(ContainerMock.contstructorSpy).toBeCalledTimes(5);
  });
});
