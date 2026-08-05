import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

export const RENDERER_BUILD_METADATA_SCHEMA_VERSION = 2
export const RENDERER_BUILD_INPUT_CONTRACT = 1
export const RENDERER_BUILD_INPUTS = ['app/protos', 'app/renderer/src/main', 'package.json', 'yarn.lock']

const supportedModes = new Set(['production-unminified', 'production-minified'])
const execFileAsync = promisify(execFile)

export const getRendererBuildIdentity = async (repoRoot) => {
  const [{ stdout: head }, { stdout: status }, { stdout: filesOutput }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, maxBuffer: 1024 * 1024 }),
    execFileAsync('git', ['status', '--porcelain', '--untracked-files=normal', '--', ...RENDERER_BUILD_INPUTS], {
      cwd: repoRoot,
      maxBuffer: 4 * 1024 * 1024,
    }),
    execFileAsync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...RENDERER_BUILD_INPUTS],
      {
        cwd: repoRoot,
        encoding: 'buffer',
        maxBuffer: 32 * 1024 * 1024,
      },
    ),
  ])
  const files = filesOutput.toString('utf8').split('\0').filter(Boolean).sort()
  const hash = createHash('sha256').update(`renderer-build-input-v${RENDERER_BUILD_INPUT_CONTRACT}`)
  for (const relativePath of files) {
    hash.update('\0').update(relativePath).update('\0')
    try {
      hash.update(await readFile(path.join(repoRoot, relativePath)))
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      hash.update('<deleted>')
    }
  }
  return {
    head: head.trim(),
    dirty: status.trim().length > 0,
    inputContract: RENDERER_BUILD_INPUT_CONTRACT,
    inputs: RENDERER_BUILD_INPUTS,
    stateFingerprint: hash.digest('hex'),
  }
}

export const validateRendererBuildMetadata = (metadata, identity, metadataPath = 'yakit-e2e-build.json') => {
  if (
    metadata?.schemaVersion !== RENDERER_BUILD_METADATA_SCHEMA_VERSION ||
    !supportedModes.has(metadata?.mode) ||
    !metadata?.source?.head ||
    metadata?.source?.inputContract !== RENDERER_BUILD_INPUT_CONTRACT ||
    !metadata?.source?.stateFingerprint
  ) {
    throw new Error(`Unsupported Renderer E2E build metadata at ${metadataPath}; run \`yarn test:e2e:build\``)
  }
  if (
    metadata.source.inputContract !== identity?.inputContract ||
    metadata.source.stateFingerprint !== identity?.stateFingerprint
  ) {
    throw new Error(
      `Renderer E2E artifacts are stale for the current worktree at ${metadataPath}; run \`yarn test:e2e:build\``,
    )
  }
  return metadata
}
