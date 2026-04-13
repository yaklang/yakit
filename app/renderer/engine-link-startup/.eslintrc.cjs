/** ESLint 8 + TS/TSX（偏宽松，与历史代码共存；类型安全以 tsc 为准） */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:react/jsx-runtime'
  ],
  settings: {
    react: { version: '18.2' }
  },
  rules: {
    'no-empty': 'warn',
    'no-unused-vars': 'off',
    'prefer-const': 'warn',
    'no-var': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-fallthrough': 'warn',
    'no-async-promise-executor': 'warn',
    'no-extra-semi': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react/no-unknown-property': ['error', { ignore: ['css'] }]
  },
  ignorePatterns: ['dist', 'node_modules', 'scripts']
}
