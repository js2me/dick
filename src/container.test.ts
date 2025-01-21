import { LinkedAbortController } from 'linked-abort-controller';
import { describe, expect, it, vi } from 'vitest';

import { Container } from './container.js';
import { ContainerConfig } from './container.types.js';

const createContainerMock = () => {
  const counter = (() => {
    let counter = 0;
    return () => ++counter;
  })();

  return class ContainerMock extends Container<ContainerMock> {
    static readonly contstructorSpy = vi.fn();

    constructor(config?: ContainerConfig<ContainerMock>) {
      super({
        ...config,
        generateId: () => `${counter()}`,
      });
      ContainerMock.contstructorSpy();
    }

    get _children(): ContainerMock[] {
      return this.children as any[];
    }

    get _parent() {
      return this.parent as ContainerMock | undefined;
    }

    get _dependencies() {
      return [...this.dependencies.values()];
    }

    _findContainer(instance: any) {
      return super.getContainer<ContainerMock>(instance);
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
      __: { id: 'singleton' },
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

    expect(container._parent).toBeUndefined();
    expect(container._children).toHaveLength(1); // Container for Main
    expect(container._dependencies.length).toBe(0);

    const mainContainerExpect = container._children[0];

    expect(mainContainerExpect._dependencies.length).toBe(2);
    expect(mainContainerExpect._dependencies[0]).toBeInstanceOf(
      ContaineredEntity,
    );
    expect(mainContainerExpect._dependencies[1]).toBeInstanceOf(Main);

    // expect(mainContainerExpect._children.length).toBe(3);
    // expect(mainContainerExpect._children[0]._dependencies.length).toBe(1);
    // expect(mainContainerExpect._children[1]._dependencies.length).toBe(1);
    // expect(mainContainerExpect._children[2]._dependencies.length).toBe(1);
  });

  it('complex', () => {
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

    container.register(AbortController, { scope: 'container' });

    class AnimalDetails {
      static readonly contstructorSpy = vi.fn();

      protected abortController = container.inject(AbortController);

      constructor(private config: { name: string }) {
        AnimalDetails.contstructorSpy();
      }

      get name() {
        return this.config.name;
      }
    }

    container.register(AnimalDetails);

    class Dog {
      static readonly contstructorSpy = vi.fn();

      protected abortController = container.inject(AbortController);

      details = container.inject(AnimalDetails, { name: 'Fluffy' });

      details1 = container.inject(AnimalDetails, { name: 'Borya' });

      constructor() {
        Dog.contstructorSpy();
      }
    }

    container.register(Dog);

    const dog = container.inject(Dog);

    expect(dog.details.name).toBe('Fluffy');
    expect(dog).toBeInstanceOf(Dog);
    expect(AbortController.contstructorSpy).toBeCalledTimes(1);
    expect(AnimalDetails.contstructorSpy).toBeCalledTimes(2);
    expect(Dog.contstructorSpy).toBeCalledTimes(1);
    expect(ContainerMock.contstructorSpy).toBeCalledTimes(4);
  });

  it('destroy', () => {
    const ContainerMock = createContainerMock();
    const container = new ContainerMock({
      containerConstructor: ContainerMock,
    });

    class Deep1 {
      destroy() {
        container.destroy(this);
      }
    }
    container.register(Deep1, { scope: 'transient' });

    class Deep2 {
      deep1 = container.inject(Deep1);
      destroy() {
        container.destroy(this);
      }
    }
    container.register(Deep2, { scope: 'transient' });

    class Deep3 {
      deep3 = container.inject(Deep2);
      destroy() {
        container.destroy(this);
      }
    }
    container.register(Deep3, { scope: 'transient' });

    class Deep4 {
      deep3 = container.inject(Deep3);
      destroy() {
        container.destroy(this);
      }
    }
    container.register(Deep4, { scope: 'transient' });

    class Deep5 {
      deep4 = container.inject(Deep4);
      destroy() {
        container.destroy(this);
      }
    }
    container.register(Deep5, { scope: 'transient' });

    const deep5 = container.inject(Deep5);
    const deep5Container = container._findContainer(deep5)!;

    const collections = {
      deep5: {
        instance: deep5,
        container: deep5Container,
      },
      deep4: {
        instance: deep5Container._children[0]._dependencies[0] as Deep4,
        container: deep5Container._children[0],
      },
      deep3: {
        instance: deep5Container._children[0]._children[0]
          ._dependencies[0] as Deep3,
        container: deep5Container._children[0]._children[0],
      },
      deep2: {
        instance: deep5Container._children[0]._children[0]._children[0]
          ._dependencies[0] as Deep2,
        container: deep5Container._children[0]._children[0]._children[0],
      },
      deep1: {
        instance: deep5Container._children[0]._children[0]._children[0]
          ._children[0]._dependencies[0] as Deep2,
        container:
          deep5Container._children[0]._children[0]._children[0]._children[0],
      },
    };

    deep5.destroy();

    expect(collections.deep1.container._dependencies.length).toBe(0);
    expect(collections.deep1.container._children.length).toBe(0);
    expect(collections.deep1.container._parent).toBeUndefined();

    expect(collections.deep2.container._dependencies.length).toBe(0);
    expect(collections.deep2.container._children.length).toBe(0);
    expect(collections.deep2.container._parent).toBeUndefined();

    expect(collections.deep3.container._dependencies.length).toBe(0);
    expect(collections.deep3.container._children.length).toBe(0);
    expect(collections.deep3.container._parent).toBeUndefined();

    expect(collections.deep4.container._dependencies.length).toBe(0);
    expect(collections.deep4.container._children.length).toBe(0);
    expect(collections.deep4.container._parent).toBeUndefined();

    expect(collections.deep5.container._dependencies.length).toBe(0);
    expect(collections.deep5.container._children.length).toBe(0);
    expect(collections.deep5.container._parent).toBeUndefined();

    expect(container._children.length).toBe(0);
  });

  it('tag (simple)', () => {
    const ContainerMock = createContainerMock();
    const container = new ContainerMock({
      containerConstructor: ContainerMock,
    });

    type Kek = 1;

    const tag = container.register<Kek>({
      value: () => 1,
    });

    const value = container.inject(tag) satisfies 1;

    expect(value).toBe(1);
  });
});
