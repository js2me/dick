/* eslint-disable sonarjs/constructor-for-side-effects */
import { LinkedAbortController } from 'linked-abort-controller';
import { describe, expect, it } from 'vitest';

import { Container } from './container.js';
import { Tag } from './tag.js';
import { TagConfig } from './tag.types.js';

describe('Container', () => {
  class ContainerMock extends Container {}

  class TagMock<TTarget, TArgs extends any[] = any[]> extends Tag<
    TTarget,
    TArgs
  > {
    containersInUse: Set<Container>;

    constructor(config: TagConfig<TTarget, TArgs>) {
      super(config);
      this.containersInUse = new Set();
    }
  }

  it('complex test (values comparison)', () => {
    const container = new ContainerMock();

    class Aborter extends LinkedAbortController {}
    new TagMock({ token: Aborter, scope: 'container' });

    class Transient {
      constructor(public value: string) {}
    }
    new TagMock({ token: Transient, scope: 'transient' });

    class A {
      aborter = container.inject(Aborter);
      transient = container.inject(Transient, 'dep-a');
    }
    new TagMock({ token: A, scope: 'container' });

    class B {
      aborter = container.inject(Aborter);
      a = container.inject(A);
      transient = container.inject(Transient, 'dep-b');
    }
    new TagMock({ token: B, scope: 'container' });

    class C {
      aborter = container.inject(Aborter);
      a = container.inject(A);
      b = container.inject(B);
      transient = container.inject(Transient, 'dep-c');
    }
    new TagMock({ token: C, scope: 'container' });

    const c = container.inject(C);

    expect(c).toBeInstanceOf(C);
    expect(c.a).toBeInstanceOf(A);
    expect(c.b).toBeInstanceOf(B);
    expect(c.aborter).toBeInstanceOf(Aborter);
    expect(c.transient).toBeInstanceOf(Transient);

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
  });

  it('complex test (destroy)', () => {
    const container = new ContainerMock();

    class Aborter extends LinkedAbortController {}
    const tagAborter = new TagMock({ token: Aborter, scope: 'container' });

    class Transient {
      constructor(public value: string) {}
    }
    const tagTransient = new TagMock({
      token: Transient,
      scope: 'transient',
    });

    class A {
      aborter = container.inject(Aborter);
      transient = container.inject(Transient, 'dep-a');
    }
    const tagA = new TagMock({ token: A, scope: 'container' });

    class B {
      aborter = container.inject(Aborter);
      a = container.inject(A);
      transient = container.inject(Transient, 'dep-b');
    }
    const tagB = new TagMock({ token: B, scope: 'container' });

    class C {
      aborter = container.inject(Aborter);
      a = container.inject(A);
      b = container.inject(B);
      transient = container.inject(Transient, 'dep-c');
    }
    const tagC = new TagMock({ token: C, scope: 'container' });

    const c = container.inject(C);

    const cContainer = Container.search(c);

    console.info('cContainer', cContainer);

    container.destroy(c);

    // expect(Container.search(c)).toBeUndefined();
    expect(tagAborter.containersInUse.size).toBe(0);
    expect(tagTransient.containersInUse.size).toBe(0);
    expect(tagA.containersInUse.size).toBe(0);
    expect(tagB.containersInUse.size).toBe(0);
    expect(tagC.containersInUse.size).toBe(0);
  });
});
