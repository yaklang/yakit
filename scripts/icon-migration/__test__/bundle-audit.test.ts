import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { auditPackageBundle } from '../audit-package-bundle.mjs'
import {
  displayName,
  entryCode,
  factoryCode,
  families,
  publicName,
  unusedDisplayName,
} from '../__fixtures__/colorful-plugin-fixtures'

async function createFixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'yakit-icon-bundle-'))
  const packageRoot = resolve(root, 'package')
  const sourceRoot = resolve(root, 'src')
  const dist = resolve(root, 'dist')
  const runDir = resolve(root, 'evidence')
  await Promise.all([
    mkdir(sourceRoot, { recursive: true }),
    mkdir(dist, { recursive: true }),
    ...families.map((family) => mkdir(resolve(packageRoot, 'dist', family), { recursive: true })),
    mkdir(resolve(packageRoot, 'dist', 'oldicon', 'icons'), { recursive: true }),
  ])
  await writeFile(resolve(packageRoot, 'package.json'), JSON.stringify({ name: 'fixture-icons', version: '0.0.0' }))
  for (const family of families) {
    await writeFile(resolve(packageRoot, 'dist', `index-${family}.js`), factoryCode(family))
    await writeFile(resolve(packageRoot, 'dist', family, 'index.js'), entryCode(family))
  }
  await writeFile(
    resolve(packageRoot, 'dist', 'oldicon', 'icons', 'LegacyIcon.js'),
    `import { c as makeIcon } from '../../createIcon-fixture.js'\nconst render = () => null\nconst icon = makeIcon(render, 'LegacyIcon')\nexport { icon as LegacyIcon }`,
  )
  await writeFile(
    resolve(packageRoot, 'dist', 'oldicon', 'icons', 'UnusedLegacyIcon.js'),
    `import { c as makeIcon } from '../../createIcon-fixture.js'\nconst render = () => null\nconst icon = makeIcon(render, 'UnusedLegacyIcon')\nexport { icon as UnusedLegacyIcon }`,
  )
  await writeFile(
    resolve(packageRoot, 'dist', 'oldicon', 'index.js'),
    `import { LegacyIcon as legacy } from './icons/LegacyIcon.js'\nimport { UnusedLegacyIcon as unused } from './icons/UnusedLegacyIcon.js'\nexport { legacy as LegacyIcon, unused as UnusedLegacyIcon }`,
  )
  await writeFile(
    resolve(sourceRoot, 'consumer.tsx'),
    families
      .map((family) => `import { ${publicName(family)} } from '@yakit-libs/yakit-ui-icons/${family}'`)
      .concat(`import { LegacyIcon } from '@yakit-libs/yakit-ui-icons/oldicon/LegacyIcon'`)
      .join('\n'),
  )
  await writeFile(
    resolve(dist, 'bundle.js'),
    [
      ...families.map(
        (family, index) =>
          `const ${family} = makeIcon(render${family}, ${index === 0 ? '`' : "'"}${displayName(family)}${
            index === 0 ? '`' : "'"
          })`,
      ),
      `const unrelated = '${unusedDisplayName('outline')}'`,
      `const legacy = makeIcon(renderLegacy, 'LegacyIcon')`,
    ].join('\n'),
  )
  return { root, packageRoot, sourceRoot, dist, runDir }
}

describe('audit-package-bundle', () => {
  it('writes a passing three-family public/internal/displayName audit', async () => {
    const fixture = await createFixture()
    const artifact = await auditPackageBundle({
      runDir: fixture.runDir,
      mode: 'fixture',
      renderer: 'main',
      dist: fixture.dist,
      packageRoot: fixture.packageRoot,
      sourceRoots: [fixture.sourceRoot],
    })

    expect(artifact.exit_status).toBe('pass')
    expect(artifact.family_totals).toEqual({ outline: 2, solid: 2, colorful: 2, oldicon: 2 })
    expect(artifact.retained_display_names.oldicon).toEqual(['LegacyIcon'])
    expect(artifact.retained_display_names.colorful).toEqual([displayName('colorful')])
    const written = JSON.parse(await readFile(resolve(fixture.runDir, 'bundle', 'fixture-main.json'), 'utf8'))
    expect(written.public_internal_display_name_map.outline[0]).toHaveProperty('internal_binding')
  })

  it('fails closed when an oldicon displayName differs from its public export', async () => {
    const fixture = await createFixture()
    await writeFile(
      resolve(fixture.packageRoot, 'dist', 'oldicon', 'icons', 'LegacyIcon.js'),
      `import { c as makeIcon } from '../../createIcon-fixture.js'\nconst render = () => null\nconst icon = makeIcon(render, 'WrongLegacyIcon')\nexport { icon as LegacyIcon }`,
    )

    await expect(
      auditPackageBundle({
        runDir: fixture.runDir,
        mode: 'oldicon-negative',
        renderer: 'main',
        dist: fixture.dist,
        packageRoot: fixture.packageRoot,
        sourceRoots: [fixture.sourceRoot],
      }),
    ).rejects.toThrow(/bundle audit failed/)

    const written = JSON.parse(await readFile(resolve(fixture.runDir, 'bundle', 'oldicon-negative-main.json'), 'utf8'))
    expect(written.findings.ambiguous_or_missing_mapping).toContain(
      'oldicon: displayName mismatch for LegacyIcon: WrongLegacyIcon',
    )
  })

  it('does not let test-only imports satisfy production retention accounting', async () => {
    const fixture = await createFixture()
    const testRoot = resolve(fixture.sourceRoot, '__test__')
    await mkdir(testRoot, { recursive: true })
    await writeFile(
      resolve(testRoot, 'test-only.test.ts'),
      `import { UnusedLegacyIcon } from '@yakit-libs/yakit-ui-icons/oldicon/UnusedLegacyIcon'`,
    )
    await writeFile(
      resolve(fixture.dist, 'app.js'),
      [
        `const legacy = makeIcon(renderLegacy, 'LegacyIcon')`,
        `const leaked = makeIcon(renderLeaked, 'UnusedLegacyIcon')`,
      ].join('\n'),
    )

    await expect(
      auditPackageBundle({
        runDir: fixture.runDir,
        mode: 'test-import-negative',
        renderer: 'main',
        dist: fixture.dist,
        packageRoot: fixture.packageRoot,
        sourceRoots: [fixture.sourceRoot],
      }),
    ).rejects.toThrow(/bundle audit failed/)

    const written = JSON.parse(
      await readFile(resolve(fixture.runDir, 'bundle', 'test-import-negative-main.json'), 'utf8'),
    )
    expect(written.findings.retained_unimported).toContain('oldicon: UnusedLegacyIcon')
  })

  it.each([
    ['unsupported deep import', `import { LegacyIcon } from '@yakit-libs/yakit-ui-icons/dist/oldicon/index.js'`],
    ['dynamic family import', `void import('@yakit-libs/yakit-ui-icons/outline')`],
    ['package re-export', `export { LegacyIcon } from '@yakit-libs/yakit-ui-icons/oldicon/LegacyIcon'`],
  ])('fails closed on %s in production source', async (label, source) => {
    const fixture = await createFixture()
    await writeFile(resolve(fixture.sourceRoot, 'unsupported.ts'), source)

    await expect(
      auditPackageBundle({
        runDir: fixture.runDir,
        mode: 'unsupported-source-negative',
        renderer: 'main',
        dist: fixture.dist,
        packageRoot: fixture.packageRoot,
        sourceRoots: [fixture.sourceRoot],
      }),
    ).rejects.toThrow(/bundle audit failed/)

    const written = JSON.parse(
      await readFile(resolve(fixture.runDir, 'bundle', 'unsupported-source-negative-main.json'), 'utf8'),
    )
    expect(written.findings.forbidden.join('\n'), label).toContain('@yakit-libs/yakit-ui-icons/')
  })

  it('fails closed and records forbidden and retained-unimported findings', async () => {
    const fixture = await createFixture()
    await writeFile(
      resolve(fixture.sourceRoot, 'forbidden.ts'),
      "import { registry } from '@yakit-libs/yakit-ui-icons/registry'",
    )
    await writeFile(
      resolve(fixture.dist, 'extra.js'),
      `const unexpected = makeIcon(renderUnexpected, \`${unusedDisplayName('colorful')}\`)`,
    )

    await expect(
      auditPackageBundle({
        runDir: fixture.runDir,
        mode: 'negative',
        renderer: 'link',
        dist: fixture.dist,
        packageRoot: fixture.packageRoot,
        sourceRoots: [fixture.sourceRoot],
      }),
    ).rejects.toThrow(/bundle audit failed/)

    const written = JSON.parse(await readFile(resolve(fixture.runDir, 'bundle', 'negative-link.json'), 'utf8'))
    expect(written.exit_status).toBe('fail')
    expect(written.findings.forbidden).toHaveLength(1)
    expect(written.findings.retained_unimported).toContain(`colorful: ${unusedDisplayName('colorful')}`)
  })
})
