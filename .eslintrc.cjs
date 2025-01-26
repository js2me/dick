const packageJson = require('./package.json');

module.exports = {
  extends: [require.resolve('js2me-eslint-config')],
  rules: {
    'unicorn/prevent-abbreviations': 'off',
    'sonarjs/no-redundant-optional': 'off',
    'sonarjs/deprecation': 'off',
    'sonarjs/todo-tag': 'warn',
    'unicorn/no-this-assignment': 'off',
    'sonarjs/assertions-in-tests': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    'sonarjs/no-commented-code': 'off'
  },
};
