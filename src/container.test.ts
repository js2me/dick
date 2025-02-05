/* eslint-disable sonarjs/constructor-for-side-effects */
import { LinkedAbortController } from 'linked-abort-controller';
import { describe, expect, it } from 'vitest';

import { Container } from './container.js';
import { injectable as injectableLib } from './decorators/injectable.js';
import { Token } from './token.js';
import { TokenConfig } from './token.types.js';

describe('Container', () => {
  class ContainerMock extends Container {}

  class TokenMock<TValue, TArgs extends any[] = []> extends Token<
    TValue,
    TArgs
  > {
    containersInUse: Set<Container>;

    constructor(config: TokenConfig<TValue, TArgs>) {
      super(config);
      this.containersInUse = new Set();
    }
  }

  it('complex test (values comparison)', () => {
    const container = new ContainerMock();

    class Singleton {}
    new TokenMock({ key: Singleton, scope: 'singleton' });

    class Aborter extends LinkedAbortController {
      singleton = container.inject(Singleton);
    }
    new TokenMock({ key: Aborter, scope: 'container' });

    class Transient {
      singleton = container.inject(Singleton);

      constructor(public value: string) {}
    }
    new TokenMock({ key: Transient, scope: 'transient' });

    class A {
      singleton = container.inject(Singleton);
      aborter = container.inject(Aborter);
      transient = container.inject(Transient, 'dep-a');
    }
    new TokenMock({ key: A, scope: 'container' });

    class B {
      singleton = container.inject(Singleton);
      aborter = container.inject(Aborter);
      a = container.inject(A);
      transient = container.inject(Transient, 'dep-b');
    }
    new TokenMock({ key: B, scope: 'container' });

    class C {
      singleton = container.inject(Singleton);
      aborter = container.inject(Aborter);
      a = container.inject(A);
      b = container.inject(B);
      transient = container.inject(Transient, 'dep-c');
    }
    new TokenMock({ key: C, scope: 'container' });

    const c = container.inject(C);

    expect(c).toBeInstanceOf(C);
    expect(c.a).toBeInstanceOf(A);
    expect(c.b).toBeInstanceOf(B);
    expect(c.aborter).toBeInstanceOf(Aborter);
    expect(c.transient).toBeInstanceOf(Transient);

    expect(c.singleton).toBeInstanceOf(Singleton);
    expect(c.a.singleton).toBeInstanceOf(Singleton);
    expect(c.b.singleton).toBeInstanceOf(Singleton);
    expect(c.b.a.singleton).toBeInstanceOf(Singleton);
    expect(c.aborter.singleton).toBeInstanceOf(Singleton);
    expect(c.transient.singleton).toBeInstanceOf(Singleton);

    expect(c.a.aborter).toBeInstanceOf(Aborter);
    expect(c.a.transient).toBeInstanceOf(Transient);

    expect(c.b.aborter).toBeInstanceOf(Aborter);
    expect(c.b.transient).toBeInstanceOf(Transient);
    expect(c.b.a).toBeInstanceOf(A);
    expect(c.b.a.aborter).toBeInstanceOf(Aborter);
    expect(c.b.a.transient).toBeInstanceOf(Transient);

    expect(c.a.transient.value).toBe('dep-a');
    expect(c.b.transient.value).toBe('dep-b');
    expect(c.transient.value).toBe('dep-c');

    expect(c.b.a.aborter).toBeInstanceOf(Aborter);
    expect(c.b.a.aborter).toBe(c.b.aborter);
    expect(c.b.a.aborter).toBe(c.aborter);

    expect(c.b.a.transient.singleton).toBe(c.singleton);
  });

  it('complex test (destroy)', () => {
    const container = new ContainerMock();

    class Singleton {}
    const tokenSingleton = new TokenMock({
      key: Singleton,
      scope: 'singleton',
    });

    class Aborter extends LinkedAbortController {
      singleton = container.inject(Singleton);
    }
    const tokenAborter = new TokenMock({ key: Aborter, scope: 'container' });

    class Transient {
      singleton = container.inject(Singleton);
      constructor(public value: string) {}
    }
    const tokenTransient = new TokenMock({
      key: Transient,
      scope: 'transient',
    });

    class A {
      singleton = container.inject(Singleton);
      aborter = container.inject(Aborter);
      transient = container.inject(Transient, 'dep-a');
    }
    const tokenA = new TokenMock({ key: A, scope: 'container' });

    class B {
      singleton = container.inject(Singleton);
      aborter = container.inject(Aborter);
      a = container.inject(A);
      transient = container.inject(Transient, 'dep-b');
    }
    const tokenB = new TokenMock({ key: B, scope: 'container' });

    class C {
      singleton = container.inject(Singleton);
      aborter = container.inject(Aborter);
      a = container.inject(A);
      b = container.inject(B);
      transient = container.inject(Transient, 'dep-c');
    }
    const tokenC = new TokenMock({ key: C, scope: 'container' });

    const c = container.inject(C);

    const aContainer = Container.search(c.a)!;
    const bContainer = Container.search(c.b)!;
    const cContainer = Container.search(c)!;

    container.destroy(c);

    expect(Container.search(c)).toBeNull();
    expect(Container.search(c.a)).toBeNull();
    expect(Container.search(c.a.aborter)).toBeNull();
    expect(Container.search(c.b)).toBeNull();
    expect(Container.search(c.b.aborter)).toBeNull();
    expect(Container.search(c.b.a)).toBeNull();
    expect(Container.search(c.aborter)).toBeNull();

    expect(aContainer.isEmpty).toBe(true);
    expect(bContainer.isEmpty).toBe(true);
    expect(cContainer.isEmpty).toBe(true);

    expect(tokenSingleton.containersInUse.size).toBe(1);
    expect(tokenAborter.containersInUse.size).toBe(0);
    expect(tokenTransient.containersInUse.size).toBe(0);
    expect(tokenA.containersInUse.size).toBe(0);
    expect(tokenB.containersInUse.size).toBe(0);
    expect(tokenC.containersInUse.size).toBe(0);
  });

  it('two containers with nested various things', () => {
    class Counter {
      value = 0;

      next() {
        return ++this.value;
      }
    }

    const createCounter = () => new Counter();

    class ContainerMock extends Container {
      id: string;

      extendCounter = createCounter();

      constructor(id: string, parent?: ContainerMock) {
        super({ parent });
        this.id = id;
      }

      extend(): Container {
        const child = new ContainerMock(
          this.id + `_extended${this.extendCounter.next()}`,
          this,
        );
        this.children.add(child);
        return child;
      }
    }

    const container = new ContainerMock('root');

    const injectable = injectableLib.bind(container);

    const adminKey = container.register('admin-key', {
      value: '#kek',
    });

    class TransientTest {
      constructor(public prikols: number) {}
    }
    container.register(TransientTest);

    interface IDestroyable {
      destroy(): void;
    }

    const handleDestroy = (value: any) => {
      if ('destroy' in value) {
        value.destroy();
      }
    };

    @injectable({ scope: 'scoped' })
    class ScopedCat {}

    @injectable({ scope: 'singleton', destroy: handleDestroy })
    class LoveManager implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      id = LoveManager.counter.next();

      destroy(): void {
        LoveManager.destroyedIds.add(this.id);
      }
    }

    @injectable({ scope: 'resolution', destroy: handleDestroy })
    class AborterResolution extends AbortController implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      id = AborterResolution.counter.next();

      destroy(): void {
        AborterResolution.destroyedIds.add(this.id);
        this.abort();
      }
    }

    @injectable({ scope: 'transient', destroy: handleDestroy })
    class YablokiTransient implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      id = YablokiTransient.counter.next();

      cat = container.inject(ScopedCat);

      destroy(): void {
        YablokiTransient.destroyedIds.add(this.id);
      }

      aborter = container.inject(AborterResolution);
    }

    @injectable({ scope: 'transient', destroy: handleDestroy })
    class SlivyiTransient implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      id = SlivyiTransient.counter.next();

      destroy(): void {
        SlivyiTransient.destroyedIds.add(this.id);
      }

      aborter = container.inject(AborterResolution);
    }

    @injectable({ scope: 'transient', destroy: handleDestroy })
    class RoflesTransient implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      id = RoflesTransient.counter.next();

      destroy(): void {
        RoflesTransient.destroyedIds.add(this.id);
      }

      aborter = container.inject(AborterResolution);
      box = container.inject(BoxContainer);
    }

    @injectable({ scope: 'container', destroy: handleDestroy })
    class BoxContainer implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      id = BoxContainer.counter.next();

      destroy(): void {
        BoxContainer.destroyedIds.add(this.id);
      }
      aborter = container.inject(AborterResolution);
      yabloki = container.inject(YablokiTransient);
    }

    @injectable({ scope: 'container', destroy: handleDestroy })
    class VMPandaContainer implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      adminKey = container.inject(adminKey);

      id = VMPandaContainer.counter.next();

      destroy(): void {
        VMPandaContainer.destroyedIds.add(this.id);
      }

      aborter = container.inject(AborterResolution);
      loveManager = container.inject(LoveManager);

      yabloki = container.inject(YablokiTransient);
      slivyi = container.inject(SlivyiTransient);
      rofles = container.inject(RoflesTransient);
    }

    @injectable({ scope: 'container', destroy: handleDestroy })
    class VMWormContainer implements IDestroyable {
      static readonly counter = createCounter();
      static readonly destroyedIds = new Set<number>();

      id = VMWormContainer.counter.next();

      destroy(): void {
        VMWormContainer.destroyedIds.add(this.id);
      }

      aborter = container.inject(AborterResolution);
      loveManager = container.inject(LoveManager);
      cat = container.inject(ScopedCat);

      yabloki = container.inject(YablokiTransient);
      slivyi = container.inject(SlivyiTransient);
      rofles = container.inject(RoflesTransient);

      transientTest = container.inject(TransientTest, 10);
    }

    const vmPanda = container.inject(VMPandaContainer);
    const vmWorm = container.inject(VMWormContainer);

    expect(AborterResolution.counter.value).toBe(4);
    expect(vmPanda.aborter.id).toBe(1);
    expect(vmPanda.rofles.box.aborter.id).toBe(2);
    expect(vmPanda.adminKey).toBe('#kek');

    expect(vmWorm.aborter.id).toBe(3);
    expect(vmWorm.rofles.box.aborter.id).toBe(4);
    expect(vmWorm.transientTest.prikols).toBe(10);

    expect(vmPanda.yabloki.aborter.id).toBe(1);
    expect(vmPanda.slivyi.aborter.id).toBe(1);
    expect(vmPanda.rofles.aborter.id).toBe(1);

    expect(vmWorm.yabloki.aborter.id).toBe(3);
    expect(vmWorm.slivyi.aborter.id).toBe(3);
    expect(vmWorm.rofles.aborter.id).toBe(3);

    expect(vmPanda.loveManager).toBe(vmWorm.loveManager);
    expect(vmPanda.loveManager.id).toBe(vmWorm.loveManager.id);

    expect(vmPanda.yabloki.id).toBe(1);
    expect(vmPanda.slivyi.id).toBe(1);
    expect(vmPanda.rofles.id).toBe(1);
    expect(vmPanda.rofles.box.yabloki.id).toBe(2);

    expect(vmWorm.yabloki.id).toBe(3);
    expect(vmWorm.slivyi.id).toBe(2);
    expect(vmWorm.rofles.id).toBe(2);
    expect(vmWorm.rofles.box.yabloki.id).toBe(4);

    container.destroy(vmWorm);

    expect([...AborterResolution.destroyedIds.values()]).toStrictEqual([3, 4]);
    expect([...RoflesTransient.destroyedIds.values()]).toStrictEqual([2]);
    expect([...YablokiTransient.destroyedIds.values()]).toStrictEqual([3, 4]);
    expect([...SlivyiTransient.destroyedIds.values()]).toStrictEqual([2]);
    expect([...VMPandaContainer.destroyedIds.values()]).toStrictEqual([]);
    expect([...VMWormContainer.destroyedIds.values()]).toStrictEqual([1]);
    expect([...BoxContainer.destroyedIds.values()]).toStrictEqual([2]);
    expect([...LoveManager.destroyedIds.values()]).toStrictEqual([]);

    container.destroy(vmPanda);

    expect([...AborterResolution.destroyedIds.values()]).toStrictEqual([
      3, 4, 1, 2,
    ]);
    expect([...RoflesTransient.destroyedIds.values()]).toStrictEqual([2, 1]);
    expect([...YablokiTransient.destroyedIds.values()]).toStrictEqual([
      3, 4, 1, 2,
    ]);
    expect([...SlivyiTransient.destroyedIds.values()]).toStrictEqual([2, 1]);
    expect([...VMPandaContainer.destroyedIds.values()]).toStrictEqual([1]);
    expect([...VMWormContainer.destroyedIds.values()]).toStrictEqual([1]);
    expect([...BoxContainer.destroyedIds.values()]).toStrictEqual([2, 1]);

    expect([...LoveManager.destroyedIds.values()]).toStrictEqual([]);
  });
});
