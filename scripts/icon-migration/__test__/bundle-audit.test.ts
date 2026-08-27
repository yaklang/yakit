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
  ])
  await writeFile(resolve(packageRoot, 'package.json'), JSON.stringify({ name: 'fixture-icons', version: '0.0.0' }))
  for (const family of families) {
    await writeFile(resolve(packageRoot, 'dist', `index-${family}.js`), factoryCode(family))
    await writeFile(resolve(packageRoot, 'dist', family, 'index.js'), entryCode(family))
  }
  await writeFile(
    resolve(sourceRoot, 'consumer.tsx'),
    families
      .map((family) => `import { ${publicName(family)} as Local${family} } from '@yakit-libs/yakit-ui-icons/${family}'`)
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
    expect(artifact.family_totals).toEqual({ outline: 2, solid: 2, colorful: 2 })
    expect(artifact.retained_display_names.colorful).toEqual([displayName('colorful')])
    const written = JSON.parse(await readFile(resolve(fixture.runDir, 'bundle', 'fixture-main.json'), 'utf8'))
    expect(written.public_internal_display_name_map.outline[0]).toHaveProperty('internal_binding')
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
