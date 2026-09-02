const YAKIT_UI_ICONS_FACTORY_MODULE_RE =
  /[\\/]node_modules[\\/]@yakit-libs[\\/]yakit-ui-icons[\\/]dist[\\/]index-[\w-]+\.js$/
const YAKIT_UI_ICONS_ENTRY_RE =
  /[\\/]node_modules[\\/]@yakit-libs[\\/]yakit-ui-icons[\\/]dist[\\/](outline|solid|colorful)[\\/]index\.js$/
const YAKIT_UI_ICONS_OLDICON_ENTRY_RE =
  /[\\/]node_modules[\\/]@yakit-libs[\\/]yakit-ui-icons[\\/]dist[\\/]oldicon[\\/]index\.js$/
const YAKIT_UI_ICONS_OLDICON_BUNDLE_MODULE_RE =
  /[\\/]node_modules[\\/]@yakit-libs[\\/]yakit-ui-icons[\\/]dist[\\/](?:browser[\\/])?oldicon[\\/]index\.js$/
const YAKIT_UI_ICONS_OLDICON_FACTORY_MODULE_RE =
  /[\\/]node_modules[\\/]@yakit-libs[\\/]yakit-ui-icons[\\/]dist[\\/]oldicon[\\/]icons[\\/][^\\/]+\.js$/
const CREATE_ICON_MODULE_RE = /^(?:\.\.?[\\/])+createIcon-[^"']+\.js$/
const YAKIT_UI_ICONS_PACKAGE = '@yakit-libs/yakit-ui-icons'
const YAKIT_UI_ICONS_OLDICON_PUBLIC_PATH_RE = /^@yakit-libs\/yakit-ui-icons\/oldicon\/([^/]+)$/

type IconFamily = 'outline' | 'solid' | 'colorful' | 'oldicon'

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
  | { type: 'asset'; fileName: string; source: string | Uint8Array }
  | {
      type: 'chunk'
      fileName: string
      imports: string[]
      dynamicImports: string[]
      isEntry: boolean
      code: string
      modules: Record<string, { code: string | null; renderedExports: string[] }>
    }
>

const ICON_FAMILIES = ['outline', 'solid', 'colorful', 'oldicon'] as const

type OutputChunk = Extract<OutputBundle[string], { type: 'chunk' }>

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

function walkAst(node: unknown, visit: (node: AstNode) => void) {
  if (!node || typeof node !== 'object') return
  const astNode = node as AstNode
  if (typeof astNode.type !== 'string') return
  visit(astNode)
  for (const [key, value] of Object.entries(astNode)) {
    if (key === 'parent' || key === 'loc') continue
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visit)
    } else {
      walkAst(value, visit)
    }
  }
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

function parseFactoryModule(
  code: string,
  id: string,
  program: AstNode,
  expectedFamily?: IconFamily,
): { code: string; module: FactoryModule } {
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

      const family = expectedFamily ?? classifyDisplayName(displayName)
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
  if (expectedFamily === 'oldicon') {
    for (const [publicName, displayName] of displayNameByExport) {
      if (publicName !== displayName) {
        throw new Error(`Mismatched yakit-ui-icons oldicon export/displayName in ${id}: ${publicName}/${displayName}`)
      }
    }
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

export function collectYakitUiIconImports(
  program: AstNode,
  id: string,
  importedNames: Record<IconFamily, Set<string>>,
  importMetadata?: { importsOldIconBarrel: boolean; oldIconPerIconNames: Set<string> },
): boolean {
  let importsOldIcon = false

  walkAst(program, (node) => {
    const isStaticImport = node.type === 'ImportDeclaration'
    const isReExport = node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration'
    const isDynamicImport = node.type === 'ImportExpression'
    if (!isStaticImport && !isReExport && !isDynamicImport) return

    const source = moduleSource(node)
    if (!source || (source !== YAKIT_UI_ICONS_PACKAGE && !source.startsWith(`${YAKIT_UI_ICONS_PACKAGE}/`))) return
    if (isDynamicImport) {
      throw new Error(`Dynamic yakit-ui-icons imports are not supported in ${id}`)
    }
    if (isReExport) {
      throw new Error(`Re-exporting yakit-ui-icons is not supported in ${id}`)
    }

    const oldIconPerIconMatch = source.match(YAKIT_UI_ICONS_OLDICON_PUBLIC_PATH_RE)
    const family = oldIconPerIconMatch
      ? 'oldicon'
      : ICON_FAMILIES.find((candidate) => source === `${YAKIT_UI_ICONS_PACKAGE}/${candidate}`)
    if (!family) {
      if (source === YAKIT_UI_ICONS_PACKAGE || source === `${YAKIT_UI_ICONS_PACKAGE}/registry`) {
        throw new Error(
          `Import yakit-ui-icons from the outline, solid, colorful, or oldicon subpath instead of the package root/registry in ${id}`,
        )
      }
      throw new Error(`Unsupported yakit-ui-icons import source in ${id}: ${source}`)
    }

    if (node.importKind === 'type') return
    const specifiers = (node.specifiers as AstNode[]).filter((specifier) => specifier.importKind !== 'type')
    if (specifiers.length === 0 && (node.specifiers as AstNode[]).length > 0) return
    if (specifiers.length === 0 || specifiers.some((specifier) => specifier.type !== 'ImportSpecifier')) {
      throw new Error(`Only static named yakit-ui-icons ${family} imports are supported in ${id}`)
    }
    for (const specifier of specifiers) {
      const importedName = namedValue(specifier.imported)
      const localName = namedValue(specifier.local)
      if (!importedName || !localName) {
        throw new Error(`Invalid yakit-ui-icons ${family} named import in ${id}`)
      }
      if (importedName !== localName) {
        throw new Error(`Value aliases for yakit-ui-icons ${family} imports are not supported in ${id}`)
      }
      if (oldIconPerIconMatch && importedName !== oldIconPerIconMatch[1]) {
        throw new Error(
          `yakit-ui-icons oldicon per-icon import must match its public path in ${id}: ${importedName} from ${source}`,
        )
      }
      importedNames[family].add(importedName)
      if (family === 'oldicon') {
        importsOldIcon = true
        if (!oldIconPerIconMatch && importMetadata) importMetadata.importsOldIconBarrel = true
        if (oldIconPerIconMatch) importMetadata?.oldIconPerIconNames.add(importedName)
      }
    }
  })

  return importsOldIcon
}

export function yakitUiIconsPurePlugin() {
  const importedNames: Record<IconFamily, Set<string>> = {
    outline: new Set(),
    solid: new Set(),
    colorful: new Set(),
    oldicon: new Set(),
  }
  const factoryModules = new Map<string, FactoryModule>()
  const familyEntries = new Map<IconFamily, FamilyEntry>()
  const oldIconImporters = new Set<string>()
  const oldIconBarrelImporters = new Set<string>()
  const oldIconPerIconImportsByImporter = new Map<string, Set<string>>()
  let importsOldIconBarrel = false

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

  const pureFactoriesPlugin = {
    name: 'yakit-ui-icons-pure-factories',
    enforce: 'pre' as const,
    buildStart() {
      for (const family of ICON_FAMILIES) importedNames[family].clear()
      factoryModules.clear()
      familyEntries.clear()
      oldIconImporters.clear()
      oldIconBarrelImporters.clear()
      oldIconPerIconImportsByImporter.clear()
      importsOldIconBarrel = false
    },
    transform(this: { parse(code: string): AstNode }, code: string, id: string) {
      const normalizedId = id.replaceAll('\\', '/')
      if (!normalizedId.includes('/node_modules/')) return null

      if (YAKIT_UI_ICONS_OLDICON_ENTRY_RE.test(normalizedId)) {
        return null
      }

      if (YAKIT_UI_ICONS_OLDICON_FACTORY_MODULE_RE.test(normalizedId)) {
        const result = parseFactoryModule(code, id, this.parse(code), 'oldicon')
        factoryModules.set(normalizedId, result.module)
        return { code: result.code, map: null, moduleSideEffects: false }
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
      const chunksByFileName = new Map<string, OutputChunk>()
      const startupViolations = new Map<string, { entry: string; chunk: string; module: string; importers: string[] }>()
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') chunksByFileName.set(output.fileName, output)
      }

      for (const entry of chunksByFileName.values()) {
        if (!entry.isEntry) continue
        const staticClosure = new Set<string>()
        const queue = [entry.fileName]

        while (queue.length > 0) {
          const fileName = queue.shift() as string
          if (staticClosure.has(fileName)) continue
          staticClosure.add(fileName)
          const chunk = chunksByFileName.get(fileName)
          if (!chunk) continue
          queue.push(...chunk.imports)
        }

        for (const fileName of staticClosure) {
          const chunk = chunksByFileName.get(fileName)
          if (!chunk) continue
          for (const rawId of Object.keys(chunk.modules)) {
            const normalizedId = rawId.replaceAll('\\', '/')
            if (!YAKIT_UI_ICONS_OLDICON_ENTRY_RE.test(normalizedId)) continue
            const closureModules = new Set(
              [...staticClosure].flatMap((closureFileName) =>
                Object.keys(chunksByFileName.get(closureFileName)?.modules ?? {}).map((moduleId) =>
                  moduleId.replaceAll('\\', '/'),
                ),
              ),
            )
            const importers = [...oldIconImporters].filter((importer) => closureModules.has(importer)).sort()
            const key = [entry.fileName, chunk.fileName, normalizedId, ...importers].join('\0')
            startupViolations.set(key, {
              entry: entry.fileName,
              chunk: chunk.fileName,
              module: normalizedId,
              importers,
            })
          }
        }

        const closureModules = new Set(
          [...staticClosure].flatMap((fileName) =>
            Object.keys(chunksByFileName.get(fileName)?.modules ?? {}).map((moduleId) =>
              moduleId.replaceAll('\\', '/'),
            ),
          ),
        )
        const barrelImporters = [...oldIconBarrelImporters].filter((importer) => closureModules.has(importer)).sort()
        if (barrelImporters.length > 0) {
          const containingChunk = [...staticClosure]
            .map((fileName) => chunksByFileName.get(fileName))
            .find((chunk) => chunk && barrelImporters.some((importer) => importer in chunk.modules))
          const key = [
            entry.fileName,
            containingChunk?.fileName ?? entry.fileName,
            YAKIT_UI_ICONS_PACKAGE,
            ...barrelImporters,
          ].join('\0')
          startupViolations.set(key, {
            entry: entry.fileName,
            chunk: containingChunk?.fileName ?? entry.fileName,
            module: `${YAKIT_UI_ICONS_PACKAGE}/oldicon`,
            importers: barrelImporters,
          })
        }

        if (barrelImporters.length === 0) {
          const allowedPerIconNames = new Set(
            [...oldIconPerIconImportsByImporter]
              .filter(([importer]) => closureModules.has(importer))
              .flatMap(([, names]) => [...names]),
          )
          for (const fileName of staticClosure) {
            const chunk = chunksByFileName.get(fileName)
            if (!chunk) continue
            for (const rawId of Object.keys(chunk.modules)) {
              const factory = factoryModules.get(rawId.replaceAll('\\', '/'))
              if (!factory || factory.family !== 'oldicon') continue
              const unexpectedNames = factory.displayNames.filter((name) => !allowedPerIconNames.has(name))
              if (unexpectedNames.length === 0) continue
              const key = [entry.fileName, chunk.fileName, rawId, ...unexpectedNames].join('\0')
              startupViolations.set(key, {
                entry: entry.fileName,
                chunk: chunk.fileName,
                module: rawId.replaceAll('\\', '/'),
                importers: unexpectedNames.map((name) => `unexpected-per-icon:${name}`),
              })
            }
          }
        }
      }

      if (startupViolations.size > 0) {
        const details = [...startupViolations.values()]
          .sort((a, b) => {
            const aKey = [a.entry, a.chunk, a.module, ...a.importers].join('\0')
            const bKey = [b.entry, b.chunk, b.module, ...b.importers].join('\0')
            return aKey < bKey ? -1 : aKey > bKey ? 1 : 0
          })
          .map(
            (violation) =>
              `entry=${violation.entry}; chunk=${violation.chunk}; module=${violation.module}; importers=${
                violation.importers.join(', ') || 'unknown'
              }`,
          )
        throw new Error(`yakit-ui-icons oldicon startup closure violations:\n${details.join('\n')}`)
      }

      const renderedNames: Record<IconFamily, Set<string>> = {
        outline: new Set(),
        solid: new Set(),
        colorful: new Set(),
        oldicon: new Set(),
      }

      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const [rawId, renderedModule] of Object.entries(output.modules)) {
          const factories = factoryModules.get(rawId.replaceAll('\\', '/'))
          if (!factories) continue
          if (factories.family === 'oldicon') {
            for (const renderedExport of renderedModule.renderedExports) {
              const displayName = factories.displayNameByExport.get(renderedExport)
              if (displayName) renderedNames.oldicon.add(displayName)
            }
          }
          if (renderedModule.code == null) continue
          for (const displayName of factories.displayNames) {
            if (renderedModule.code.includes(`"${displayName}"`) || renderedModule.code.includes(`'${displayName}'`)) {
              renderedNames[factories.family].add(displayName)
            }
          }
        }
      }

      for (const family of ICON_FAMILIES) {
        const hasEntry =
          family === 'oldicon'
            ? [...factoryModules.values()].some((module) => module.family === 'oldicon')
            : familyEntries.has(family)
        if (importedNames[family].size === 0 && !hasEntry) continue
        const publicMap =
          family === 'oldicon'
            ? new Map(
                [...factoryModules.values()]
                  .filter((module) => module.family === 'oldicon')
                  .flatMap((module) => [...module.displayNameByExport])
                  .map(([publicName, displayName]) => [
                    publicName,
                    { publicName, internalBinding: publicName, displayName },
                  ]),
              )
            : buildPublicMap(family)
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
        if (total === 0 || ((family !== 'oldicon' || importsOldIconBarrel) && renderedNames[family].size >= total)) {
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

  const consumerImportGuardPlugin = {
    name: 'yakit-ui-icons-consumer-import-guard',
    enforce: 'pre' as const,
    transform(this: { parse(code: string, options?: { lang: string }): AstNode }, code: string, id: string) {
      const normalizedId = id.replaceAll('\\', '/')
      if (normalizedId.includes('/node_modules/') || !code.includes(YAKIT_UI_ICONS_PACKAGE)) return null
      const extension = normalizedId.split('?', 1)[0].match(/\.([cm]?[jt]sx?)$/)?.[1]
      const lang = extension === 'tsx' || extension === 'jsx' || extension === 'ts' ? extension : 'js'
      const importMetadata = { importsOldIconBarrel: false, oldIconPerIconNames: new Set<string>() }
      if (collectYakitUiIconImports(this.parse(code, { lang }), id, importedNames, importMetadata)) {
        oldIconImporters.add(normalizedId)
      }
      if (importMetadata.importsOldIconBarrel) {
        importsOldIconBarrel = true
        oldIconBarrelImporters.add(normalizedId)
      }
      if (importMetadata.oldIconPerIconNames.size > 0) {
        oldIconPerIconImportsByImporter.set(normalizedId, importMetadata.oldIconPerIconNames)
      }
      return null
    },
  }

  const htmlPreloadGatePlugin = {
    name: 'yakit-ui-icons-oldicon-html-preload-gate',
    enforce: 'post' as const,
    generateBundle(_outputOptions: unknown, bundle: OutputBundle) {
      const chunksByFileName = new Map<string, OutputChunk>()
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') chunksByFileName.set(output.fileName, output)
      }

      const entryStaticChunks = new Set<string>()
      for (const entry of chunksByFileName.values()) {
        if (!entry.isEntry) continue
        const queue = [entry.fileName]
        while (queue.length > 0) {
          const fileName = queue.shift() as string
          if (entryStaticChunks.has(fileName)) continue
          entryStaticChunks.add(fileName)
          queue.push(...(chunksByFileName.get(fileName)?.imports ?? []))
        }
      }

      const unsafePreloadChunks = new Set<string>()
      for (const rootChunk of chunksByFileName.values()) {
        if (entryStaticChunks.has(rootChunk.fileName)) continue
        const staticClosure = new Set<string>()
        const queue = [rootChunk.fileName]
        while (queue.length > 0) {
          const fileName = queue.shift() as string
          if (staticClosure.has(fileName)) continue
          staticClosure.add(fileName)
          queue.push(...(chunksByFileName.get(fileName)?.imports ?? []))
        }
        const reachesOldIcon = [...staticClosure].some((fileName) =>
          Object.keys(chunksByFileName.get(fileName)?.modules ?? {}).some((rawId) => {
            const normalizedId = rawId.replaceAll('\\', '/')
            return (
              YAKIT_UI_ICONS_OLDICON_BUNDLE_MODULE_RE.test(normalizedId) ||
              YAKIT_UI_ICONS_OLDICON_FACTORY_MODULE_RE.test(normalizedId)
            )
          }),
        )
        if (reachesOldIcon) unsafePreloadChunks.add(rootChunk.fileName)
      }
      if (unsafePreloadChunks.size === 0) return

      const violations: string[] = []
      for (const output of Object.values(bundle)) {
        if (output.type !== 'asset' || !output.fileName.endsWith('.html')) continue
        const html = String(output.source)
        for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
          const attributes = new Map<string, string>()
          for (const match of tag.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
            attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '')
          }
          const rel = attributes.get('rel')?.toLowerCase().split(/\s+/) ?? []
          const href = attributes.get('href')
          if (!rel.includes('modulepreload') || !href) continue
          const hrefPath = href.split(/[?#]/, 1)[0].replaceAll('\\', '/')
          const chunk = [...unsafePreloadChunks].find(
            (fileName) => hrefPath === fileName || hrefPath.endsWith(`/${fileName}`),
          )
          if (chunk) violations.push(`html=${output.fileName}; href=${href}; chunk=${chunk}`)
        }
      }

      if (violations.length > 0) {
        throw new Error(`yakit-ui-icons oldicon HTML modulepreload violations:\n${violations.sort().join('\n')}`)
      }
    },
  }

  return [pureFactoriesPlugin, consumerImportGuardPlugin, htmlPreloadGatePlugin]
}
