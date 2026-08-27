import { describe, expect, it, vi } from 'vitest'
import { parseAst } from 'vite'
import { yakitUiIconsPurePlugin } from '../../../app/renderer/vite-plugins/yakitUiIconsPurePlugin.mts'
import {
  consumerCode,
  displayName,
  entryCode,
  entryId,
  factoryCode,
  factoryId,
  families,
  publicName,
  unusedDisplayName,
} from '../__fixtures__/colorful-plugin-fixtures'

type Plugin = ReturnType<typeof yakitUiIconsPurePlugin>

const context = { parse: parseAst }

function transform(plugin: Plugin, code: string, id: string) {
  return plugin.transform.call(context, code, id)
}

function preparePlugin() {
  const plugin = yakitUiIconsPurePlugin()
  transform(plugin, consumerCode, '/fixture/src/consumer.tsx')
  const transformed = new Map<string, string>()
  for (const family of families) {
    const result = transform(plugin, factoryCode(family), factoryId(family))
    transformed.set(family, result?.code ?? '')
    transform(plugin, entryCode(family), entryId(family))
  }
  return { plugin, transformed }
}

function bundleCode(overrides: Partial<Record<(typeof families)[number], string>> = {}) {
  return {
    'icons.js': {
      type: 'chunk' as const,
      modules: Object.fromEntries(
        families.map((family) => [
          factoryId(family),
          {
            code: overrides[family] ?? `const retained = '${displayName(family)}'`,
            renderedExports: [],
          },
        ]),
      ),
    },
  }
}

describe('yakitUiIconsPurePlugin colorful and three-family accounting', () => {
  it('isolates and marks outline, solid, and colorful factories while resolving aliases', () => {
    const { plugin, transformed } = preparePlugin()
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    for (const family of families) {
      expect(transformed.get(family)).toContain(`/* @__PURE__ */ makeIcon(renderUsed, '${displayName(family)}')`)
      expect(transformed.get(family)).toContain(`const usedFactory =`)
      expect(transformed.get(family)).not.toContain(`usedFactory = makeIcon`)
    }

    expect(() => plugin.generateBundle({}, bundleCode())).not.toThrow()
    expect(info).toHaveBeenCalledTimes(3)
    info.mockRestore()
  })

  it.each([
    ['package root', "import { Anything } from '@yakit-libs/yakit-ui-icons'"],
    ['registry', "import { registry } from '@yakit-libs/yakit-ui-icons/registry'"],
  ])('rejects %s imports', (_label, code) => {
    const plugin = yakitUiIconsPurePlugin()
    expect(() => transform(plugin, code, '/fixture/src/forbidden.ts')).toThrow(/package root\/registry/)
  })

  it.each([
    ['namespace', "import * as Icons from '@yakit-libs/yakit-ui-icons/colorful'"],
    ['default', "import Icons from '@yakit-libs/yakit-ui-icons/outline'"],
  ])('rejects %s family imports', (_label, code) => {
    const plugin = yakitUiIconsPurePlugin()
    expect(() => transform(plugin, code, '/fixture/src/forbidden.ts')).toThrow(/Only named/)
  })

  it('ignores type-only family imports during runtime retention accounting', () => {
    const plugin = yakitUiIconsPurePlugin()
    transform(
      plugin,
      `import type { ${publicName('outline')} } from '@yakit-libs/yakit-ui-icons/outline'`,
      '/fixture/src/type-only.ts',
    )

    expect(() => plugin.generateBundle({}, {})).not.toThrow()
  })

  it('fails closed on mixed and unknown displayName suffixes', () => {
    const mixed = factoryCode('outline').replace(unusedDisplayName('outline'), 'WrongFamilySolid')
    const unknown = factoryCode('outline').replace(displayName('outline'), 'UnknownIcon')

    expect(() => transform(yakitUiIconsPurePlugin(), mixed, factoryId('outline'))).toThrow(/Mixed/)
    expect(() => transform(yakitUiIconsPurePlugin(), unknown, factoryId('outline'))).toThrow(/Unknown/)
  })

  it('fails closed on missing and ambiguous public/internal/displayName mappings', () => {
    const missing = preparePlugin()
    transform(
      missing.plugin,
      entryCode('outline').replace('a as usedLocal', 'missing as usedLocal'),
      entryId('outline'),
    )
    expect(() => missing.plugin.generateBundle({}, bundleCode())).toThrow(/Missing.*mapping/)

    const ambiguous = preparePlugin()
    transform(
      ambiguous.plugin,
      entryCode('outline').replace(
        `usedLocal as ${publicName('outline')}`,
        `usedLocal as ${publicName('outline')}, usedLocal as OutlineAliasOutlined`,
      ),
      entryId('outline'),
    )
    expect(() => ambiguous.plugin.generateBundle({}, bundleCode())).toThrow(/Ambiguous/)
  })

  it('rejects retained-unimported and imported-not-retained factories', () => {
    const retainedUnused = preparePlugin()
    expect(() =>
      retainedUnused.plugin.generateBundle(
        {},
        bundleCode({ outline: `'${displayName('outline')}', '${unusedDisplayName('outline')}'` }),
      ),
    ).toThrow(/retained unimported/)

    const missingRetained = preparePlugin()
    expect(() => missingRetained.plugin.generateBundle({}, bundleCode({ colorful: 'const none = 1' }))).toThrow(
      /was not retained/,
    )
  })
})
