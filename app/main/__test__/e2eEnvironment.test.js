import { describe, expect, it, vi } from 'vitest'
import path from 'path'
import { configureE2EEnvironment } from '../e2eEnvironment'

describe('configureE2EEnvironment', () => {
  it('does not change Electron paths outside E2E mode', () => {
    const app = { setPath: vi.fn() }

    expect(configureE2EEnvironment(app, {})).toEqual({ enabled: false })
    expect(app.setPath).not.toHaveBeenCalled()
  })

  it('requires an isolated userData path in E2E mode', () => {
    const app = { setPath: vi.fn() }

    expect(() => configureE2EEnvironment(app, { YAKIT_E2E: '1' })).toThrow(/YAKIT_E2E_USER_DATA is required/)
  })

  it('cannot be enabled in a production packaged application', () => {
    const app = { isPackaged: true, setPath: vi.fn() }

    expect(() =>
      configureE2EEnvironment(app, {
        YAKIT_E2E: '1',
        YAKIT_E2E_USER_DATA: path.join(path.parse(process.cwd()).root, 'tmp', 'yakit-e2e'),
      }),
    ).toThrow(/only supported by unpackaged test builds/)
    expect(app.setPath).not.toHaveBeenCalled()
  })

  it('rejects relative and filesystem-root paths', () => {
    const app = { setPath: vi.fn() }

    expect(() => configureE2EEnvironment(app, { YAKIT_E2E: '1', YAKIT_E2E_USER_DATA: 'relative/user-data' })).toThrow(
      /must be an absolute path/,
    )
    expect(() =>
      configureE2EEnvironment(app, {
        YAKIT_E2E: '1',
        YAKIT_E2E_USER_DATA: path.parse(process.cwd()).root,
      }),
    ).toThrow(/must not be a filesystem root/)
  })

  it('sets an absolute isolated userData path', () => {
    const app = { setPath: vi.fn() }
    const isolatedPath = path.join(path.parse(process.cwd()).root, 'tmp', 'yakit-electron-e2e-test', 'user-data')

    expect(
      configureE2EEnvironment(app, {
        YAKIT_E2E: '1',
        YAKIT_E2E_USER_DATA: isolatedPath,
      }),
    ).toEqual({ enabled: true, userDataPath: path.normalize(isolatedPath) })
    expect(app.setPath).toHaveBeenCalledWith('userData', path.normalize(isolatedPath))
  })
})
