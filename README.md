<img src="assets/logo.png" align="right" height="156" alt="logo" />

# Mobidic - Dependency Injection Container (WIP)  

[![NPM version][npm-image]][npm-url] [![build status][github-build-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundlephobia-image]][bundlephobia-url]


[npm-image]: http://img.shields.io/npm/v/mobidic.svg
[npm-url]: http://npmjs.org/package/mobidic
[github-build-actions-image]: https://github.com/js2me/mobidic/workflows/Build/badge.svg
[github-actions-url]: https://github.com/js2me/mobidic/actions
[download-image]: https://img.shields.io/npm/dm/mobidic.svg
[download-url]: https://npmjs.org/package/mobidic
[bundlephobia-url]: https://bundlephobia.com/result?p=mobidic
[bundlephobia-image]: https://badgen.net/bundlephobia/minzip/mobidic



```ts
import { container } from 'mobidic'

class Fruits {}
container.register(Fruits, { scope: 'transient' })

container.inject(Fruits)
```