import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, cp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'app/shared/generated/grpc')
const temporary = await mkdtemp(path.join(tmpdir(), 'yakit-grpc-'))
const raw = path.join(temporary, 'raw')
const input = await mkdtemp(path.join(tmpdir(), 'yakit-proto-'))
const { loadSync } = require('@grpc/proto-loader')
const proto = path.join(root, 'app/protos/grpc.proto')

async function files(directory, relative = '') {
  const entries = await readdir(path.join(directory, relative), { withFileTypes: true })
  const result = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = path.join(relative, entry.name)
    if (entry.isDirectory()) result.push(...(await files(directory, name)))
    else result.push(name)
  }
  return result
}

async function mergeTypes(directory) {
  const paths = (await files(directory)).map((name) => path.join(directory, name))
  const program = ts.createProgram(paths, { noResolve: true, noLib: true, noEmit: true })
  const checker = program.getTypeChecker()
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true })
  const imports = new Set()
  const declarations = new Map()
  const bodies = []

  for (const filename of paths) {
    const source = program.getSourceFile(filename)
    const aliases = new Map()
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement)) {
        if (!statement.moduleSpecifier.text.startsWith('.')) {
          imports.add(printer.printNode(ts.EmitHint.Unspecified, statement, source))
          continue
        }
        const bindings = statement.importClause?.namedBindings
        if (!statement.importClause?.isTypeOnly || !bindings || !ts.isNamedImports(bindings)) {
          throw new Error(`Unsupported generated import in ${filename}`)
        }
        for (const binding of bindings.elements) {
          aliases.set(checker.getSymbolAtLocation(binding.name), (binding.propertyName ?? binding.name).text)
        }
      } else {
        if (
          !ts.isInterfaceDeclaration(statement) &&
          !ts.isTypeAliasDeclaration(statement) &&
          !ts.isEnumDeclaration(statement)
        ) {
          throw new Error(`Unsupported generated declaration in ${filename}`)
        }
        const name = statement.name.text
        if (declarations.has(name)) {
          throw new Error(`Duplicate generated type ${name}: ${declarations.get(name)} and ${filename}`)
        }
        declarations.set(name, filename)
      }
    }
    // Resolve imported symbols, rather than replacing text that may also be a field name or string.
    const result = ts.transform(source, [
      (context) => {
        const visit = (node) => {
          if (ts.isImportDeclaration(node)) return undefined
          if (ts.isIdentifier(node)) {
            const name = aliases.get(checker.getSymbolAtLocation(node))
            if (name) return ts.factory.createIdentifier(name)
          }
          return ts.visitEachChild(node, visit, context)
        }
        return (node) => ts.visitNode(node, visit)
      },
    ])
    bodies.push(printer.printFile(result.transformed[0]))
    result.dispose()
  }
  return [...imports, ...bodies].join('\n')
}

try {
  // proto-loader 0.6's alternateCommentMode mishandles adjacent // and /* comments.
  // Strip comments in the temporary input only, preserving quoted strings and line positions.
  const source = await readFile(proto, 'utf8')
  await writeFile(
    path.join(input, 'grpc.proto'),
    source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, (token) =>
      token.startsWith('/') ? token.replace(/[^\r\n]/g, ' ') : token,
    ),
  )
  execFileSync(
    process.execPath,
    [
      require.resolve('@grpc/proto-loader/build/bin/proto-loader-gen-types.js'),
      '--keepCase',
      '--longs=String',
      '--enums=String',
      '--defaults',
      '--oneofs',
      '--grpcLib=@grpc/grpc-js',
      `--outDir=${raw}`,
      '-I',
      path.dirname(proto),
      '--',
      path.join(input, 'grpc.proto'),
    ],
    { cwd: root, stdio: 'inherit' },
  )
  const definitions = loadSync(proto, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })
  const service = definitions['ypb.Yak']
  const methods = Object.entries(service).sort(([a], [b]) => a.localeCompare(b, 'en'))
  const map = methods
    .map(([name, method]) => {
      const kind = method.requestStream
        ? method.responseStream
          ? 'duplex'
          : 'clientStream'
        : method.responseStream
          ? 'serverStream'
          : 'unary'
      return `  ${name}: { request: ${method.requestType.type.name}; response: ${method.responseType.type.name}__Output; kind: '${kind}' }`
    })
    .join('\n')
  const descriptors = methods
    .map(
      ([name, method]) =>
        `  ${name}: { requestStream: ${method.requestStream}, responseStream: ${method.responseStream} },`,
    )
    .join('\n')
  await writeFile(
    path.join(temporary, 'types.ts'),
    `// Generated from app/protos/grpc.proto by yarn generate:grpc. Do not edit.\n${await mergeTypes(raw)}\nexport interface GrpcMethods {\n${map}\n}\n`,
  )
  await rm(raw, { recursive: true, force: true })
  await writeFile(
    path.join(temporary, 'methods.ts'),
    `// Generated by yarn generate:grpc. Do not edit.\nexport const grpcMethods = {\n${descriptors}\n} as const\n`,
  )
  // The upstream generator writes LF already; normalize to keep cross-platform checks deterministic.
  const generatedFiles = await files(temporary)
  const formatting = await resolveConfig(path.join(root, 'package.json'))
  for (const name of generatedFiles) {
    const target = path.join(temporary, name)
    const source = (await readFile(target, 'utf8'))
      .replace(/\r\n/g, '\n')
      .replaceAll(path.join(input, 'grpc.proto'), 'app/protos/grpc.proto')
    await writeFile(target, await format(source, { ...formatting, filepath: target, endOfLine: 'lf' }))
  }
  if (process.argv.includes('--check')) {
    const existing = await files(output).catch(() => [])
    const differences = new Set([...generatedFiles, ...existing])
    for (const name of [...differences]) {
      const [actual, expected] = await Promise.all([
        readFile(path.join(output, name), 'utf8').catch(() => null),
        readFile(path.join(temporary, name), 'utf8').catch(() => null),
      ])
      if (actual === expected) differences.delete(name)
    }
    if (differences.size) throw new Error(`gRPC types are stale (${differences.size} files). Run yarn generate:grpc.`)
  } else {
    await mkdir(path.dirname(output), { recursive: true })
    await rm(output, { recursive: true, force: true })
    await cp(temporary, output, { recursive: true })
  }
  console.log(
    `gRPC: ${methods.length} methods, ${generatedFiles.length} files ${process.argv.includes('--check') ? 'verified' : 'generated'}`,
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
  await rm(input, { recursive: true, force: true })
}
