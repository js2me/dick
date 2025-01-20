/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-use-before-define */

import { rootContainer } from './container.js';
import { Tag } from './tag.js';

export const container = rootContainer;

export const inject = container.inject.bind(container);
export const register = container.register.bind(container);
export const destroy = container.destroy.bind(container);
export const tag = Tag.create;
