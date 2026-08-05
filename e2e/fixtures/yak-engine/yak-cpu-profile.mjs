import { execFile } from 'node:child_process'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { collectYakPProfArtifact, MAX_YAK_PPROF_ARTIFACT_BYTES } from './yak-pprof.mjs'

const execFileAsync = promisify(execFile)
const DEFAULT_PPROF_NODE_COUNT = 100

const durationToMilliseconds = (raw) => {
  const value = String(raw).trim()
  if (value === '0') return 0
  const match = /^(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)$/.exec(value)
  if (!match) return undefined
  const number = Number(match[1])
  const multiplier = {
    ns: 1 / 1_000_000,
    us: 1 / 1_000,
    µs: 1 / 1_000,
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
  }[match[2]]
  return number * multiplier
}

const percentValue = (raw) => Number(String(raw).replace(/[<%]/g, ''))

export const parseGoPProfTop = (text) => {
  const source = String(text)
  const durationMatch = /^Duration:\s+([^,\s]+),\s+Total samples =\s+([^\s]+)\s+\(([^)]+)%\)/m.exec(source)
  const showingMatch = /^Showing nodes accounting for\s+([^,]+),\s+([^%]+)%\s+of\s+([^\s]+)\s+total/m.exec(source)
  const nodes = []
  const rowPattern =
    /^\s*(\d+(?:\.\d+)?(?:ns|us|µs|ms|s|m|h)?|0)\s+(<?\d+(?:\.\d+)?%)\s+(<?\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?(?:ns|us|µs|ms|s|m|h)?|0)\s+(<?\d+(?:\.\d+)?%)\s+(.+)$/
  for (const line of source.split(/\r?\n/)) {
    const match = rowPattern.exec(line)
    if (!match) continue
    const flatMs = durationToMilliseconds(match[1])
    const cumulativeMs = durationToMilliseconds(match[4])
    if (!Number.isFinite(flatMs) || !Number.isFinite(cumulativeMs)) continue
    nodes.push({
      function: match[6].trim(),
      flatMs,
      flatPercent: percentValue(match[2]),
      sumPercent: percentValue(match[3]),
      cumulativeMs,
      cumulativePercent: percentValue(match[5]),
    })
  }

  return {
    durationMs: durationToMilliseconds(durationMatch?.[1]),
    totalSamplesMs: durationToMilliseconds(durationMatch?.[2]) ?? durationToMilliseconds(showingMatch?.[3]?.trim()),
    averageCPUPercent: durationMatch ? percentValue(durationMatch[3]) : undefined,
    shownSamplesMs: durationToMilliseconds(showingMatch?.[1]?.trim()),
    shownPercent: showingMatch ? percentValue(showingMatch[2]) : undefined,
    nodes,
  }
}

export const categorizePProfFunction = (functionName) => {
  const name = String(functionName).toLowerCase()
  if (name.includes('trafficguard')) return 'trafficguard'
  if (/(sqlite|database\/sql|gorm\.io|jinzhu\/gorm|yakgrpc\/yakit.*httpflow)/.test(name)) {
    return 'database-persistence'
  }
  if (/(hook_mixed_plugin|\/yakvm(?:\/|\.)|antlr|\/plugin(?:\/|\.)|coreplugin)/.test(name)) {
    return 'plugin-runtime'
  }
  if (/(common\/crep|lowhttp|martian|mitm|httpflow)/.test(name)) return 'mitm-http'
  if (/(grpc|protobuf|protoimpl)/.test(name)) return 'grpc-serialization'
  if (/^(runtime\.|internal\/runtime)/.test(name) && /(gc|scan|malloc|free|memclr|memmove)/.test(name)) {
    return 'runtime-memory-gc'
  }
  if (/^(runtime\.|internal\/runtime)/.test(name)) return 'runtime-other'
  if (/(syscall|internal\/poll|net\.)/.test(name)) return 'io-network'
  if (/(compress|crypto|encoding)/.test(name)) return 'encoding-crypto'
  return 'other'
}

export const summarizePProfLeafCategories = (nodes) => {
  const categories = new Map()
  for (const node of nodes) {
    const category = categorizePProfFunction(node.function)
    const current = categories.get(category) || { category, flatMs: 0, flatPercent: 0, functions: 0 }
    current.flatMs += node.flatMs
    current.flatPercent += node.flatPercent
    current.functions += 1
    categories.set(category, current)
  }
  return [...categories.values()].sort((left, right) => right.flatMs - left.flatMs)
}

export const collectYakCPUProfile = async ({
  address,
  durationSeconds,
  outputPath,
  maxBytes = MAX_YAK_PPROF_ARTIFACT_BYTES,
  signal,
}) => {
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 60) {
    throw new Error(`Yak CPU profile duration must be an integer between 1 and 60: ${durationSeconds}`)
  }
  const capture = await collectYakPProfArtifact({
    address,
    profile: 'profile',
    query: { seconds: durationSeconds },
    outputPath,
    maxBytes,
    timeoutMs: (durationSeconds + 15) * 1_000,
    signal,
    label: 'Yak CPU profile',
  })
  return {
    ...capture,
    durationSeconds,
    profileFile: capture.artifactFile,
  }
}

const runPProfTop = async ({ binaryPath, profilePath, cumulative, nodeCount }) => {
  const args = ['tool', 'pprof', '-top', `-nodecount=${nodeCount}`, '-unit=ms', '-compact_labels']
  if (cumulative) args.push('-cum')
  args.push(binaryPath, profilePath)
  const { stdout, stderr } = await execFileAsync('go', args, {
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  return `${stdout}${stderr ? `\n${stderr}` : ''}`.trim()
}

export const analyzeYakCPUProfile = async ({
  binaryPath,
  profilePath,
  artifactsDirectory,
  capture,
  nodeCount = DEFAULT_PPROF_NODE_COUNT,
}) => {
  if (!path.isAbsolute(binaryPath) || !path.isAbsolute(profilePath) || !path.isAbsolute(artifactsDirectory)) {
    throw new Error('Yak CPU profile analysis requires absolute binary, profile and artifact paths')
  }
  if (!Number.isInteger(nodeCount) || nodeCount < 10 || nodeCount > 500) {
    throw new Error(`Yak CPU profile node count must be between 10 and 500: ${nodeCount}`)
  }

  const [flatText, cumulativeText, profileStat] = await Promise.all([
    runPProfTop({ binaryPath, profilePath, cumulative: false, nodeCount }),
    runPProfTop({ binaryPath, profilePath, cumulative: true, nodeCount }),
    stat(profilePath),
  ])
  const flat = parseGoPProfTop(flatText)
  const cumulative = parseGoPProfTop(cumulativeText)
  if (!flat.nodes.length || !cumulative.nodes.length) {
    throw new Error('go tool pprof produced no parseable CPU nodes')
  }

  const summary = {
    schemaVersion: 1,
    kind: 'yakit-electron-yak-cpu-profile',
    generatedAt: new Date().toISOString(),
    diagnosticOnly: true,
    capture: {
      ...capture,
      bytes: profileStat.size,
    },
    pprof: {
      durationMs: flat.durationMs ?? capture?.durationSeconds * 1_000,
      totalSamplesMs: flat.totalSamplesMs,
      averageCPUPercent:
        flat.averageCPUPercent ??
        (Number.isFinite(flat.totalSamplesMs) && Number.isFinite(capture?.durationSeconds)
          ? (flat.totalSamplesMs / (capture.durationSeconds * 1_000)) * 100
          : undefined),
      shownSamplesMs: flat.shownSamplesMs,
      shownPercent: flat.shownPercent,
      leafCategories: summarizePProfLeafCategories(flat.nodes),
      flatTop: flat.nodes,
      cumulativeTop: cumulative.nodes,
    },
    artifacts: {
      profile: path.basename(profilePath),
      flatTop: 'yak-cpu-top.txt',
      cumulativeTop: 'yak-cpu-top-cumulative.txt',
    },
  }
  await Promise.all([
    writeFile(path.join(artifactsDirectory, summary.artifacts.flatTop), `${flatText}\n`),
    writeFile(path.join(artifactsDirectory, summary.artifacts.cumulativeTop), `${cumulativeText}\n`),
    writeFile(path.join(artifactsDirectory, 'yak-cpu-summary.json'), `${JSON.stringify(summary, null, 2)}\n`),
  ])
  return summary
}
