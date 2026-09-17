// @vitest-environment node
import { EventEmitter } from 'node:events'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { MITMV2Session } from '../services/mitm'
import type { GrpcClient } from '../ipc/grpc'
import type { GrpcInput } from '../../shared/communication/protocol'

vi.mock('../logFile', () => ({ engineLogOutputFile: vi.fn(), getFormattedDateTime: () => '' }))

it('sends the replacement EOF before a concurrently submitted manual forward command', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yakit-mitm-session-'))
  const file = path.join(directory, 'replacement.bin')
  const bytes = Buffer.from([0, 255, 128, 1])
  await writeFile(file, bytes)
  const frames: GrpcInput<'MITMV2'>[] = []
  const backend = Object.assign(new EventEmitter(), {
    write: vi.fn((data: GrpcInput<'MITMV2'>, callback: () => void) => {
      frames.push(data)
      callback()
      return true
    }),
    cancel: vi.fn(),
    end: vi.fn(),
  })
  const session = new MITMV2Session(() => ({ MITMV2: () => backend }) as unknown as GrpcClient)
  try {
    const upload = session.upload({ TaskID: 'task', ReplaceBody: true, FilePath: file }, new AbortController().signal)
    const forward = new Promise<void>((resolve, reject) =>
      session.write(
        { ManualHijackControl: true, ManualHijackMessage: { TaskID: 'task', SendPacket: true } },
        (error) => (error ? reject(error) : resolve()),
      ),
    )
    await Promise.all([upload, forward])
    expect(frames).toHaveLength(3)
    expect(frames[0].ManualHijackMessage?.LargeRequestFileData).toEqual(bytes)
    expect(frames[1].ManualHijackMessage?.LargeRequestFileEOF).toBe(true)
    expect(frames[2].ManualHijackMessage?.SendPacket).toBe(true)
    session.cancel()
    session.cancel()
    expect(backend.cancel).toHaveBeenCalledOnce()
  } finally {
    session.cancel()
    await rm(directory, { recursive: true, force: true })
  }
})
