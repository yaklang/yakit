import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { setTimeout as delay } from 'node:timers/promises'
import { assertVersion } from './model.mjs'
import { download, hashFile, run } from './io.mjs'

const require = createRequire(import.meta.url)

export function engineFile(target, slim = false) {
  const cpu = target.arch === 'arm64' ? 'arm64' : 'amd64'
  const platform = target.platform === 'win32' ? 'windows' : target.platform
  const legacy = target.platform === 'win32' && target.legacy ? 'legacy_' : ''
  return `${slim ? 'yak-slim_' : 'yak_'}${platform}_${legacy}${cpu}${target.platform === 'win32' ? '.exe' : ''}`
}

export async function downloadEngine(
  target,
  version,
  directory,
  { base = 'https://yaklang.oss-accelerate.aliyuncs.com/yak', fetch = download } = {},
) {
  assertVersion(version, 'engine version')
  await mkdir(directory, { recursive: true })
  const binary = path.resolve(directory, engineFile({ ...target, legacy: false }))
  const prefix = `${base}/${version}`
  let type = 'full'
  let source = engineFile(target)
  if (target.edition === 'yakit') {
    source = engineFile(target, true)
    if (await fetch(`${prefix}/${source}`, binary, { optional: true })) type = 'slim'
    else source = engineFile(target)
  }
  if (type === 'full') await fetch(`${prefix}/${source}`, binary)
  const checksumFile = `${binary}.sha256.txt`
  await fetch(`${prefix}/${source}.sha256.txt`, checksumFile)
  const expected = (await readFile(checksumFile, 'utf8')).trim().split(/\s+/)[0].toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(expected) || (await hashFile(binary)) !== expected) {
    throw new Error(`Engine SHA256 mismatch: ${source}; refusing packaging or execution`)
  }
  if (target.platform !== 'win32') await chmod(binary, 0o755)
  return { binary, type, version, source, sourceSha256: expected }
}

export async function signWithTimestampRetry(sign, { wait = delay } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await sign()
    } catch (error) {
      if (error.code !== 1 || !/The timestamp service is not available\./i.test(error.message) || attempt === 2)
        throw error
      console.warn('Apple timestamp service unavailable; retrying signing')
      await wait(2000 * (attempt + 1))
    }
  }
}

export async function signMacEngine(engine, identity) {
  await signWithTimestampRetry(() =>
    run('codesign', ['--force', '--timestamp', '--options', 'runtime', '--sign', identity, engine.binary], {
      capture: true,
    }),
  )
  await run('codesign', ['--verify', '--strict', engine.binary])
}

export async function injectEngine(engine, appRoot, target) {
  const bins = path.join(appRoot, 'bins')
  await mkdir(bins, { recursive: true })
  const archive = new (require('adm-zip'))()
  archive.addLocalFile(engine.binary, 'bins')
  archive.writeZip(path.join(bins, 'yak.zip'))
  await writeFile(path.join(bins, 'engine-version.txt'), `${engine.version}\n`)
  await writeFile(path.join(bins, 'engine-build-type.txt'), `${engine.type}\n`)
  if (target.platform === 'darwin') {
    // Preserve the existing runtime's upstream checksum convention; record signed bytes separately in the receipt.
    await writeFile(path.join(bins, 'engine-sha256.txt'), `${engine.sourceSha256}\n`)
  }
  return { ...engine, sha256: await hashFile(engine.binary) }
}

export async function verifyEngineVersion(engine) {
  const output = await run(engine.binary, ['version'], { capture: true, timeout: 30000 })
  const escaped = engine.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`(?:^|[^0-9A-Za-z.-])v?${escaped}(?:$|[^0-9A-Za-z.-])`).test(output)) {
    throw new Error(`Downloaded engine does not report requested version ${engine.version}: ${output}`)
  }
}

const appleNetworkError = (error) => /NSURLErrorDomain|network connection/i.test(error.message + error.stdout)

// Retry only the Apple ticket operation that lost its connection. Neither an invalid
// ticket nor a rejected submission may pass, and accepted apps are never resubmitted.
async function runStapler(action, app, { execute = run, wait = delay } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await execute('xcrun', ['stapler', action, app], { capture: true })
      return
    } catch (error) {
      if (error.code !== 68 || !appleNetworkError(error) || attempt === 2) throw error
      await wait(2000 * (attempt + 1))
    }
  }
}

export const validateStapledTicket = (app, options) => runStapler('validate', app, options)

export async function notarizeApp(
  app,
  authorization,
  { submit = require('@electron/notarize').notarize, ...options } = {},
) {
  try {
    await submit({ ...authorization, appPath: app })
  } catch (error) {
    // The SDK has already obtained acceptance when it reaches its staple step.
    // Recover that specific network failure without repeating signing or submission.
    if (!/Failed to staple your application with code: 68\b/.test(error.message) || !appleNetworkError(error))
      throw error
    await runStapler('staple', app, options)
  }
  await validateStapledTicket(app, options)
}
