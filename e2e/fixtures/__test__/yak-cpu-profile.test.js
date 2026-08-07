// @vitest-environment node

import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { collectYakCPUProfile, parseGoPProfTop, summarizePProfLeafCategories } from '../yak-engine/yak-cpu-profile.mjs'

const temporaryDirectories = []
const servers = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))))
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Yak CPU profile automation', () => {
  it('parses flat and cumulative Go pprof rows into milliseconds', () => {
    const parsed = parseGoPProfTop(`File: yak
Type: cpu
Duration: 5.12s, Total samples = 9.80s (191.41%)
Showing nodes accounting for 8.20s, 83.67% of 9.80s total
      flat  flat%   sum%        cum   cum%
    1.20s 12.24% 12.24%     1.20s 12.24%  runtime.memmove
     640ms  6.53% 18.77%      900ms  9.18%  github.com/yaklang/yaklang/common/crep.doMITM
         0     0% 18.77%      500ms  5.10%  github.com/yaklang/yaklang/common/yakgrpc/yakit.SaveHTTPFlow
`)

    expect(parsed).toMatchObject({
      durationMs: 5120,
      totalSamplesMs: 9800,
      averageCPUPercent: 191.41,
      shownSamplesMs: 8200,
      shownPercent: 83.67,
    })
    expect(parsed.nodes).toHaveLength(3)
    expect(parsed.nodes[0]).toMatchObject({ function: 'runtime.memmove', flatMs: 1200, cumulativeMs: 1200 })
    expect(summarizePProfLeafCategories(parsed.nodes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'runtime-memory-gc', flatMs: 1200 }),
        expect.objectContaining({ category: 'mitm-http', flatMs: 640 }),
      ]),
    )
  })

  it('collects only a bounded loopback profile into the requested artifact', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/octet-stream' })
      response.end('bounded-profile')
    })
    servers.push(server)
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-cpu-profile-test-'))
    temporaryDirectories.push(root)
    const outputPath = path.join(root, 'yak-cpu.pprof')

    const capture = await collectYakCPUProfile({
      address: `127.0.0.1:${address.port}`,
      durationSeconds: 1,
      outputPath,
      maxBytes: 1024,
    })
    expect(capture).toMatchObject({ durationSeconds: 1, bytes: 15, profileFile: 'yak-cpu.pprof' })
    await expect(readFile(outputPath, 'utf8')).resolves.toBe('bounded-profile')
    await expect(
      collectYakCPUProfile({ address: `0.0.0.0:${address.port}`, durationSeconds: 1, outputPath }),
    ).rejects.toThrow(/loopback address/)
    await expect(
      collectYakCPUProfile({
        address: `127.0.0.1:${address.port}`,
        durationSeconds: 1,
        outputPath,
        maxBytes: 8,
      }),
    ).rejects.toThrow(/exceeds 8 bytes/)
  })
})
