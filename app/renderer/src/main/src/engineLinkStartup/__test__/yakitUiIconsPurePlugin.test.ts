import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { yakitUiIconsPurePlugin } from '../../../../../vite-plugins/yakitUiIconsPurePlugin.mjs'

describe('Link yakitUiIconsPurePlugin integration', () => {
  it('keeps a lazy per-icon oldicon outside the Link entry static closure', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const fixtureDir = await mkdtemp(path.join(testDir, '.tmp-yakit-link-oldicon-'))
    try {
      await Promise.all([
        writeFile(path.join(fixtureDir, 'index.html'), '<script type="module" src="/entry.ts"></script>'),
        writeFile(path.join(fixtureDir, 'entry.ts'), "import('./lazy.ts')"),
        writeFile(
          path.join(fixtureDir, 'lazy.ts'),
          `import { PopoverArrowIcon } from '@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon'\nconsole.log(PopoverArrowIcon)`,
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
      const output = (
        result as { output: Array<{ type: string; isEntry?: boolean; modules?: Record<string, unknown> }> }
      ).output
      const entry = output.find((item) => item.type === 'chunk' && item.isEntry)
      expect(entry).toBeDefined()
      expect(Object.keys(entry?.modules ?? {}).some((id) => id.replaceAll('\\', '/').includes('/dist/oldicon/'))).toBe(
        false,
      )
      expect(
        output.some(
          (item) =>
            item.type === 'chunk' &&
            Object.keys(item.modules ?? {}).some((id) =>
              id.replaceAll('\\', '/').endsWith('/dist/oldicon/icons/PopoverArrowIcon.js'),
            ),
        ),
      ).toBe(true)
    } finally {
      await rm(fixtureDir, { recursive: true, force: true })
    }
  })
})
