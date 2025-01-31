/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Class, IsEmptyArray } from 'yummies/utils/types';

import { Container, container } from '../container.js';
import { Token } from '../token.js';

export function inject<TValue, TArgs extends any[] = []>(
  classConstructor: Class<TValue, TArgs>,
  ..._: IsEmptyArray<TArgs> extends true ? [getArgs?: (ctx: any) => TArgs] : []
): any;
export function inject<TValue, TArgs extends any[] = []>(
  token: Token<TValue, TArgs>,
  ..._: IsEmptyArray<TArgs> extends true ? [getArgs?: (ctx: any) => TArgs] : []
): any;
export function inject(value: any, ...injectArgs: any[]) {
  const usageContainer: Container =
    // @ts-ignore
    this instanceof Container ? this : container;
  return (...args: any[]): any => {
    if (args.length === 2) {
      if (args[1]?.kind) {
        return function inializer() {
          // @ts-ignore
          return usageContainer.inject(value, injectArgs[0]?.(this));
        };
      } else if (typeof args[0] === 'object' && typeof args[1] === 'string') {
        // @ts-ignore
        args[0][args[1]] = usageContainer.inject(value, injectArgs[0]?.(this));
      } else {
        throw new TypeError('not implemented');
      }
    }

    throw new Error('not implemented');
  };
}
