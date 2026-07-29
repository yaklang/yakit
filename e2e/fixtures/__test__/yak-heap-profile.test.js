// @vitest-environment node

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  collectYakHeapProfile,
  parseGoPProfMemoryTop,
  summarizePProfMemoryCategories,
} from '../yak-engine/yak-heap-profile.mjs'

const temporaryDirectories = []
const servers = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))))
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Yak heap profile automation', () => {
  it('parses byte-valued allocation and live-heap rows', () => {
    const parsed = parseGoPProfMemoryTop(`File: yak
Type: alloc_space
Showing nodes accounting for 9437184B, 90% of 10485760B total
      flat  flat%   sum%        cum   cum%
  6291456B    60%    60%   7340032B    70%  github.com/jinzhu/gorm.(*DB).query
  3145728B    30%    90%   3145728B    30%  github.com/yaklang/yaklang/common/crep.doMITM
 -1048576B   -10%    80%          0      0%  runtime.gcBgMarkWorker
`)

    expect(parsed).toMatchObject({
      sampleIndex: 'alloc_space',
      totalBytes: 10 * 1024 * 1024,
      shownBytes: 9 * 1024 * 1024,
      shownPercent: 90,
    })
    expect(parsed.nodes).toHaveLength(3)
    expect(parsed.nodes[0]).toMatchObject({
      function: 'github.com/jinzhu/gorm.(*DB).query',
      flatBytes: 6 * 1024 * 1024,
      cumulativeBytes: 7 * 1024 * 1024,
    })
    expect(summarizePProfMemoryCategories(parsed.nodes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'database-persistence', flatBytes: 6 * 1024 * 1024 }),
        expect.objectContaining({ category: 'mitm-http', flatBytes: 3 * 1024 * 1024 }),
      ]),
    )
  })

  it('forces GC and writes only a bounded loopback heap snapshot', async () => {
    let requestedURL
    const server = createServer((request, response) => {
      requestedURL = request.url
      response.writeHead(200, { 'content-type': 'application/octet-stream' })
      response.end('heap-profile')
    })
    servers.push(server)
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-heap-profile-test-'))
    temporaryDirectories.push(root)
    const outputPath = path.join(root, 'yak-heap.pprof')

    const capture = await collectYakHeapProfile({
      address: `127.0.0.1:${address.port}`,
      outputPath,
      maxBytes: 1024,
    })
    expect(capture).toMatchObject({
      bytes: 12,
      forcedGC: true,
      profileFile: 'yak-heap.pprof',
    })
    expect(requestedURL).toBe('/debug/pprof/heap?gc=1')
    await expect(readFile(outputPath, 'utf8')).resolves.toBe('heap-profile')
    await expect(
      collectYakHeapProfile({
        address: `127.0.0.1:${address.port}`,
        outputPath,
        maxBytes: 4,
      }),
    ).rejects.toThrow(/exceeds 4 bytes/)
  })
})
