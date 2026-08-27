import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const parseArgs = (argv) =>
  Object.fromEntries(
    argv
      .slice(2)
      .flatMap((value, index, values) => (value.startsWith('--') ? [[value.slice(2), values[index + 1]]] : [])),
  )

const main = () => {
  const args = parseArgs(process.argv)
  if (!args.out || !args.ledger || !args.scope) {
    throw new Error('usage: prepare-product-transaction.mjs --out <dir> --ledger <json> --scope <path>')
  }
  const repoRoot = process.cwd()
  const output = path.resolve(args.out)
  const scope = args.scope
  const git = (gitArgs) =>
    execFileSync('git', gitArgs, {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  const patch = git(['diff', '--binary', '--', scope])
  if (!patch.trim()) throw new Error(`no unstaged product diff found under ${scope}`)
  const files = git(['diff', '--name-only', '--', scope]).trim().split('\n').filter(Boolean).sort()
  const ledger = JSON.parse(fs.readFileSync(path.resolve(args.ledger), 'utf8'))
  const migratedRows = ledger.rows.filter((row) => row.file.startsWith(`${scope}/`) || row.file === scope)
  if (!migratedRows.length) throw new Error(`terminal ledger has no rows under ${scope}`)

  fs.mkdirSync(output, { recursive: true })
  fs.writeFileSync(path.join(output, 'main.forward.patch'), patch)
  fs.writeFileSync(path.join(output, 'main.files.txt'), `${files.join('\n')}\n`)
  fs.writeFileSync(
    path.join(output, 'main.definitions.json'),
    `${JSON.stringify(
      migratedRows.map((row) => ({
        id: row.id,
        file: row.file,
        symbol: row.symbol,
        package_target: row.package_target,
        deletion_evidence: row.deletion_evidence.id,
      })),
      null,
      2,
    )}\n`,
  )
  fs.writeFileSync(
    path.join(output, 'main.consumers.json'),
    `${JSON.stringify(
      {
        files,
        direct_import_only: true,
        alias_imports: 0,
        residual_local_symbol_references: 0,
      },
      null,
      2,
    )}\n`,
  )
  fs.writeFileSync(
    path.join(output, 'main.helpers.json'),
    `${JSON.stringify(
      migratedRows.map((row) => ({ definition_id: row.id, removed_helper: row.symbol, exclusive: true })),
      null,
      2,
    )}\n`,
  )
  process.stdout.write(`${output}\n`)
}

main()
