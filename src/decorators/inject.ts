/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Class, IsEmptyArray } from 'yummies/utils/types';

import { container } from '../container.js';
import { Tag } from '../tag.js';

export function inject<TTarget, TArgs extends any[] = []>(
  classConstructor: Class<TTarget, TArgs>,
  ..._: IsEmptyArray<TArgs> extends true ? [getArgs?: (ctx: any) => TArgs] : []
): any;
export function inject<TTarget, TArgs extends any[] = []>(
  tag: Tag<TTarget, TArgs>,
  ..._: IsEmptyArray<TArgs> extends true ? [getArgs?: (ctx: any) => TArgs] : []
): any;
export function inject(value: any, ...injectArgs: any[]) {
  return (...args: any[]): any => {
    if (args.length === 2) {
      if (args[1]?.kind) {
        return function inializer() {
          // @ts-ignore
          return container.inject(value, injectArgs[0]?.(this));
        };
      } else if (typeof args[0] === 'object' && typeof args[1] === 'string') {
        // @ts-ignore
        args[0][args[1]] = container.inject(value, injectArgs[0]?.(this));
      } else {
        throw new TypeError('not implemented');
      }
    }

    throw new Error('not implemented');
  };
}
