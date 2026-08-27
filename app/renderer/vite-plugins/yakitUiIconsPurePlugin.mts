const YAKIT_UI_ICONS_FACTORY_MODULE_RE =
  /[\\/]node_modules[\\/]@yakit-libs[\\/]yakit-ui-icons[\\/]dist[\\/]index-[\w-]+\.js$/
const YAKIT_UI_ICONS_ENTRY_RE =
  /[\\/]node_modules[\\/]@yakit-libs[\\/]yakit-ui-icons[\\/]dist[\\/](outline|solid|colorful)[\\/]index\.js$/
const CREATE_ICON_MODULE_RE = /^\.\.?(?:[\\/])createIcon-[^"']+\.js$/
const YAKIT_UI_ICONS_FAMILY_IMPORT_RE =
  /import\s+([^"']+?)\s+from\s+["']@yakit-libs\/yakit-ui-icons\/(outline|solid|colorful)["']/g
const FORBIDDEN_YAKIT_UI_ICONS_IMPORT_RE =
  /(?:from\s*|import\s*\(\s*)["']@yakit-libs\/yakit-ui-icons(?:\/registry)?["']/

type IconFamily = 'outline' | 'solid' | 'colorful'

type AstNode = {
  type: string
  start: number
  end: number
  [key: string]: unknown
}

type FactoryModule = {
  family: IconFamily
  displayNameByExport: Map<string, string>
  displayNames: string[]
}

type FamilyEntry = {
  family: IconFamily
  imports: Map<string, { source: string; importedName: string }>
  exports: Map<string, string>
}

type PublicIcon = {
  publicName: string
  internalBinding: string
  displayName: string
}

type OutputBundle = Record<
  string,
  | { type: 'asset' }
  | {
      type: 'chunk'
      modules: Record<string, { code: string | null; renderedExports: string[] }>
    }
>

const ICON_FAMILIES = ['outline', 'solid', 'colorful'] as const

function namedValue(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null
  const value = node as { name?: unknown; value?: unknown }
  if (typeof value.name === 'string') return value.name
  if (typeof value.value === 'string') return value.value
  return null
}

function moduleSource(node: AstNode): string | null {
  return namedValue(node.source)
}

function classifyDisplayName(displayName: string): IconFamily | null {
  if (displayName.endsWith('Outlined')) return 'outline'
  if (displayName.endsWith('Solid')) return 'solid'
  if (displayName.endsWith('Colorful')) return 'colorful'
  return null
}

function normalizeModuleId(importer: string, source: string): string {
  const slashImporter = importer.replaceAll('\\', '/')
  const baseParts = slashImporter.slice(0, slashImporter.lastIndexOf('/')).split('/')
  for (const part of source.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') baseParts.pop()
    else baseParts.push(part)
  }
  return baseParts.join('/')
}

function recordUnique(map: Map<string, string>, key: string, value: string, context: string) {
  const previous = map.get(key)
  if (previous != null && previous !== value) {
    throw new Error(`Ambiguous yakit-ui-icons ${context}: ${key} maps to both ${previous} and ${value}`)
  }
  map.set(key, value)
}

function parseFactoryModule(code: string, id: string, program: AstNode): { code: string; module: FactoryModule } {
  const body = program.body as AstNode[]
  const createIconBindings: string[] = []

  for (const statement of body) {
    if (statement.type !== 'ImportDeclaration') continue
    const source = moduleSource(statement)
    if (!source || !CREATE_ICON_MODULE_RE.test(source)) continue
    for (const specifier of statement.specifiers as AstNode[]) {
      if (specifier.type !== 'ImportSpecifier') continue
      const importedName = namedValue(specifier.imported)
      const localName = namedValue(specifier.local)
      if (importedName === 'c' && localName) createIconBindings.push(localName)
    }
  }

  if (createIconBindings.length !== 1) {
    throw new Error(
      `Unable to identify a unique yakit-ui-icons createIcon import in ${id}: found ${createIconBindings.length}`,
    )
  }

  const createIconName = createIconBindings[0]
  const displayNameByBinding = new Map<string, string>()
  const families = new Set<IconFamily>()
  const replacements: Array<{ start: number; end: number; code: string }> = []

  for (const statement of body) {
    if (statement.type !== 'VariableDeclaration') continue
    const declarations = statement.declarations as AstNode[]
    const factoryDeclarations: Array<{ declaration: AstNode; call: AstNode }> = []

    for (const declaration of declarations) {
      const init = declaration.init as AstNode | null
      if (!init || init.type !== 'CallExpression' || namedValue(init.callee) !== createIconName) continue

      const binding = namedValue(declaration.id)
      const args = init.arguments as AstNode[]
      const displayName = namedValue(args[1])
      if (!binding || !displayName) {
        throw new Error(`Malformed yakit-ui-icons createIcon factory in ${id}`)
      }

      const family = classifyDisplayName(displayName)
      if (!family) {
        throw new Error(`Unknown yakit-ui-icons displayName suffix in ${id}: ${displayName}`)
      }
      if ([...displayNameByBinding.values()].includes(displayName)) {
        throw new Error(`Duplicate yakit-ui-icons displayName in ${id}: ${displayName}`)
      }

      families.add(family)
      displayNameByBinding.set(binding, displayName)
      factoryDeclarations.push({ declaration, call: init })
    }

    if (factoryDeclarations.length === 0) continue
    const factoryByDeclaration = new Map(factoryDeclarations.map((item) => [item.declaration, item]))
    const declarationKind = String(statement.kind)
    const splitCode = declarations
      .map((declaration) => {
        const factory = factoryByDeclaration.get(declaration)
        let declarationCode = code.slice(declaration.start, declaration.end)
        if (factory) {
          const relativeCallStart = factory.call.start - declaration.start
          declarationCode =
            `${declarationCode.slice(0, relativeCallStart)}/* @__PURE__ */ ` + declarationCode.slice(relativeCallStart)
        }
        return `${declarationKind} ${declarationCode};`
      })
      .join('\n')
    replacements.push({ start: statement.start, end: statement.end, code: splitCode })
  }

  if (displayNameByBinding.size === 0) {
    throw new Error(`Unable to identify yakit-ui-icons createIcon calls in ${id}`)
  }
  if (families.size !== 1) {
    throw new Error(`Mixed yakit-ui-icons displayName families in ${id}: ${[...families].join(', ')}`)
  }

  const displayNameByExport = new Map<string, string>()
  for (const statement of body) {
    if (statement.type !== 'ExportNamedDeclaration' || statement.source) continue
    for (const specifier of statement.specifiers as AstNode[]) {
      const localName = namedValue(specifier.local)
      const exportedName = namedValue(specifier.exported)
      const displayName = localName ? displayNameByBinding.get(localName) : null
      if (exportedName && displayName) {
        recordUnique(displayNameByExport, exportedName, displayName, `internal export in ${id}`)
      }
    }
  }

  if (displayNameByExport.size !== displayNameByBinding.size) {
    throw new Error(
      `Missing yakit-ui-icons internal export mapping in ${id}: ${displayNameByExport.size}/${displayNameByBinding.size}`,
    )
  }

  let transformedCode = code
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    transformedCode =
      transformedCode.slice(0, replacement.start) + replacement.code + transformedCode.slice(replacement.end)
  }

  return {
    code: transformedCode,
    module: {
      family: [...families][0],
      displayNameByExport,
      displayNames: [...displayNameByBinding.values()],
    },
  }
}

function parseFamilyEntry(id: string, family: IconFamily, program: AstNode): FamilyEntry {
  const imports = new Map<string, { source: string; importedName: string }>()
  const exports = new Map<string, string>()

  for (const statement of program.body as AstNode[]) {
    if (statement.type === 'ImportDeclaration') {
      const source = moduleSource(statement)
      if (!source || !/\.\.\/index-[\w-]+\.js$/.test(source)) continue
      for (const specifier of statement.specifiers as AstNode[]) {
        if (specifier.type !== 'ImportSpecifier') continue
        const localName = namedValue(specifier.local)
        const importedName = namedValue(specifier.imported)
        if (!localName || !importedName) continue
        if (imports.has(localName)) {
          throw new Error(`Duplicate yakit-ui-icons entry import binding in ${id}: ${localName}`)
        }
        imports.set(localName, { source: normalizeModuleId(id, source), importedName })
      }
    } else if (statement.type === 'ExportNamedDeclaration' && !statement.source) {
      for (const specifier of statement.specifiers as AstNode[]) {
        const localName = namedValue(specifier.local)
        const publicName = namedValue(specifier.exported)
        if (!localName || !publicName) continue
        if (exports.has(publicName)) {
          throw new Error(`Duplicate yakit-ui-icons public export in ${id}: ${publicName}`)
        }
        exports.set(publicName, localName)
      }
    }
  }

  if (imports.size === 0 || exports.size === 0) {
    throw new Error(`Unable to identify yakit-ui-icons ${family} entry mappings in ${id}`)
  }
  return { family, imports, exports }
}

export function yakitUiIconsPurePlugin() {
  const importedNames: Record<IconFamily, Set<string>> = {
    outline: new Set(),
    solid: new Set(),
    colorful: new Set(),
  }
  const factoryModules = new Map<string, FactoryModule>()
  const familyEntries = new Map<IconFamily, FamilyEntry>()

  function buildPublicMap(family: IconFamily): Map<string, PublicIcon> {
    const entry = familyEntries.get(family)
    const publicMap = new Map<string, PublicIcon>()
    if (!entry) return publicMap

    const usedDisplayNames = new Map<string, string>()
    for (const [publicName, localName] of entry.exports) {
      const imported = entry.imports.get(localName)
      if (!imported) {
        throw new Error(`Missing yakit-ui-icons ${family} public/internal mapping: ${publicName}`)
      }
      const factoryModule = factoryModules.get(imported.source)
      if (!factoryModule) {
        throw new Error(`Missing yakit-ui-icons ${family} factory module for ${publicName}: ${imported.source}`)
      }
      if (factoryModule.family !== family) {
        throw new Error(
          `Mixed yakit-ui-icons family mapping for ${publicName}: expected ${family}, got ${factoryModule.family}`,
        )
      }
      const displayName = factoryModule.displayNameByExport.get(imported.importedName)
      if (!displayName) {
        throw new Error(`Missing yakit-ui-icons ${family} internal/displayName mapping: ${publicName}`)
      }
      const previousPublicName = usedDisplayNames.get(displayName)
      if (previousPublicName) {
        throw new Error(
          `Ambiguous yakit-ui-icons ${family} displayName mapping: ${displayName} is exported as ${previousPublicName} and ${publicName}`,
        )
      }
      usedDisplayNames.set(displayName, publicName)
      publicMap.set(publicName, { publicName, internalBinding: imported.importedName, displayName })
    }

    if (publicMap.size !== entry.imports.size) {
      throw new Error(
        `Non-bijective yakit-ui-icons ${family} entry mapping: ${publicMap.size} public exports/${entry.imports.size} imports`,
      )
    }
    return publicMap
  }

  return {
    name: 'yakit-ui-icons-pure-factories',
    enforce: 'pre' as const,
    transform(this: { parse(code: string): AstNode }, code: string, id: string) {
      const normalizedId = id.replaceAll('\\', '/')
      if (!normalizedId.includes('/node_modules/')) {
        if (FORBIDDEN_YAKIT_UI_ICONS_IMPORT_RE.test(code)) {
          throw new Error(
            `Import yakit-ui-icons from the outline, solid, or colorful subpath instead of the package root/registry in ${id}`,
          )
        }
        for (const iconImport of code.matchAll(YAKIT_UI_ICONS_FAMILY_IMPORT_RE)) {
          const clause = iconImport[1].trim()
          const family = iconImport[2] as IconFamily
          if (clause.startsWith('type ')) continue
          if (!clause.startsWith('{') || !clause.endsWith('}')) {
            throw new Error(`Only named yakit-ui-icons ${family} imports are supported in ${id}`)
          }
          for (const specifier of clause.slice(1, -1).split(',')) {
            const normalizedSpecifier = specifier.trim()
            if (normalizedSpecifier.startsWith('type ')) continue
            const importedName = normalizedSpecifier.split(/\s+as\s+/)[0]
            if (importedName) importedNames[family].add(importedName)
          }
        }
        return null
      }

      const entryMatch = normalizedId.match(YAKIT_UI_ICONS_ENTRY_RE)
      if (entryMatch) {
        familyEntries.set(
          entryMatch[1] as IconFamily,
          parseFamilyEntry(id, entryMatch[1] as IconFamily, this.parse(code)),
        )
        return null
      }

      if (!YAKIT_UI_ICONS_FACTORY_MODULE_RE.test(normalizedId)) return null
      const result = parseFactoryModule(code, id, this.parse(code))
      factoryModules.set(normalizedId, result.module)
      return { code: result.code, map: null, moduleSideEffects: false }
    },
    generateBundle(_outputOptions: unknown, bundle: OutputBundle) {
      const renderedNames: Record<IconFamily, Set<string>> = {
        outline: new Set(),
        solid: new Set(),
        colorful: new Set(),
      }

      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const [rawId, renderedModule] of Object.entries(output.modules)) {
          const factories = factoryModules.get(rawId.replaceAll('\\', '/'))
          if (!factories || renderedModule.code == null) continue
          for (const displayName of factories.displayNames) {
            if (renderedModule.code.includes(`"${displayName}"`) || renderedModule.code.includes(`'${displayName}'`)) {
              renderedNames[factories.family].add(displayName)
            }
          }
        }
      }

      for (const family of ICON_FAMILIES) {
        if (importedNames[family].size === 0 && !familyEntries.has(family)) continue
        const publicMap = buildPublicMap(family)
        const importedDisplayNames = new Set<string>()

        for (const publicName of importedNames[family]) {
          const mapping = publicMap.get(publicName)
          if (!mapping) {
            throw new Error(`Missing yakit-ui-icons ${family} imported public mapping: ${publicName}`)
          }
          importedDisplayNames.add(mapping.displayName)
          if (!renderedNames[family].has(mapping.displayName)) {
            throw new Error(
              `yakit-ui-icons ${family} imported public name was not retained: ${publicName} -> ${mapping.displayName}`,
            )
          }
        }

        const unexpected = [...renderedNames[family]].filter((name) => !importedDisplayNames.has(name))
        if (unexpected.length > 0) {
          throw new Error(`yakit-ui-icons ${family} bundle retained unimported factories: ${unexpected.join(', ')}`)
        }

        const total = publicMap.size
        if (total === 0 || renderedNames[family].size >= total) {
          throw new Error(
            `yakit-ui-icons ${family} tree-shaking check failed: ${renderedNames[family].size}/${
              total || 'unknown'
            } factories retained`,
          )
        }

        console.info(`[yakit-ui-icons] ${family}: ${renderedNames[family].size}/${total} factories retained`)
      }
    },
  }
}
