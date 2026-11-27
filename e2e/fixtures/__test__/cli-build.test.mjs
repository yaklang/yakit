// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const fixtures = []
// 真实 CLI 子进程 + 临时目录复制在并行负载下开销较大，15s 容易抖动，这里放宽到 30s。
const BUILD_ORDER_TEST_TIMEOUT = 30_000

afterEach(async () => {
  for (const directory of fixtures.splice(0))
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

// Run the real CLI with lightweight Vite/Electron stand-ins instead of real builds.
async function createCliFixture(failingRenderer, { viteKeepsRunning = false, electronDelayMs = 0 } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yakit-cli-build-'))
  fixtures.push(root)
  await cp(path.join(repoRoot, 'cli'), path.join(root, 'cli'), {
    recursive: true,
    filter: (file) => path.basename(file) !== 'node_modules',
  })
  await symlink(path.join(repoRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction')
  const events = path.join(root, 'events.jsonl')
  for (const directory of ['app/renderer/src/main']) {
    const bin = path.join(root, directory, 'node_modules/.bin')
    await mkdir(bin, { recursive: true })
    for (const command of ['vite', 'tsc']) {
      const script = path.join(bin, `${command}.cjs`)
      await writeFile(
        script,
        `#!/usr/bin/env node
const { appendFileSync } = require('node:fs')
if (${JSON.stringify(command)} === 'vite') {
  const buildName = process.argv.includes('vite.link.config.mts') ? 'link' : 'main'
  setTimeout(() => {
    appendFileSync(${JSON.stringify(events)}, JSON.stringify(buildName) + '\\n')
    if (${JSON.stringify(viteKeepsRunning)}) return setInterval(() => {}, 60000)
    process.exit(${JSON.stringify(failingRenderer)} === buildName ? 1 : 0)
  }, buildName === 'main' ? 600 : 900)
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
  await writeFile(
    path.join(root, 'scripts/start-electron.mjs'),
    `import { appendFileSync } from 'node:fs'
const args = process.argv.slice(2)
setTimeout(() => {
  appendFileSync(${JSON.stringify(events)}, JSON.stringify('electron' + (args.length ? ':' + args.join(',') : '')) + '\\n')
}, ${electronDelayMs})
`,
  )
  return { root, events }
}

async function runCli(root, args) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['cli/cli.mjs', ...args], { cwd: root })
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
  return { ...result }
}

async function runBuild(failingRenderer) {
  const { root, events } = await createCliFixture(failingRenderer)
  const result = await runCli(root, ['build', '-v', 'yakit'])
  return { ...result, events: (await readFile(events, 'utf8')).trim().split('\n').map(JSON.parse) }
}

async function runStart(args = []) {
  const { root, events } = await createCliFixture()
  const result = await runCli(root, ['start', '-v', 'yakit', ...args])
  return { ...result, events: (await readFile(events, 'utf8')).trim().split('\n').map(JSON.parse) }
}

// dev 会同时跑 Vite 与 start-electron，Vite 需要常驻，由 start-electron 退出结束命令
async function runDev(args = []) {
  const { root, events } = await createCliFixture(undefined, { viteKeepsRunning: true, electronDelayMs: 1200 })
  const result = await runCli(root, ['dev', '-v', 'yakit', ...args])
  return { ...result, events: (await readFile(events, 'utf8')).trim().split('\n').map(JSON.parse) }
}

async function runElectron(args = []) {
  const { root, events } = await createCliFixture()
  const result = await runCli(root, ['electron', ...args])
  return { ...result, events: (await readFile(events, 'utf8')).trim().split('\n').map(JSON.parse) }
}

describe('CLI production build ordering', () => {
  it(
    'waits for both renderers before building Electron',
    async () => {
      const result = await runBuild()
      expect(result.code, result.output).toBe(0)
      expect(result.events.slice(0, 2).sort()).toEqual(['link', 'main'])
      expect(result.events[2]).toBe('electron')
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )

  it.each(['main', 'link'])(
    'does not build Electron when %s fails',
    async (renderer) => {
      const result = await runBuild(renderer)
      expect(result.code, result.output).not.toBe(0)
      expect(result.events).not.toContain('electron')
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )
})

describe('CLI development servers', () => {
  it(
    'starts main and link by default',
    async () => {
      const result = await runStart()
      expect(result.code, result.output).toBe(0)
      expect(result.events.sort()).toEqual(['link', 'main'])
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )

  it.each([
    ['--main', 'main'],
    ['--link', 'link'],
  ])(
    'starts only %s',
    async (flag, expected) => {
      const result = await runStart([flag])
      expect(result.code, result.output).toBe(0)
      expect(result.events).toEqual([expected])
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )

  it(
    'rejects --main together with --link',
    async () => {
      const { root } = await createCliFixture()
      const result = await runCli(root, ['start', '-v', 'yakit', '--main', '--link'])
      expect(result.code, result.output).not.toBe(0)
      expect(result.output).toContain('不能同时使用')
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )
})

describe('CLI dev command', () => {
  it(
    'starts both renderers and awaits both by default',
    async () => {
      const result = await runDev()
      expect(result.code, result.output).toBe(0)
      // 三个进程由定时器驱动，只断言集合，避免并行负载下的顺序抖动
      expect(result.events.sort()).toEqual(['electron', 'link', 'main'])
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )

  it(
    'starts and awaits only link with --link',
    async () => {
      const result = await runDev(['--link'])
      expect(result.code, result.output).toBe(0)
      expect(result.events.sort()).toEqual(['electron:--link', 'link'])
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )
})

describe('CLI electron command', () => {
  it(
    'awaits both renderers by default',
    async () => {
      const result = await runElectron()
      expect(result.code, result.output).toBe(0)
      expect(result.events).toEqual(['electron'])
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )

  it(
    'passes --link to start-electron',
    async () => {
      const result = await runElectron(['--link'])
      expect(result.code, result.output).toBe(0)
      expect(result.events).toEqual(['electron:--link'])
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )

  it(
    'rejects --main because link is the entry window',
    async () => {
      const { root } = await createCliFixture()
      const result = await runCli(root, ['electron', '--main'])
      expect(result.code, result.output).not.toBe(0)
      expect(result.output).toContain('unknown option')
    },
    BUILD_ORDER_TEST_TIMEOUT,
  )
})
