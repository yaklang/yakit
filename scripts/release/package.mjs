import { chmod, cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { artifactName, assertPlan, products, readJson, targetFromEnv, writeJson } from './model.mjs'
import { archive, extract, hashFile, run } from './io.mjs'
import { downloadEngine, injectEngine, signMacEngine, notarizeApp, verifyEngineVersion } from './engine.mjs'
import { setVersion } from './prepare.mjs'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export function makeConfig(plan, target) {
  process.env.YAKIT_EDITION = target.edition
  process.env.YAKIT_LEGACY = String(target.legacy)
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  const configFile = require.resolve('../../packageScript/electron-builder.config.js')
  delete require.cache[configFile]
  const base = require(configFile)
  const platformKey = { win32: 'win', darwin: 'mac', linux: 'linux' }[target.platform]
  const config = {
    ...base,
    electronVersion: target.electronVersion,
    directories: { ...base.directories, output: '.release/output' },
    files: [...base.files, '!.release{,/**/*}'],
    extraFiles: base.extraFiles.filter((file) => !file.to.startsWith('bins/engine-')),
    beforePack: async () => validatePrebuilt(plan, target),
    afterSign: null,
    publish: null,
    [platformKey]: {
      ...base[platformKey],
      extraFiles: [
        {
          from: `bins/flag.${target.platform === 'win32' ? 'windows' : target.platform}.txt`,
          to: `bins/flag.${target.platform === 'win32' ? 'windows' : target.platform}.txt`,
        },
        ...(target.platform === 'darwin' ? [] : [{ from: 'LICENSE.md', to: 'LICENSE.md' }]),
      ],
      artifactName: artifactName(plan, target),
    },
  }
  // Final signing is explicit: prepackaged skips beforePack, afterPack and app signing.
  if (target.platform === 'darwin') {
    config.mac.identity = null
    config.mac.notarize = false
  }
  return config
}

export async function validatePrebuilt(plan, target) {
  const { validateRendererArtifacts } = await import('../build-electron.mjs')
  await validateRendererArtifacts()
  await stat('bins/scripts/google-chrome-plugin.zip')
  const info = await readJson('dist/electron/build-info.json')
  if (info.mode !== 'production' || info.version !== plan.version) throw new Error('Stale Electron build metadata')
  for (const file of ['main/index.js', 'preload/main.js', 'preload/engine-link.js', 'preload/screenshots.js']) {
    if ((await hashFile(path.join('dist/electron', file))) !== info.hashes[file])
      throw new Error(`Stale Electron entry: ${file}`)
  }
  if ((await hashFile('dist/electron/resources/child-window/theme.css')) !== info.theme.sha256) {
    throw new Error('Stale Electron theme')
  }
  if (['win32', 'darwin'].includes(target.platform)) {
    const suffix = target.platform === 'win32' ? '-msvc' : ''
    await stat(`dist/electron/resources/screenshots/node-screenshots.${target.platform}-${target.arch}${suffix}.node`)
  }
}

export function appPaths(plan, target, directory = '.release/app') {
  const product = products[target.edition]
  const app = target.platform === 'darwin' ? path.join(directory, `${product.name}.app`) : directory
  const contents = target.platform === 'darwin' ? path.join(app, 'Contents') : app
  return {
    app,
    contents,
    resources: path.join(contents, target.platform === 'darwin' ? 'Resources' : 'resources'),
  }
}

export async function preparePackage(plan, target) {
  assertPlan(plan)
  await setVersion(plan.version)
  const { build, Platform, Arch } = require('electron-builder')
  const platform = { win32: Platform.WINDOWS, linux: Platform.LINUX, darwin: Platform.MAC }[target.platform]
  const config = makeConfig(plan, target)
  await build({ targets: platform.createTarget(['dir'], Arch[target.arch]), config, publish: 'never' })
  const outputName =
    target.platform === 'darwin'
      ? `mac${target.arch === 'arm64' ? '-arm64' : ''}`
      : `${target.platform === 'win32' ? 'win' : 'linux'}${target.arch === 'arm64' ? '-arm64' : ''}-unpacked`
  await rm('.release/app', { recursive: true, force: true })
  await cp(path.join(config.directories.output, outputName), '.release/app', {
    recursive: true,
    verbatimSymlinks: true,
  })
  const paths = appPaths(plan, target)
  const { extractFile } = require('@electron/asar')
  const appManifest = JSON.parse(extractFile(path.join(paths.resources, 'app.asar'), 'package.json').toString())
  if (appManifest.version !== plan.version) throw new Error('Preassembled application version differs')
  for (const file of [
    appManifest.main,
    'dist/electron/preload/main.js',
    'dist/electron/preload/engine-link.js',
    'app/renderer/pages/main/index.html',
    'app/renderer/engine-link-startup/dist/index.html',
  ]) {
    if (!extractFile(path.join(paths.resources, 'app.asar'), path.normalize(file)).length)
      throw new Error(`Missing packaged runtime entry: ${file}`)
  }
  await writeJson('.release/app/prepared.json', {
    schema: 1,
    sha: plan.sha,
    version: plan.version,
    target: target.id,
    asarSha256: await hashFile(path.join(paths.resources, 'app.asar')),
  })
  const file = `.release/${target.id}.tgz`
  await archive('.release/app', file)
  const descriptor = { target: target.id, sha: plan.sha, version: plan.version, sha256: await hashFile(file) }
  await writeJson(`.release/prepared-${target.id}.json`, descriptor)
  return descriptor
}

export async function restorePackage(plan, target) {
  const descriptor = plan.prepared?.find((item) => item.target === target.id)
  if (!descriptor || (await hashFile(`.release/${target.id}.tgz`)) !== descriptor.sha256)
    throw new Error('Prepared archive checksum mismatch')
  await extract(`.release/${target.id}.tgz`, '.release/app')
}

export async function finalizePackage(plan, target, { signed = true } = {}) {
  assertPlan(plan)
  await setVersion(plan.version)
  const paths = appPaths(plan, target)
  const prepared = await readJson('.release/app/prepared.json')
  if (prepared.sha !== plan.sha || prepared.version !== plan.version || prepared.target !== target.id)
    throw new Error('Prepared application identity differs')
  if ((await hashFile(path.join(paths.resources, 'app.asar'))) !== prepared.asarSha256)
    throw new Error('Prepared app.asar changed')
  await rm('.release/app/prepared.json')
  const engine = await downloadEngine(target, process.env.ENGINE_VERSION, '.release/engine')
  let identity
  if (signed && target.platform === 'darwin') {
    for (const name of ['APPLE_ID', 'APPLE_TEAM_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'CERT_BASE64', 'CERT_PASSWORD']) {
      if (!process.env[name]) throw new Error(`Missing signing credential: ${name}`)
    }
    await run('bash', ['packageScript/script/signature.sh', 'build'])
    const identities = await run('security', ['find-identity', '-v', '-p', 'codesigning', 'build.keychain'], {
      capture: true,
    })
    identity = identities
      .split('\n')
      .find((line) => line.includes(process.env.APPLE_TEAM_ID))
      ?.match(/"([^"]+)"/)?.[1]
    if (!identity) throw new Error('No Apple signing identity matched the configured team')
    await signMacEngine(engine, identity)
  }
  await verifyEngineVersion(engine)
  const receipt = await injectEngine(engine, paths.contents, target)
  // Exercise the selected engine on the target's native runner before shipping it.
  await run(process.execPath, ['scripts/engine-startup/verify-real-engine.cjs', path.resolve(engine.binary)], {
    timeout: 180000,
  })
  const config = makeConfig(plan, target)
  if (signed && target.platform === 'darwin') {
    const { signAsync } = require('@electron/osx-sign')
    await signAsync({
      app: path.resolve(paths.app),
      identity,
      platform: 'darwin',
      arch: target.arch,
      version: target.electronVersion,
      gatekeeperAssess: false,
      optionsForFile: () => ({
        hardenedRuntime: true,
        entitlements: path.resolve('packageScript/plist/entitlements.mac.plist'),
      }),
    })
    if (!target.legacy) {
      await notarizeApp(path.resolve(paths.app), {
        appBundleId: config.appId,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
      })
    }
    await run('codesign', ['--verify', '--deep', '--strict', path.resolve(paths.app)])
  }
  const { build, Platform, Arch } = require('electron-builder')
  const platform = { win32: Platform.WINDOWS, linux: Platform.LINUX, darwin: Platform.MAC }[target.platform]
  const format = { win32: 'nsis', linux: 'AppImage', darwin: 'dmg' }[target.platform]
  await build({
    targets: platform.createTarget([format], Arch[target.arch]),
    config,
    prepackaged: path.resolve(paths.app),
    publish: 'never',
  })
  const output = path.join('.release/output', artifactName(plan, target))
  if ((await stat(output)).size === 0) throw new Error('Empty installer')
  if ((await hashFile(path.join(paths.resources, 'app.asar'))) !== prepared.asarSha256)
    throw new Error('Finalization rebuilt app.asar')
  // Keep the EE Linux legacy self-extracting installers supported by the existing release.
  if (target.edition === 'yakitEE' && target.platform === 'linux' && target.legacy) {
    const folder = path.resolve('.release/run', path.basename(output, '.AppImage'))
    await mkdir(folder, { recursive: true })
    await cp(output, path.join(folder, path.basename(output)))
    await cp('packageScript/script/uos-legacy-arm.sh', path.join(folder, 'uos-legacy-arm.sh'))
    await chmod(path.join(folder, path.basename(output)), 0o755)
    await chmod(path.join(folder, 'uos-legacy-arm.sh'), 0o755)
    await run('makeself', [
      '--gzip',
      folder,
      `${output.slice(0, -9)}.run`,
      path.basename(folder),
      './uos-legacy-arm.sh',
    ])
  }
  await writeJson(`.release/result-${target.id}.json`, {
    target: target.id,
    sha: plan.sha,
    version: plan.version,
    engine: { ...receipt, binary: undefined },
    installer: path.basename(output),
    asarSha256: prepared.asarSha256,
    signed,
  })
  return output
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.chdir(root)
  const plan = await readJson('.release/plan.json')
  const target = targetFromEnv(plan)
  const command = process.argv[2]
  if (command === 'prepare') await preparePackage(plan, target)
  else if (command === 'restore') await restorePackage(plan, target)
  else if (command === 'finalize')
    await finalizePackage(plan, target, { signed: process.env.RELEASE_UNSIGNED !== 'true' })
  else throw new Error('Usage: package.mjs prepare|restore|finalize')
}
