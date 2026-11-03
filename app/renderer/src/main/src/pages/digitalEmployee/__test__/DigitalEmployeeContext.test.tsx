import React from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))

import { grpcQueryAIForge } from '@/pages/ai-agent/grpc'
import type { AIForge, QueryAIForgeResponse } from '@/pages/ai-agent/type/forge'
import { DigitalEmployeeProvider, useDigitalEmployee } from '../DigitalEmployeeContext'
import { createDigitalEmployeeRoleTag } from '../roleAssignment'

const forge = (id: number, role = 'threat-analyst'): AIForge => ({
  Id: id,
  ForgeName: `forge-${id}`,
  ForgeVerboseName: `Agent ${id}`,
  ForgeType: 'config',
  Tag: role ? [createDigitalEmployeeRoleTag(role)] : [],
})

const response = (agents: AIForge[], total = agents.length): QueryAIForgeResponse => ({
  Data: agents,
  Total: total,
  Pagination: { Page: 1, Limit: 100, OrderBy: 'id', Order: 'asc' },
})

const deferred = () => {
  let resolve!: (value: QueryAIForgeResponse) => void
  let reject!: (error: Error) => void
  const promise = new Promise<QueryAIForgeResponse>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const renderContext = () => {
  let current!: ReturnType<typeof useDigitalEmployee>
  const Probe = () => {
    current = useDigitalEmployee()
    return null
  }
  render(
    <DigitalEmployeeProvider enabled>
      <Probe />
    </DigitalEmployeeProvider>,
  )
  return () => current
}

describe('digital employee compatibility before upstream updates', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(grpcQueryAIForge).mockReset()
  })

  it('loads later pages, deduplicates overlapping IDs, and keeps the role default independent of server order', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => forge(i + 1)).reverse()
    const duplicate = { ...forge(100), ForgeVerboseName: 'Updated agent' }
    vi.mocked(grpcQueryAIForge)
      .mockResolvedValueOnce(response(firstPage, 101))
      .mockResolvedValueOnce(response([duplicate, forge(101, 'incident-responder')], 101))
    const read = renderContext()

    await waitFor(() => expect(read().agents).toHaveLength(101))
    expect(grpcQueryAIForge).toHaveBeenNthCalledWith(
      2,
      { Pagination: { Page: 2, Limit: 100, OrderBy: 'id', Order: 'asc' } },
      true,
    )
    expect(read().selectedAgent?.Id).toBe(1)
    expect(read().roleAgents).toHaveLength(100)
    expect(read().agents.find((agent) => agent.Id === 100)?.ForgeVerboseName).toBe('Updated agent')
    expect(read().roleAgents.some((agent) => agent.Id === 101)).toBe(false)
  })

  it('restores history by internal ForgeName despite duplicate display names and rejects invalid replacements', async () => {
    const threat = { ...forge(1), ForgeVerboseName: 'Shared display name' }
    const incident = { ...forge(2, 'incident-responder'), ForgeVerboseName: 'Shared display name' }
    vi.mocked(grpcQueryAIForge).mockResolvedValue(response([threat, incident, forge(3, '')]))
    const read = renderContext()
    await waitFor(() => expect(read().agents).toHaveLength(3))

    act(() => {
      expect(read().selectAgentByForgeName(incident.ForgeName)).toBe(true)
    })
    expect(read().selectedEmployee?.id).toBe('incident-responder')
    expect(read().selectedAgent?.Id).toBe(2)
    expect(read().confirmed).toBe(true)
    const version = read().selectionVersion

    act(() => {
      expect(read().selectAgentByForgeName(incident.ForgeName)).toBe(true)
      expect(read().selectAgentByForgeName('missing')).toBe(false)
      expect(read().selectAgentByForgeName('forge-3')).toBe(false)
      expect(read().selectAgent(1)).toBe(false)
    })
    expect(read().selectedAgent?.Id).toBe(2)
    expect(read().selectedEmployee?.id).toBe('incident-responder')
    expect(read().selectionVersion).toBe(version)
  })

  it('falls back within the current role when a refreshed agent is reassigned to another role', async () => {
    vi.mocked(grpcQueryAIForge).mockResolvedValue(response([forge(10), forge(20)]))
    const read = renderContext()
    await waitFor(() => expect(read().agents).toHaveLength(2))
    act(() => {
      expect(read().selectAgent(20)).toBe(true)
    })
    expect(read().selectedAgent?.Id).toBe(20)

    vi.mocked(grpcQueryAIForge).mockResolvedValue(response([forge(10), forge(20, 'incident-responder')]))
    act(() => read().retry())
    await waitFor(() => expect(read().roleAgents).toHaveLength(1))
    expect(read().selectedEmployee?.id).toBe('threat-analyst')
    expect(read().selectedAgent?.Id).toBe(10)
  })

  it.each(['success', 'failure'] as const)(
    'ignores an older refresh %s after a newer refresh has completed',
    async (outcome) => {
      vi.mocked(grpcQueryAIForge).mockResolvedValueOnce(response([forge(1)]))
      const read = renderContext()
      await waitFor(() => expect(read().selectedAgent?.Id).toBe(1))
      const older = deferred()
      const newer = deferred()
      vi.mocked(grpcQueryAIForge).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

      act(() => {
        read().retry()
        read().retry()
      })
      await act(async () => newer.resolve(response([forge(9)])))
      await waitFor(() => expect(read().selectedAgent?.Id).toBe(9))
      expect(read().loading).toBe(false)

      await act(async () => {
        if (outcome === 'success') older.resolve(response([forge(2)]))
        else older.reject(new Error('stale request failed'))
        await older.promise.catch(() => undefined)
      })
      expect(read().selectedAgent?.Id).toBe(9)
      expect(read().error).toBeUndefined()
      expect(read().loading).toBe(false)
    },
  )
})
