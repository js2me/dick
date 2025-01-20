import { TagConfig } from './tag.types';

export class Tag<TTarget> {
  protected constructor(private config: TagConfig<TTarget>) {}

  static create<TTarget>(config: TagConfig<TTarget>) {
    return new Tag(config);
  }
}
