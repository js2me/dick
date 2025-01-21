/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-use-before-define */

import { rootContainer, Container } from './container.js';
import { ContainerConfig } from './container.types.js';
import { Tag } from './tag.js';

export const container = rootContainer;

export const inject = container.inject.bind(container);
export const register = container.register.bind(container);
export const destroy = container.destroy.bind(container);
export const tag = Tag.create;

export { Container };
export type { ContainerConfig };
