// @vitest-environment node
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

const load = createRequire(path.resolve('app/renderer/src/main/package.json'))
const { transformSync } = load('@babel/core')
const {
  prepareStaticPreviewEnvironment,
  configureStaticPreviewOutput,
  assertStaticPreviewConfig,
  assertStaticPreviewJavaScript,
} = load(path.resolve('scripts/static-preview-config.cjs'))
const source = 'export function PreviewRoot() { return <main>Ready</main> }'
it('disables static preview source maps and caches without removing runtime safety checks or plugins', () => {
  const plugin = { name: 'unrelated' }
  const config = {
    devtool: 'cheap-module-source-map',
    cache: { type: 'filesystem' },
    plugins: [plugin],
    module: { rules: [] },
  }
  expect(configureStaticPreviewOutput(config)).toBe(config)
  expect(config.devtool).toBe(false)
  expect(config.cache).toBe(false)
  expect(config.plugins).toEqual([plugin])
  expect(() => assertStaticPreviewConfig(config)).not.toThrow()
  class ReactRefreshPlugin {}
  config.plugins.push(new ReactRefreshPlugin())
  expect(() => assertStaticPreviewConfig(config)).toThrow('runtime')
})
const compile = (refresh) =>
  transformSync(source, {
    filename: path.resolve('app/renderer/src/main/src/PreviewRoot.jsx'),
    babelrc: false,
    configFile: false,
    presets: [load.resolve('@babel/preset-react')],
    plugins: [
      load.resolve('@babel/plugin-transform-modules-commonjs'),
      ...(refresh ? [[load.resolve('react-refresh/babel'), { skipEnvCheck: true }]] : []),
    ],
  }).code
const run = (code) => {
  const exports = {}
  vm.runInNewContext(code, { exports, React: { createElement: (type, props, ...children) => ({ type, children }) } })
  return exports.PreviewRoot()
}

describe('static preview Refresh bootstrap', () => {
  it('reproduces the white-screen ReferenceError when only the runtime is removed', () => {
    expect(() => run(compile(true))).toThrow('$RefreshReg$ is not defined')
  })
  it('disables the transform before CRA config creation so the entry executes without Refresh globals', () => {
    const env = { FAST_REFRESH: 'true' }
    prepareStaticPreviewEnvironment(env)
    expect(env.FAST_REFRESH).toBe('false')
    const code = compile(env.FAST_REFRESH !== 'false')
    expect(code).not.toContain('$RefreshReg$')
    expect(run(code)).toMatchObject({ type: 'main', children: ['Ready'] })
  })
  it('refuses a static build containing either half of React Refresh', () => {
    expect(() =>
      assertStaticPreviewConfig({
        plugins: [],
        module: { rules: [{ oneOf: [{ options: { plugins: ['react-refresh/babel'] } }] }] },
      }),
    ).toThrow('Babel transform')
    class ReactRefreshPlugin {}
    expect(() => assertStaticPreviewConfig({ plugins: [new ReactRefreshPlugin()] })).toThrow('runtime')
    expect(() => assertStaticPreviewConfig({ plugins: [], module: { rules: [] } })).not.toThrow()
  })
  it('rejects the orphaned calls in emitted JavaScript before activation', () => {
    expect(() => assertStaticPreviewJavaScript(compile(true))).toThrow('unbound React Refresh call')
    expect(() => assertStaticPreviewJavaScript(compile(false))).not.toThrow()
  })
})
