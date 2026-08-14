/** ESLint 9 flat config（偏宽松，与历史 .eslintrc.cjs 对齐；类型安全以 tsc 为准） */
const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const globals = require('globals')

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'scripts/**', 'eslint.config.cjs', 'src/alibaba/ali-react-table-dist/**'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
  js.configs.recommended,
  tseslint.configs.base,
  tseslint.configs.eslintRecommended,
  react.configs.flat['jsx-runtime'],
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: '18.2' },
    },
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-unused-vars': 'off',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-fallthrough': 'warn',
      'no-async-promise-executor': 'warn',
      'no-extra-semi': 'warn',
      'no-constant-binary-expression': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/no-unknown-property': ['error', { ignore: ['css', 'pid'] }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',

      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-render': 'error',
      'react-hooks/static-components': 'error',
      'react-hooks/void-use-memo': 'error',
      'react-hooks/exhaustive-effect-dependencies': 'error',
      'react-hooks/memo-dependencies': 'off',
      'react-hooks/config': 'error',
      'react-hooks/rule-suppression': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/error-boundaries': 'error',

      'no-useless-escape': 'off',
      'no-control-regex': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },
)
