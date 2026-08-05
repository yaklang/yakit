import { execFile } from 'node:child_process'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { categorizePProfFunction } from './yak-cpu-profile.mjs'
import { collectYakPProfArtifact, MAX_YAK_PPROF_ARTIFACT_BYTES } from './yak-pprof.mjs'

const execFileAsync = promisify(execFile)
const DEFAULT_PPROF_NODE_COUNT = 100

const memoryToBytes = (raw) => {
  const value = String(raw).trim()
  if (value === '0' || value === '-0') return 0
  const match = /^(-?\d+(?:\.\d+)?)(B|kB|MB|GB|TB)$/.exec(value)
  if (!match) return undefined
  const multiplier = {
    B: 1,
    kB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  }[match[2]]
  return Number(match[1]) * multiplier
}

const percentValue = (raw) => Number(String(raw).replace(/[<%]/g, ''))

export const parseGoPProfMemoryTop = (text) => {
  const source = String(text)
  const showingMatch = /^Showing nodes accounting for\s+([^,]+),\s+([^%]+)%\s+of\s+([^\s]+)\s+total/m.exec(source)
  const typeMatch = /^Type:\s+(.+)$/m.exec(source)
  const nodes = []
  const memory = '-?\\d+(?:\\.\\d+)?(?:B|kB|MB|GB|TB)'
  const percentage = '<?-?\\d+(?:\\.\\d+)?%'
  const rowPattern = new RegExp(
    `^\\s*(${memory}|-?0)\\s+(${percentage})\\s+(${percentage})\\s+(${memory}|-?0)\\s+(${percentage})\\s+(.+)$`,
  )
  for (const line of source.split(/\r?\n/)) {
    const match = rowPattern.exec(line)
    if (!match) continue
    const flatBytes = memoryToBytes(match[1])
    const cumulativeBytes = memoryToBytes(match[4])
    if (!Number.isFinite(flatBytes) || !Number.isFinite(cumulativeBytes)) continue
    nodes.push({
      function: match[6].trim(),
      flatBytes,
      flatPercent: percentValue(match[2]),
      sumPercent: percentValue(match[3]),
      cumulativeBytes,
      cumulativePercent: percentValue(match[5]),
    })
  }

  return {
    sampleIndex: typeMatch?.[1]?.trim(),
    totalBytes: memoryToBytes(showingMatch?.[3]?.trim()),
    shownBytes: memoryToBytes(showingMatch?.[1]?.trim()),
    shownPercent: showingMatch ? percentValue(showingMatch[2]) : undefined,
    nodes,
  }
}

export const summarizePProfMemoryCategories = (nodes) => {
  const categories = new Map()
  for (const node of nodes) {
    const category = categorizePProfFunction(node.function)
    const current = categories.get(category) || {
      category,
      flatBytes: 0,
      flatPercent: 0,
      functions: 0,
    }
    current.flatBytes += node.flatBytes
    current.flatPercent += node.flatPercent
    current.functions += 1
    categories.set(category, current)
  }
  return [...categories.values()].sort((left, right) => right.flatBytes - left.flatBytes)
}

export const collectYakHeapProfile = async ({
  address,
  outputPath,
  maxBytes = MAX_YAK_PPROF_ARTIFACT_BYTES,
  signal,
}) => {
  const capture = await collectYakPProfArtifact({
    address,
    profile: 'heap',
    query: { gc: 1 },
    outputPath,
    maxBytes,
    timeoutMs: 30_000,
    signal,
    label: 'Yak heap profile',
  })
  return {
    ...capture,
    forcedGC: true,
    profileFile: capture.artifactFile,
  }
}

const runPProfTop = async ({
  binaryPath,
  profilePath,
  baseProfilePath,
  sampleIndex,
  cumulative = false,
  dropNegative = false,
  nodeCount,
}) => {
  const args = [
    'tool',
    'pprof',
    '-top',
    `-nodecount=${nodeCount}`,
    '-nodefraction=0',
    '-unit=bytes',
    '-compact_labels',
    `-sample_index=${sampleIndex}`,
  ]
  if (cumulative) args.push('-cum')
  if (dropNegative) args.push('-drop_negative')
  if (baseProfilePath) args.push(`-base=${baseProfilePath}`)
  args.push(binaryPath, profilePath)
  const { stdout, stderr } = await execFileAsync('go', args, {
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  return `${stdout}${stderr ? `\n${stderr}` : ''}`.trim()
}

const writeTextArtifact = (artifactsDirectory, filename, text) =>
  writeFile(path.join(artifactsDirectory, filename), `${text}\n`)

export const analyzeYakHeapProfiles = async ({
  binaryPath,
  baselineProfilePath,
  postProfilePath,
  artifactsDirectory,
  capture,
  nodeCount = DEFAULT_PPROF_NODE_COUNT,
}) => {
  if (
    !path.isAbsolute(binaryPath) ||
    !path.isAbsolute(baselineProfilePath) ||
    !path.isAbsolute(postProfilePath) ||
    !path.isAbsolute(artifactsDirectory)
  ) {
    throw new Error('Yak heap profile analysis requires absolute binary, profile and artifact paths')
  }
  if (!Number.isInteger(nodeCount) || nodeCount < 10 || nodeCount > 500) {
    throw new Error(`Yak heap profile node count must be between 10 and 500: ${nodeCount}`)
  }

  // Run pprof sequentially: heap reports are diagnostic and should not create
  // their own short-lived CPU/memory burst on resource-constrained WSL hosts.
  const allocationDeltaFlatText = await runPProfTop({
    binaryPath,
    profilePath: postProfilePath,
    baseProfilePath: baselineProfilePath,
    sampleIndex: 'alloc_space',
    nodeCount,
  })
  const allocationDeltaCumulativeText = await runPProfTop({
    binaryPath,
    profilePath: postProfilePath,
    baseProfilePath: baselineProfilePath,
    sampleIndex: 'alloc_space',
    cumulative: true,
    nodeCount,
  })
  const liveDeltaFlatText = await runPProfTop({
    binaryPath,
    profilePath: postProfilePath,
    baseProfilePath: baselineProfilePath,
    sampleIndex: 'inuse_space',
    dropNegative: true,
    nodeCount,
  })
  const liveDeltaCumulativeText = await runPProfTop({
    binaryPath,
    profilePath: postProfilePath,
    baseProfilePath: baselineProfilePath,
    sampleIndex: 'inuse_space',
    cumulative: true,
    dropNegative: true,
    nodeCount,
  })
  const postLiveFlatText = await runPProfTop({
    binaryPath,
    profilePath: postProfilePath,
    sampleIndex: 'inuse_space',
    nodeCount,
  })

  const allocationDeltaFlat = parseGoPProfMemoryTop(allocationDeltaFlatText)
  const allocationDeltaCumulative = parseGoPProfMemoryTop(allocationDeltaCumulativeText)
  const liveDeltaFlat = parseGoPProfMemoryTop(liveDeltaFlatText)
  const liveDeltaCumulative = parseGoPProfMemoryTop(liveDeltaCumulativeText)
  const postLiveFlat = parseGoPProfMemoryTop(postLiveFlatText)
  if (!allocationDeltaFlat.nodes.length || !allocationDeltaCumulative.nodes.length) {
    throw new Error('go tool pprof produced no parseable heap allocation-delta nodes')
  }
  if (!postLiveFlat.nodes.length) throw new Error('go tool pprof produced no parseable post-run live-heap nodes')

  const [baselineStat, postStat] = await Promise.all([stat(baselineProfilePath), stat(postProfilePath)])
  const artifacts = {
    baselineProfile: path.basename(baselineProfilePath),
    postProfile: path.basename(postProfilePath),
    allocationDeltaFlat: 'yak-heap-alloc-delta-top.txt',
    allocationDeltaCumulative: 'yak-heap-alloc-delta-top-cumulative.txt',
    liveDeltaFlat: 'yak-heap-inuse-delta-top.txt',
    liveDeltaCumulative: 'yak-heap-inuse-delta-top-cumulative.txt',
    postLiveFlat: 'yak-heap-inuse-post-top.txt',
    summary: 'yak-heap-summary.json',
  }
  const summarize = (flat, cumulative) => ({
    sampleIndex: flat.sampleIndex,
    totalBytes: flat.totalBytes,
    shownBytes: flat.shownBytes,
    shownPercent: flat.shownPercent,
    leafCategories: summarizePProfMemoryCategories(flat.nodes),
    flatTop: flat.nodes,
    cumulativeTop: cumulative.nodes,
  })
  const summary = {
    schemaVersion: 1,
    kind: 'yakit-electron-yak-heap-profile-delta',
    generatedAt: new Date().toISOString(),
    diagnosticOnly: true,
    forcedGC: true,
    capture: {
      ...capture,
      baselineBytes: baselineStat.size,
      postBytes: postStat.size,
    },
    allocationDelta: summarize(allocationDeltaFlat, allocationDeltaCumulative),
    positiveLiveHeapDelta: summarize(liveDeltaFlat, liveDeltaCumulative),
    postLiveHeap: {
      sampleIndex: postLiveFlat.sampleIndex,
      totalBytes: postLiveFlat.totalBytes,
      shownBytes: postLiveFlat.shownBytes,
      shownPercent: postLiveFlat.shownPercent,
      leafCategories: summarizePProfMemoryCategories(postLiveFlat.nodes),
      flatTop: postLiveFlat.nodes,
    },
    artifacts,
  }

  await Promise.all([
    writeTextArtifact(artifactsDirectory, artifacts.allocationDeltaFlat, allocationDeltaFlatText),
    writeTextArtifact(artifactsDirectory, artifacts.allocationDeltaCumulative, allocationDeltaCumulativeText),
    writeTextArtifact(artifactsDirectory, artifacts.liveDeltaFlat, liveDeltaFlatText),
    writeTextArtifact(artifactsDirectory, artifacts.liveDeltaCumulative, liveDeltaCumulativeText),
    writeTextArtifact(artifactsDirectory, artifacts.postLiveFlat, postLiveFlatText),
    writeFile(path.join(artifactsDirectory, artifacts.summary), `${JSON.stringify(summary, null, 2)}\n`),
  ])
  return summary
}
