#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), '../..')
const FAMILIES = ['outline', 'solid', 'colorful']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'])
const TOOL_VERSION = '1.1.0'

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function collectFiles(root, predicate) {
  const files = []
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = resolve(path, entry.name)
      if (entry.isDirectory()) await visit(child)
      else if (entry.isFile() && predicate(child)) files.push(child)
    }
  }
  await visit(root)
  return files.sort()
}

function extension(path) {
  const index = path.lastIndexOf('.')
  return index === -1 ? '' : path.slice(index)
}

function loadTypeScript(repoRoot) {
  const mainPackage = resolve(repoRoot, 'app/renderer/src/main/package.json')
  return createRequire(mainPackage)('typescript')
}

function scriptKind(ts, path) {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (path.endsWith('.js') || path.endsWith('.mjs')) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

function sourceFile(ts, path, code) {
  return ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, scriptKind(ts, path))
}

function importedName(ts, specifier) {
  return (specifier.propertyName ?? specifier.name).text
}

function familyForDisplayName(displayName) {
  if (displayName.endsWith('Outlined')) return 'outline'
  if (displayName.endsWith('Solid')) return 'solid'
  if (displayName.endsWith('Colorful')) return 'colorful'
  return null
}

function pushUnique(map, key, value, findings, context) {
  if (map.has(key) && map.get(key) !== value) {
    findings.push(`${context}: ${key} maps to both ${map.get(key)} and ${value}`)
    return
  }
  map.set(key, value)
}

async function parsePackageLedger({ ts, packageRoot }) {
  const mapping = Object.fromEntries(FAMILIES.map((family) => [family, []]))
  const findings = []

  for (const family of FAMILIES) {
    const entryPath = resolve(packageRoot, 'dist', family, 'index.js')
    const entryCode = await readFile(entryPath, 'utf8')
    const entry = sourceFile(ts, entryPath, entryCode)
    const imports = new Map()
    const exports = new Map()

    for (const statement of entry.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const source = statement.moduleSpecifier.text
        if (!/^\.\.\/index-[\w-]+\.js$/.test(source)) continue
        const elements = statement.importClause?.namedBindings
        if (!elements || !ts.isNamedImports(elements)) continue
        for (const specifier of elements.elements) {
          imports.set(specifier.name.text, {
            source: resolve(dirname(entryPath), source),
            importedName: importedName(ts, specifier),
          })
        }
      } else if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const specifier of statement.exportClause.elements) {
          exports.set(specifier.name.text, (specifier.propertyName ?? specifier.name).text)
        }
      }
    }

    const internalFiles = [...new Set([...imports.values()].map((item) => item.source))]
    const displayByFileExport = new Map()
    for (const internalPath of internalFiles) {
      const code = await readFile(internalPath, 'utf8')
      const file = sourceFile(ts, internalPath, code)
      const createIconBindings = []
      const displayByBinding = new Map()
      const displayByExport = new Map()

      for (const statement of file.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          if (!/^\.\/createIcon-[\w-]+\.js$/.test(statement.moduleSpecifier.text)) continue
          const elements = statement.importClause?.namedBindings
          if (!elements || !ts.isNamedImports(elements)) continue
          for (const specifier of elements.elements) {
            if (importedName(ts, specifier) === 'c') createIconBindings.push(specifier.name.text)
          }
        }
      }

      if (createIconBindings.length !== 1) {
        findings.push(`${family}: expected one createIcon binding in ${relative(packageRoot, internalPath)}`)
        continue
      }
      const createIconBinding = createIconBindings[0]

      for (const statement of file.statements) {
        if (!ts.isVariableStatement(statement)) continue
        for (const declaration of statement.declarationList.declarations) {
          if (
            !ts.isIdentifier(declaration.name) ||
            !declaration.initializer ||
            !ts.isCallExpression(declaration.initializer)
          )
            continue
          if (
            !ts.isIdentifier(declaration.initializer.expression) ||
            declaration.initializer.expression.text !== createIconBinding
          )
            continue
          const displayArg = declaration.initializer.arguments[1]
          if (!displayArg || !ts.isStringLiteral(displayArg)) {
            findings.push(`${family}: non-literal createIcon displayName in ${relative(packageRoot, internalPath)}`)
            continue
          }
          const detectedFamily = familyForDisplayName(displayArg.text)
          if (!detectedFamily) {
            findings.push(`${family}: unknown displayName suffix ${displayArg.text}`)
          } else if (detectedFamily !== family) {
            findings.push(`${family}: mixed displayName family ${displayArg.text}`)
          }
          if ([...displayByBinding.values()].includes(displayArg.text)) {
            findings.push(`${family}: duplicate displayName ${displayArg.text}`)
          }
          displayByBinding.set(declaration.name.text, displayArg.text)
        }
      }

      for (const statement of file.statements) {
        if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause))
          continue
        for (const specifier of statement.exportClause.elements) {
          const binding = (specifier.propertyName ?? specifier.name).text
          const displayName = displayByBinding.get(binding)
          if (displayName) {
            pushUnique(displayByExport, specifier.name.text, displayName, findings, `${family} internal export`)
          }
        }
      }

      if (displayByExport.size !== displayByBinding.size) {
        findings.push(`${family}: missing internal export mapping (${displayByExport.size}/${displayByBinding.size})`)
      }
      displayByFileExport.set(internalPath, displayByExport)
    }

    const usedDisplayNames = new Map()
    for (const [publicName, localName] of exports) {
      const imported = imports.get(localName)
      const displayName = imported ? displayByFileExport.get(imported.source)?.get(imported.importedName) : null
      if (!imported || !displayName) {
        findings.push(`${family}: missing public/internal/displayName mapping for ${publicName}`)
        continue
      }
      if (usedDisplayNames.has(displayName)) {
        findings.push(
          `${family}: ambiguous displayName ${displayName} for ${usedDisplayNames.get(displayName)} and ${publicName}`,
        )
      }
      usedDisplayNames.set(displayName, publicName)
      mapping[family].push({
        public_name: publicName,
        internal_binding: imported.importedName,
        display_name: displayName,
      })
    }

    if (mapping[family].length !== imports.size || mapping[family].length !== exports.size) {
      findings.push(
        `${family}: non-bijective entry mapping (${mapping[family].length} mapped/${imports.size} imports/${exports.size} exports)`,
      )
    }
    mapping[family].sort((a, b) => a.public_name.localeCompare(b.public_name))
  }

  return { mapping, findings }
}

async function scanSourceImports({ ts, roots }) {
  const imports = Object.fromEntries(FAMILIES.map((family) => [family, new Set()]))
  const forbidden = []
  const files = []

  for (const root of roots) {
    files.push(...(await collectFiles(root, (path) => SOURCE_EXTENSIONS.has(extension(path)))))
  }

  for (const path of files) {
    const code = await readFile(path, 'utf8')
    const file = sourceFile(ts, path, code)

    function visit(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const source = node.moduleSpecifier.text
        if (source === '@yakit-libs/yakit-ui-icons' || source === '@yakit-libs/yakit-ui-icons/registry') {
          forbidden.push(`${relative(REPO_ROOT, path)}: ${source}`)
        } else {
          const family = FAMILIES.find((item) => source === `@yakit-libs/yakit-ui-icons/${item}`)
          if (family) {
            const bindings = node.importClause?.namedBindings
            if (!bindings || !ts.isNamedImports(bindings) || node.importClause?.name) {
              forbidden.push(`${relative(REPO_ROOT, path)}: non-named ${source} import`)
            } else {
              for (const specifier of bindings.elements) imports[family].add(importedName(ts, specifier))
            }
          }
        }
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const source = node.arguments[0].text
        if (source === '@yakit-libs/yakit-ui-icons' || source === '@yakit-libs/yakit-ui-icons/registry') {
          forbidden.push(`${relative(REPO_ROOT, path)}: dynamic ${source}`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }

  return {
    imports: Object.fromEntries(FAMILIES.map((family) => [family, [...imports[family]].sort()])),
    forbidden,
    files,
  }
}

function literalText(ts, node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  return null
}

async function scanRetainedDisplayNames({ ts, dist, knownDisplayNames }) {
  const jsFiles = await collectFiles(dist, (path) => path.endsWith('.js'))
  const retained = new Set()

  for (const path of jsFiles) {
    const code = await readFile(path, 'utf8')
    const file = sourceFile(ts, path, code)

    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.arguments.length >= 2) {
        const displayName = literalText(ts, node.arguments[1])
        if (displayName && knownDisplayNames.has(displayName)) retained.add(displayName)
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return { retained, jsFiles }
}

async function treeHash(files) {
  const digest = createHash('sha256')
  for (const path of files.sort()) {
    digest.update(path)
    digest.update(await readFile(path))
  }
  return digest.digest('hex')
}

function defaultPackageRoot(repoRoot, renderer) {
  const rendererRoot = renderer === 'main' ? 'app/renderer/src/main' : 'app/renderer/engine-link-startup'
  const candidates = [
    resolve(repoRoot, rendererRoot, 'node_modules/@yakit-libs/yakit-ui-icons'),
    resolve(repoRoot, 'node_modules/@yakit-libs/yakit-ui-icons'),
  ]
  const found = candidates.find((path) => existsSync(resolve(path, 'package.json')))
  if (!found) throw new Error(`Unable to locate @yakit-libs/yakit-ui-icons for ${renderer}`)
  return found
}

function defaultSourceRoots(repoRoot, renderer) {
  return [
    renderer === 'main'
      ? resolve(repoRoot, 'app/renderer/src/main/src')
      : resolve(repoRoot, 'app/renderer/engine-link-startup/src'),
  ]
}

export async function auditPackageBundle(options) {
  const startedAt = new Date().toISOString()
  const repoRoot = options.repoRoot ?? REPO_ROOT
  const packageRoot = options.packageRoot ?? defaultPackageRoot(repoRoot, options.renderer)
  const sourceRoots = options.sourceRoots ?? defaultSourceRoots(repoRoot, options.renderer)
  const ts = loadTypeScript(repoRoot)
  const packageLedger = await parsePackageLedger({ ts, packageRoot })
  const sourceLedger = await scanSourceImports({ ts, roots: sourceRoots })
  const allMappings = FAMILIES.flatMap((family) => packageLedger.mapping[family])
  const byDisplayName = new Map(allMappings.map((item) => [item.display_name, item]))
  const retainedLedger = await scanRetainedDisplayNames({
    ts,
    dist: options.dist,
    knownDisplayNames: new Set(byDisplayName.keys()),
  })
  const findings = {
    forbidden: sourceLedger.forbidden,
    ambiguous_or_missing_mapping: packageLedger.findings,
    retained_unimported: [],
    imported_not_retained: [],
    complete_catalog: [],
  }

  const retainedByFamily = Object.fromEntries(FAMILIES.map((family) => [family, []]))
  for (const displayName of retainedLedger.retained) {
    const family = familyForDisplayName(displayName)
    if (family) retainedByFamily[family].push(displayName)
  }

  for (const family of FAMILIES) {
    const publicMap = new Map(packageLedger.mapping[family].map((item) => [item.public_name, item]))
    const importedDisplays = new Set()
    for (const publicName of sourceLedger.imports[family]) {
      const mapping = publicMap.get(publicName)
      if (!mapping) {
        findings.ambiguous_or_missing_mapping.push(`${family}: imported public name has no mapping: ${publicName}`)
        continue
      }
      importedDisplays.add(mapping.display_name)
      if (!retainedLedger.retained.has(mapping.display_name)) {
        findings.imported_not_retained.push(`${family}: ${publicName} -> ${mapping.display_name}`)
      }
    }
    for (const displayName of retainedByFamily[family]) {
      if (!importedDisplays.has(displayName)) findings.retained_unimported.push(`${family}: ${displayName}`)
    }
    if (
      packageLedger.mapping[family].length > 0 &&
      retainedByFamily[family].length >= packageLedger.mapping[family].length
    ) {
      findings.complete_catalog.push(
        `${family}: ${retainedByFamily[family].length}/${packageLedger.mapping[family].length}`,
      )
    }
    retainedByFamily[family].sort()
  }

  const passed = Object.values(findings).every((items) => items.length === 0)
  const toolSource = await readFile(SCRIPT_PATH)
  const artifact = {
    schema_version: 'icon-package-bundle-audit/v1',
    tool: { name: 'audit-package-bundle', version: TOOL_VERSION, sha256: sha256(toolSource) },
    command: process.argv.join(' '),
    cwd: process.cwd(),
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    mode: options.mode,
    renderer: options.renderer,
    dist: relative(repoRoot, options.dist),
    package_version: JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')).version,
    input_hashes: {
      source: await treeHash(sourceLedger.files),
      dist: await treeHash(retainedLedger.jsFiles),
      package_entries: await treeHash(FAMILIES.map((family) => resolve(packageRoot, 'dist', family, 'index.js'))),
    },
    source_public_imports: sourceLedger.imports,
    public_internal_display_name_map: packageLedger.mapping,
    retained_display_names: retainedByFamily,
    family_totals: Object.fromEntries(FAMILIES.map((family) => [family, packageLedger.mapping[family].length])),
    findings,
    exit_status: passed ? 'pass' : 'fail',
  }

  const outputPath = resolve(options.runDir, 'bundle', `${options.mode}-${options.renderer}.json`)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`)

  if (!passed) {
    throw new Error(`yakit-ui-icons bundle audit failed; see ${outputPath}`)
  }
  return artifact
}

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!flag?.startsWith('--') || value == null) throw new Error(`Invalid argument: ${flag ?? ''}`)
    options[flag.slice(2)] = value
  }
  for (const required of ['run-dir', 'mode', 'renderer', 'dist']) {
    if (!options[required]) throw new Error(`Missing required argument --${required}`)
  }
  if (!['main', 'link'].includes(options.renderer)) throw new Error('--renderer must be main or link')
  return {
    runDir: resolve(options['run-dir']),
    mode: options.mode,
    renderer: options.renderer,
    dist: resolve(options.dist),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  auditPackageBundle(parseArgs(process.argv.slice(2))).then(
    (artifact) => {
      console.info(
        `[yakit-ui-icons] bundle audit passed for ${artifact.mode}/${artifact.renderer}: ` +
          FAMILIES.map(
            (family) => `${family} ${artifact.retained_display_names[family].length}/${artifact.family_totals[family]}`,
          ).join(', '),
      )
    },
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
