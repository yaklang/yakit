import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../..')
const packageRoot = path.join(repoRoot, 'app/renderer/src/main/node_modules/@yakit-libs/yakit-ui-icons')
const packageDist = path.join(packageRoot, 'dist')

interface CssRule {
  selector: string
  body: string
}

const readRepoFile = (file: string) => readFileSync(path.join(repoRoot, file), 'utf8')

const findRule = (source: string, selector: string): CssRule => {
  const selectorIndex = source.indexOf(selector)
  if (selectorIndex < 0) throw new Error(`Missing CSS selector: ${selector}`)

  const openingBrace = source.indexOf('{', selectorIndex + selector.length)
  if (openingBrace < 0) throw new Error(`Missing opening brace for: ${selector}`)

  let depth = 1
  let closingBrace = openingBrace + 1
  while (closingBrace < source.length && depth > 0) {
    if (source[closingBrace] === '{') depth += 1
    if (source[closingBrace] === '}') depth -= 1
    closingBrace += 1
  }
  if (depth !== 0) throw new Error(`Missing closing brace for: ${selector}`)

  return {
    selector: source.slice(selectorIndex, openingBrace).trim(),
    body: source.slice(openingBrace + 1, closingBrace - 1),
  }
}

const selectorSpecificity = (selector: string): [number, number, number] => {
  const withoutWhere = selector.replace(/:where\([^)]*\)/g, '')
  const ids = withoutWhere.match(/#[\w-]+/g)?.length ?? 0
  const classes = withoutWhere.match(/\.[\w-]+/g)?.length ?? 0
  const attributes = withoutWhere.match(/\[[^\]]+\]/g)?.length ?? 0
  const pseudoClasses = withoutWhere.match(/:(?!:)[\w-]+(?:\([^)]*\))?/g)?.length ?? 0
  const elements = withoutWhere
    .replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(?:\([^)]*\))?/g, ' ')
    .split(/[\s>+~]+/)
    .filter(Boolean).length
  return [ids, classes + attributes + pseudoClasses, elements]
}

const compareSpecificity = (left: [number, number, number], right: [number, number, number]) => {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

const compatibilityStyles = [
  'app/renderer/src/main/src/assets/global.scss',
  'app/renderer/src/main/src/auxWindow/styles/aux-base.scss',
  'app/renderer/engine-link-startup/src/index.scss',
]

const entryStyleContracts = [
  {
    entry: 'app/renderer/src/main/src/index.tsx',
    importPath: './assets/global.scss',
  },
  {
    entry: 'app/renderer/src/main/src/auxWindow/aux-entry.tsx',
    importPath: './styles/aux-base.scss',
  },
  {
    entry: 'app/renderer/engine-link-startup/src/main.tsx',
    importPath: './index.scss',
  },
]

const packageBrowserEntries = [
  'browser/outline/index.js',
  'browser/solid/index.js',
  'browser/colorful/index.js',
  'browser/oldicon/index.js',
]

const packageCss = readFileSync(path.join(packageDist, 'icon.css'), 'utf8')
const packageRule = findRule(packageCss, ':where(.anticon.yakit-icon)')
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
  version: string
}

const createIconFile = readdirSync(packageDist).find((file) => /^createIcon-.*\.js$/.test(file))
if (!createIconFile) throw new Error('Missing yakit-ui-icons createIcon build artifact')
const createIconSource = readFileSync(path.join(packageDist, createIconFile), 'utf8')

describe('yakit-ui-icons color compatibility contract', () => {
  it('tests the installed 0.2.3 package contract', () => {
    expect(packageJson.version).toBe('0.2.3')
  })

  it('keeps the package default color in a zero-specificity :where rule', () => {
    expect(packageRule.selector).toBe(':where(.anticon.yakit-icon)')
    expect(packageRule.body.replace(/\s+/g, ' ')).toContain(
      'color: var( --yakit-icon-default-color, var(--Colors-Use-Neutral-Text-1-Title, #353639) )',
    )
  })

  it.each(packageBrowserEntries)('%s loads the package icon stylesheet', (file) => {
    expect(readFileSync(path.join(packageDist, file), 'utf8')).toMatch(/import\s+["']\.\.\/\.\.\/icon\.css["']/)
  })

  it.each(entryStyleContracts)('$entry imports its color compatibility stylesheet', ({ entry, importPath }) => {
    expect(readRepoFile(entry)).toMatch(new RegExp(`import ['"]${importPath.replaceAll('.', '\\.')}['"]`))
  })

  it.each(compatibilityStyles)('%s makes migrated icon wrappers inherit color', (file) => {
    const source = readRepoFile(file)
    const rule = findRule(source, '.yakit-icon')

    expect(rule.selector).toBe('.yakit-icon')
    expect(rule.body).toMatch(/^\s*color:\s*inherit;?\s*$/)
    expect(source).not.toContain('.anticon.yakit-icon')
  })

  it.each(compatibilityStyles)('%s does not override descendant or literal paint', (file) => {
    const rule = findRule(readRepoFile(file), '.yakit-icon')

    expect(rule.selector).not.toMatch(/[>+~\s](?:svg|path|g|circle|rect|polygon|line)\b/)
    expect(rule.body).not.toMatch(/\b(?:fill|stroke)\s*:/)
  })

  it('gives the compatibility selector higher specificity than the package default rule', () => {
    expect(
      compareSpecificity(selectorSpecificity('.yakit-icon'), selectorSpecificity(packageRule.selector)),
    ).toBeGreaterThan(0)
  })

  it('maps color="currentColor" to the wrapper custom property', () => {
    const customPropertyIndex = createIconSource.indexOf('"--yakit-icon-default-color"')
    const customPropertyLineEnd = createIconSource.indexOf('\n', customPropertyIndex)
    const customPropertyAssignment = createIconSource.slice(customPropertyIndex, customPropertyLineEnd)

    expect(customPropertyIndex).toBeGreaterThan(-1)
    expect(customPropertyAssignment).toContain('"currentColor"')
  })

  it('keeps an explicit non-currentColor color prop as wrapper inline color', () => {
    const bindings = createIconSource.match(/color:\s*([\w$]+),[\s\S]*?style:\s*([\w$]+),/)
    expect(bindings).not.toBeNull()

    const colorBinding = bindings![1]
    expect(createIconSource).toContain(`{ color: ${colorBinding} }`)
  })

  it('applies style after the generated color so style.color remains authoritative', () => {
    const bindings = createIconSource.match(/color:\s*([\w$]+),[\s\S]*?style:\s*([\w$]+),/)
    expect(bindings).not.toBeNull()

    const colorBinding = bindings![1]
    const styleBinding = bindings![2]
    const generatedColorIndex = createIconSource.indexOf(`{ color: ${colorBinding} }`)
    const styleSpreadIndex = createIconSource.indexOf(`...${styleBinding}`, generatedColorIndex)

    expect(generatedColorIndex).toBeGreaterThan(-1)
    expect(styleSpreadIndex).toBeGreaterThan(generatedColorIndex)
  })

  it('keeps literal paint independent from wrapper color in a mixed oldicon', () => {
    const mixedIconSource = readFileSync(path.join(packageDist, 'oldicon/icons/AIForgeIcon.js'), 'utf8')

    expect(mixedIconSource).toContain('stroke: "currentColor"')
    expect(mixedIconSource).toContain('stroke: "#E6E8ED"')
    expect(mixedIconSource).toContain('fill: "#E6E8ED"')
    expect(mixedIconSource).toContain('stroke: "#868C97"')
  })
})
