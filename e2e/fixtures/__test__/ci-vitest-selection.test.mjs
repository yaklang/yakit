// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const selector = path.join(repoRoot, 'scripts/ci-select-vitest-tests.js')
const selfTest = 'e2e/fixtures/__test__/ci-vitest-selection.test.mjs'
/** 端口 / 等待地址 / 窗口 URL 三条守卫，只在 CI 里靠选测脚本唤起 */
const linkDevTests = [
  'e2e/fixtures/__test__/link-boundary.test.mjs',
  'e2e/fixtures/__test__/start-electron.test.mjs',
  'e2e/fixtures/__test__/window-url.test.mjs',
]

const fixtures = []

afterEach(async () => {
  for (const directory of fixtures.splice(0)) await rm(directory, { recursive: true, force: true })
})

/** 用真实选测脚本跑一次变更清单，返回它写进 GITHUB_OUTPUT 的用例列表 */
async function select(changedFiles) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yakit-vitest-select-'))
  fixtures.push(root)
  const changedPath = path.join(root, 'changed.txt')
  const outputPath = path.join(root, 'github-output.txt')
  await writeFile(changedPath, changedFiles.join('\n'))
  const env = { ...process.env, CHANGED_FILES_PATH: changedPath, GITHUB_OUTPUT: outputPath }
  delete env.WORKFLOW_INPUT_TESTS
  delete env.CI_VITEST_MANUAL_TESTS
  await execFileAsync(process.execPath, [selector], { cwd: repoRoot, env })
  const line = (await readFile(outputPath, 'utf8')).trim()
  expect(line).toMatch(/^tests=/)
  const tests = line.slice('tests='.length)
  return tests === 'none' ? [] : tests.split(' ')
}

describe('ci-select-vitest-tests', () => {
  // 这条守卫写进选测脚本才有意义：漏配时端口回归在 CI 依旧全绿
  it.each([
    'app/renderer/src/main/vite.link.config.mts',
    'app/main/index.js',
    'app/main/handlers/userInfo.js',
    'scripts/start-electron.mjs',
  ])('runs the link dev guards when %s changes', async (file) => {
    expect(await select([file])).toEqual(expect.arrayContaining(linkDevTests))
  })

  it('runs a changed e2e test file itself', async () => {
    const tests = await select(['e2e/fixtures/__test__/link-boundary.test.mjs'])
    expect(tests).toContain('e2e/fixtures/__test__/link-boundary.test.mjs')
  })

  it('runs its own test when the selector changes', async () => {
    expect(await select(['scripts/ci-select-vitest-tests.js'])).toContain(selfTest)
  })

  it('selects nothing when only docs change', async () => {
    expect(await select(['docs/release-notes.md'])).toEqual([])
  })
})
