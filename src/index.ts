/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-use-before-define */

import { rootContainer } from './container.js';

export const container = rootContainer;

export const { inject, register, destroy } = container;
