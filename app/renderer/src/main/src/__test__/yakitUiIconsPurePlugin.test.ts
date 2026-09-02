import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, parseAst } from 'vite'
import { collectYakitUiIconImports, yakitUiIconsPurePlugin } from '../../../../vite-plugins/yakitUiIconsPurePlugin.mjs'

type Family = 'outline' | 'solid' | 'colorful' | 'oldicon'

type BuiltChunk = {
  type: 'chunk'
  fileName: string
  isEntry: boolean
  imports: string[]
  dynamicImports: string[]
  modules: Record<string, unknown>
}

type BuiltAsset = {
  type: 'asset'
  fileName: string
  source: string | Uint8Array
}

type BuiltOutput = BuiltChunk | BuiltAsset

const OLDICON_ENTRY_RE = /\/node_modules\/@yakit-libs\/yakit-ui-icons\/dist\/oldicon\/index\.js$/
const OLDICON_PER_ICON_MODULE_RE =
  /\/node_modules\/@yakit-libs\/yakit-ui-icons\/dist\/(?:browser\/)?oldicon\/icons\/[^/]+\.js$/
const oldIconModule = (name: string) =>
  new RegExp(`/node_modules/@yakit-libs/yakit-ui-icons/dist/(?:browser/)?oldicon/icons/${name}\\.js$`)

function importedNames(): Record<Family, Set<string>> {
  return {
    outline: new Set(),
    solid: new Set(),
    colorful: new Set(),
    oldicon: new Set(),
  }
}

function collectImports(code: string, names = importedNames()) {
  collectYakitUiIconImports(parseAst(code, { lang: 'tsx' }) as never, '/src/example.tsx', names)
  return names
}

describe('yakitUiIconsPurePlugin consumer import guard', () => {
  it('keeps lazy per-icon B outside the HTML entry A static closure and modulepreload', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const fixtureDir = await mkdtemp(path.join(testDir, 'fixtures/yakitUiIconsOldIconPerIcon-'))
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    try {
      await Promise.all([
        writeFile(
          path.join(fixtureDir, 'index.html'),
          '<div id="root"></div><script type="module" src="/entry.ts"></script>',
        ),
        writeFile(
          path.join(fixtureDir, 'entry.ts'),
          `import { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'\nconsole.log(PopoverArrowIcon)\nimport('./lazy.ts')`,
        ),
        writeFile(
          path.join(fixtureDir, 'lazy.ts'),
          `import { RocketIconFromPagesWebShellIcon } from '@yakit-libs/yakit-ui-icons/oldicon/RocketIconFromPagesWebShellIcon'\nconsole.log(RocketIconFromPagesWebShellIcon)`,
        ),
      ])

      const result = await build({
        root: fixtureDir,
        configFile: false,
        logLevel: 'silent',
        plugins: [yakitUiIconsPurePlugin()],
        build: {
          write: false,
          minify: false,
          rollupOptions: { input: path.join(fixtureDir, 'index.html') },
        },
      })
      const output = (result as { output: BuiltOutput[] }).output
      const chunks = output.filter((item): item is BuiltChunk => item.type === 'chunk')
      const chunksByFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
      const entry = chunks.find((chunk) => chunk.isEntry)
      expect(entry).toBeDefined()

      const collectStaticClosure = (roots: string[]) => {
        const closure = new Set<string>()
        const queue = [...roots]
        while (queue.length > 0) {
          const fileName = queue.shift() as string
          if (closure.has(fileName)) continue
          closure.add(fileName)
          queue.push(...(chunksByFileName.get(fileName)?.imports ?? []))
        }
        return closure
      }
      const containsModule = (closure: Set<string>, moduleRe: RegExp) =>
        [...closure].some((fileName) =>
          Object.keys(chunksByFileName.get(fileName)?.modules ?? {}).some((moduleId) =>
            moduleRe.test(moduleId.replaceAll('\\', '/')),
          ),
        )

      const entryStaticClosure = collectStaticClosure([entry!.fileName])
      const lazyStaticClosure = collectStaticClosure(entry!.dynamicImports)
      expect(containsModule(entryStaticClosure, oldIconModule('PopoverArrowIcon'))).toBe(true)
      expect(containsModule(entryStaticClosure, oldIconModule('RocketIconFromPagesWebShellIcon'))).toBe(false)
      expect(containsModule(lazyStaticClosure, oldIconModule('RocketIconFromPagesWebShellIcon'))).toBe(true)

      const html = output.find((item): item is BuiltAsset => item.type === 'asset' && item.fileName === 'index.html')
      const modulePreloads = [
        ...String(html!.source).matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g),
      ].map((match) => match[1])
      expect(modulePreloads.some((href) => [...lazyStaticClosure].some((fileName) => href.endsWith(fileName)))).toBe(
        false,
      )
      expect(info).toHaveBeenCalledWith('[yakit-ui-icons] oldicon: 2/2 factories retained')
    } finally {
      info.mockRestore()
      await rm(fixtureDir, { recursive: true, force: true })
    }
  })

  it('keeps lazy oldicon outside the HTML entry static closure in a real Vite bundle', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const fixtureDir = path.join(testDir, 'fixtures/yakitUiIconsOldIconDynamic')
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [yakitUiIconsPurePlugin()],
      build: {
        write: false,
        minify: false,
        rollupOptions: {
          input: path.join(fixtureDir, 'index.html'),
        },
      },
    })
    const output = (result as { output: BuiltOutput[] }).output
    const chunks = output.filter((item): item is BuiltChunk => item.type === 'chunk')
    const chunksByFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
    const entry = chunks.find((chunk) => chunk.isEntry)
    expect(entry).toBeDefined()

    const collectStaticClosure = (roots: string[]) => {
      const closure = new Set<string>()
      const queue = [...roots]
      while (queue.length > 0) {
        const fileName = queue.shift() as string
        if (closure.has(fileName)) continue
        closure.add(fileName)
        queue.push(...(chunksByFileName.get(fileName)?.imports ?? []))
      }
      return closure
    }

    const entryStaticClosure = collectStaticClosure([entry!.fileName])
    const lazyStaticClosure = collectStaticClosure(entry!.dynamicImports)
    const containsOldIcon = (closure: Set<string>) =>
      [...closure].some((fileName) =>
        Object.keys(chunksByFileName.get(fileName)?.modules ?? {}).some(
          (moduleId) =>
            OLDICON_ENTRY_RE.test(moduleId.replaceAll('\\', '/')) ||
            OLDICON_PER_ICON_MODULE_RE.test(moduleId.replaceAll('\\', '/')),
        ),
      )

    expect(entry!.dynamicImports).not.toHaveLength(0)
    expect(containsOldIcon(entryStaticClosure)).toBe(false)
    expect(containsOldIcon(lazyStaticClosure)).toBe(true)
    expect(
      [...lazyStaticClosure].some((fileName) =>
        Object.keys(chunksByFileName.get(fileName)?.modules ?? {}).some((moduleId) =>
          moduleId.replaceAll('\\', '/').endsWith('/yakitUiIconsOldIconDynamic/lazyOldIcon.ts'),
        ),
      ),
    ).toBe(true)

    const html = output.find((item): item is BuiltAsset => item.type === 'asset' && item.fileName === 'index.html')
    expect(html).toBeDefined()
    const htmlSource = String(html!.source)
    const modulePreloads = [...htmlSource.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g)].map(
      (match) => match[1],
    )
    expect(modulePreloads.some((href) => [...lazyStaticClosure].some((fileName) => href.endsWith(fileName)))).toBe(
      false,
    )
  })

  it('reports every synchronous oldicon entry and importer in one deterministic error', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const fixtureDir = path.join(testDir, 'fixtures/yakitUiIconsOldIconSync')
    let errorMessage = ''

    try {
      await build({
        root: fixtureDir,
        configFile: false,
        logLevel: 'silent',
        plugins: [yakitUiIconsPurePlugin()],
        build: {
          write: false,
          minify: false,
          rollupOptions: {
            input: {
              index: path.join(fixtureDir, 'index.html'),
              secondary: path.join(fixtureDir, 'secondary.html'),
            },
          },
        },
      })
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
    }

    expect(errorMessage).toContain('oldicon startup closure violations:')
    const violations = errorMessage.split('\n').filter((line) => line.startsWith('entry='))
    expect(violations).toHaveLength(2)
    expect(violations).toEqual([...violations].sort())
    expect(
      violations.every((line) =>
        /entry=.*; chunk=.*; module=@yakit-libs\/yakit-ui-icons\/oldicon; importers=/.test(line),
      ),
    ).toBe(true)

    const indexViolation = violations.find((line) => /entry=.*index/.test(line))
    expect(indexViolation).toContain('/yakitUiIconsOldIconSync/entry.ts')
    expect(indexViolation).toContain('/yakitUiIconsOldIconSync/secondOldIconImporter.ts')
    expect(indexViolation?.match(/yakitUiIconsOldIconSync\/entry\.ts/g)).toHaveLength(1)
    expect(indexViolation?.match(/yakitUiIconsOldIconSync\/secondOldIconImporter\.ts/g)).toHaveLength(1)

    const secondaryViolation = violations.find((line) => /entry=.*secondary/.test(line))
    expect(secondaryViolation).toContain('/yakitUiIconsOldIconSync/secondaryEntry.ts')
    expect(secondaryViolation).not.toContain('/yakitUiIconsOldIconSync/entry.ts')
    expect(secondaryViolation).not.toContain('/yakitUiIconsOldIconSync/secondOldIconImporter.ts')
  })

  it('does not treat a business displayName string as retained oldicon evidence', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const fixtureDir = path.join(testDir, 'fixtures/yakitUiIconsOldIconFalsePositive')
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    try {
      await expect(
        build({
          root: fixtureDir,
          configFile: false,
          logLevel: 'silent',
          plugins: [yakitUiIconsPurePlugin()],
          build: {
            write: false,
            minify: false,
            rollupOptions: {
              input: path.join(fixtureDir, 'index.html'),
            },
          },
        }),
      ).rejects.toThrow(
        'yakit-ui-icons oldicon imported public name was not retained: PopoverArrowIcon -> PopoverArrowIcon',
      )
      expect(info).not.toHaveBeenCalledWith(expect.stringMatching(/^\[yakit-ui-icons\] oldicon:/))
    } finally {
      info.mockRestore()
    }
  })

  it('fails when generated HTML modulepreloads the actual lazy oldicon chunk', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const fixtureDir = path.join(testDir, 'fixtures/yakitUiIconsOldIconDynamic')

    await expect(
      build({
        root: fixtureDir,
        configFile: false,
        logLevel: 'silent',
        plugins: [
          {
            name: 'inject-oldicon-modulepreload',
            transformIndexHtml(html) {
              return `${html}<link href="/base/assets/lazyOldIcon.js?v=1" rel="modulepreload">`
            },
          },
          yakitUiIconsPurePlugin(),
        ],
        build: {
          write: false,
          minify: false,
          rollupOptions: {
            input: path.join(fixtureDir, 'index.html'),
            output: {
              entryFileNames: 'assets/[name].js',
              chunkFileNames: 'assets/[name].js',
            },
          },
        },
      }),
    ).rejects.toThrow(/oldicon HTML modulepreload violations:[\s\S]*html=index\.html/)
  })

  it('fails when HTML modulepreloads a lazy wrapper whose static closure reaches a shared oldicon chunk', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const fixtureDir = path.join(testDir, 'fixtures/yakitUiIconsOldIconShared')

    await expect(
      build({
        root: fixtureDir,
        configFile: false,
        logLevel: 'silent',
        plugins: [
          {
            name: 'assert-and-preload-shared-oldicon-wrapper',
            transformIndexHtml(html) {
              return `${html}<link rel="modulepreload" href="/assets/lazyFirstOldIcon.js">`
            },
            generateBundle(_options, bundle) {
              const chunks = Object.values(bundle).filter((output) => output.type === 'chunk')
              const wrapper = chunks.find((chunk) => chunk.fileName === 'assets/lazyFirstOldIcon.js')
              const sharedOldIcon = chunks.find((chunk) =>
                Object.keys(chunk.modules).some((moduleId) =>
                  OLDICON_PER_ICON_MODULE_RE.test(moduleId.replaceAll('\\', '/')),
                ),
              )
              if (!wrapper || !sharedOldIcon) throw new Error('shared oldicon fixture chunks were not generated')
              if (wrapper.fileName === sharedOldIcon.fileName || !wrapper.imports.includes(sharedOldIcon.fileName)) {
                throw new Error('shared oldicon fixture did not generate a wrapper -> oldicon static edge')
              }
              if (
                Object.keys(wrapper.modules).some((moduleId) =>
                  OLDICON_PER_ICON_MODULE_RE.test(moduleId.replaceAll('\\', '/')),
                )
              ) {
                throw new Error('shared oldicon fixture wrapper unexpectedly contains oldicon directly')
              }
            },
          },
          yakitUiIconsPurePlugin(),
        ],
        build: {
          write: false,
          minify: false,
          rollupOptions: {
            input: path.join(fixtureDir, 'index.html'),
            output: {
              entryFileNames: 'assets/[name].js',
              chunkFileNames: 'assets/[name].js',
              manualChunks(id) {
                return OLDICON_PER_ICON_MODULE_RE.test(id.replaceAll('\\', '/')) ? 'oldicon-shared' : undefined
              },
            },
          },
        },
      }),
    ).rejects.toThrow(
      /oldicon HTML modulepreload violations:[\s\S]*href=\/assets\/lazyFirstOldIcon\.js; chunk=assets\/lazyFirstOldIcon\.js/,
    )
  })

  it('ignores comments and ordinary strings that resemble forbidden imports', () => {
    const names = collectImports(`
      // import OldIcon from '@yakit-libs/yakit-ui-icons/oldicon'
      /* export { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon' */
      const rootImport = "import { Loading } from '@yakit-libs/yakit-ui-icons'"
      const dynamicImport = "import('@yakit-libs/yakit-ui-icons/oldicon')"
    `)

    expect([...names.oldicon]).toEqual([])
  })

  it('accepts static named oldicon imports and records retained exports', () => {
    const names = importedNames()

    collectImports(
      `import { PopoverArrowIcon, RocketIconFromPagesWebShellIcon } from '@yakit-libs/yakit-ui-icons/oldicon'`,
      names,
    )

    expect([...names.oldicon]).toEqual(['PopoverArrowIcon', 'RocketIconFromPagesWebShellIcon'])
  })

  it('accepts static named per-icon imports and records the exact public icon', () => {
    const names = collectImports(
      `import { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'`,
    )

    expect([...names.oldicon]).toEqual(['PopoverArrowIcon'])
  })

  it('ignores type-only icon imports while retaining mixed value imports', () => {
    const names = collectImports(`
      import type { IconProps } from '@yakit-libs/yakit-ui-icons/oldicon'
      import { type SVGIconProps, PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon'
    `)

    expect([...names.oldicon]).toEqual(['PopoverArrowIcon'])
  })

  it.each([
    `import OldIcon from '@yakit-libs/yakit-ui-icons/oldicon'`,
    `import * as OldIcons from '@yakit-libs/yakit-ui-icons/oldicon'`,
    `import { PopoverArrowIcon as ArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon'`,
    `import('@yakit-libs/yakit-ui-icons/oldicon')`,
    `import '@yakit-libs/yakit-ui-icons/oldicon'`,
    `export { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon'`,
  ])('rejects unsupported oldicon import form: %s', (code) => {
    expect(() => collectImports(code)).toThrow()
  })

  it.each([
    `import PopoverArrowIcon from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'`,
    `import * as PopoverArrow from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'`,
    `import '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'`,
    `import { PopoverArrowIcon as ArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'`,
    `import { RocketIconFromPagesWebShellIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'`,
    `import('@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon')`,
    `export { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'`,
  ])('rejects unsupported per-icon oldicon import form: %s', (code) => {
    expect(() => collectImports(code)).toThrow()
  })

  it.each([
    `import { Loading } from '@yakit-libs/yakit-ui-icons'`,
    `import { iconRegistry } from '@yakit-libs/yakit-ui-icons/registry'`,
    `import { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/dist/oldicon/index.js'`,
  ])('preserves root, registry, and deep-import rejection: %s', (code) => {
    expect(() => collectImports(code)).toThrow()
  })
})
