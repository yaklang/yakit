// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const fixtures = []

afterEach(async () => {
  for (const directory of fixtures.splice(0)) await rm(directory, { recursive: true, force: true })
})

// Run the real CLI and concurrently dependency, replacing only the expensive build commands.
async function runBuild(failingRenderer) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yakit-cli-build-'))
  fixtures.push(root)
  await cp(path.join(repoRoot, 'cli'), path.join(root, 'cli'), {
    recursive: true,
    filter: (file) => path.basename(file) !== 'node_modules',
  })
  await symlink(path.join(repoRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction')
  const events = path.join(root, 'events.jsonl')
  for (const [name, directory] of [
    ['main', 'app/renderer/src/main'],
    ['link', 'app/renderer/engine-link-startup'],
  ]) {
    const bin = path.join(root, directory, 'node_modules/.bin')
    await mkdir(bin, { recursive: true })
    for (const command of ['vite', 'tsc']) {
      const script = path.join(bin, `${command}.cjs`)
      await writeFile(
        script,
        `#!/usr/bin/env node
const { appendFileSync } = require('node:fs')
if (${JSON.stringify(command)} === 'vite') {
  setTimeout(() => {
    appendFileSync(${JSON.stringify(events)}, JSON.stringify(${JSON.stringify(name)}) + '\\n')
    process.exit(${failingRenderer === name ? 1 : 0})
  }, ${name === 'main' ? 600 : 900})
}
`,
      )
      if (process.platform === 'win32') {
        await writeFile(path.join(bin, `${command}.cmd`), `@"${process.execPath}" "%~dp0${command}.cjs" %*\r\n`)
      } else {
        await writeFile(
          path.join(bin, command),
          `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' "$(dirname "$0")/${command}.cjs" "$@"\n`,
          { mode: 0o755 },
        )
      }
    }
  }
  await mkdir(path.join(root, 'scripts'))
  await writeFile(
    path.join(root, 'scripts/build-electron.mjs'),
    `import { appendFileSync } from 'node:fs'\nappendFileSync(${JSON.stringify(events)}, '"electron"\\n')\n`,
  )
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['cli/cli.mjs', 'build', '-v', 'yakit'], { cwd: root })
    let output = ''
    child.stdout.on('data', (data) => {
      output += data
    })
    child.stderr.on('data', (data) => {
      output += data
    })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code, output }))
  })
  return { ...result, events: (await readFile(events, 'utf8')).trim().split('\n').map(JSON.parse) }
}

describe('CLI production build ordering', () => {
  it('waits for both renderers before building Electron', async () => {
    const result = await runBuild()
    expect(result.code, result.output).toBe(0)
    expect(result.events.slice(0, 2).sort()).toEqual(['link', 'main'])
    expect(result.events[2]).toBe('electron')
  }, 15000)

  it.each(['main', 'link'])(
    'does not build Electron when %s fails',
    async (renderer) => {
      const result = await runBuild(renderer)
      expect(result.code, result.output).not.toBe(0)
      expect(result.events).not.toContain('electron')
    },
    15000,
  )
})
