import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), isMemfit: vi.fn() }))
vi.mock('@/utils/envfile', () => ({
  isMemfit: mocks.isMemfit,
  isEnpriTrace: () => true,
  isEnpriTraceAgent: () => false,
}))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), info: vi.fn(), success: vi.fn() }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(), setRemoteValue: vi.fn() }))
vi.mock('@/utils/tool', () => ({ JSONParseLog: JSON.parse }))
vi.mock('@/components/layout/utils', () => ({ useUploadInfoByEnpriTrace: () => [{}] }))
vi.mock('@/constants/hardware', () => ({ SystemInfo: { isDev: false } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/ConfigPrivateDomain/ConfigPrivateDomain', () => ({ ConfigPrivateDomain: () => null }))
vi.mock('../LicensePage', () => ({ default: () => <div>activation form</div> }))
vi.mock('antd', () => ({ Spin: () => <div>loading</div> }))

import { getRemoteValue, setRemoteValue } from '@/utils/kv'

describe('main renderer license entry policy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('require', () => ({ ipcRenderer: { invoke: mocks.invoke } }))
    mocks.isMemfit.mockReturnValue(true)
    vi.mocked(getRemoteValue).mockResolvedValue('')
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const mount = async () => {
    const { default: EnterpriseJudgeLogin } = await import('../EnterpriseJudgeLogin')
    const setJudgeLicense = vi.fn()
    render(<EnterpriseJudgeLogin setJudgeLicense={setJudgeLicense} setJudgeLogin={vi.fn()} />)
    return setJudgeLicense
  }

  it('exits the gate without reading or writing license data during integration', async () => {
    mocks.invoke.mockResolvedValue(false)
    const setJudgeLicense = await mount()
    await waitFor(() => expect(setJudgeLicense).toHaveBeenCalledWith(false))
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    expect(mocks.invoke).toHaveBeenCalledWith('IsMemfitLicenseRequired')
    expect(getRemoteValue).not.toHaveBeenCalled()
    expect(setRemoteValue).not.toHaveBeenCalled()
  })

  it('uses the original license flow when authorization is restored', async () => {
    mocks.invoke.mockResolvedValue(true)
    const setJudgeLicense = await mount()
    await waitFor(() => expect(getRemoteValue).toHaveBeenCalledWith('LICENSE_ACTIVATION'))
    expect(setJudgeLicense).not.toHaveBeenCalled()
  })

  it('falls back to authorization when the policy cannot be read', async () => {
    mocks.invoke.mockRejectedValue(new Error('policy unavailable'))
    const setJudgeLicense = await mount()
    await waitFor(() => expect(getRemoteValue).toHaveBeenCalledWith('LICENSE_ACTIVATION'))
    expect(setJudgeLicense).not.toHaveBeenCalled()
  })

  it('does not consult the Memfit switch for enterprise products', async () => {
    mocks.isMemfit.mockReturnValue(false)
    const setJudgeLicense = await mount()
    await waitFor(() => expect(getRemoteValue).toHaveBeenCalledWith('LICENSE_ACTIVATION'))
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(setJudgeLicense).not.toHaveBeenCalled()
  })
})
