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

  it('shows authorization when no cached license exists', async () => {
    const setJudgeLicense = await mount()
    await waitFor(() => expect(getRemoteValue).toHaveBeenCalledWith('LICENSE_ACTIVATION'))
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(setJudgeLicense).not.toHaveBeenCalled()
    expect(setRemoteValue).not.toHaveBeenCalled()
  })

  it('enters only after the engine validates the cached license', async () => {
    vi.mocked(getRemoteValue).mockResolvedValue(JSON.stringify('activation-code'))
    mocks.invoke.mockResolvedValue({})
    const setJudgeLicense = await mount()
    await waitFor(() => expect(setJudgeLicense).toHaveBeenCalledWith(false))
    expect(mocks.invoke).toHaveBeenCalledWith('CheckLicense', {
      LicenseActivation: 'activation-code',
      CompanyVersion: 'EnpriTrace',
    })
    expect(setRemoteValue).toHaveBeenCalledWith('LICENSE_ACTIVATION', JSON.stringify('activation-code'))
  })

  it('does not enter when the engine rejects the cached license', async () => {
    vi.mocked(getRemoteValue).mockResolvedValue(JSON.stringify('invalid-code'))
    mocks.invoke.mockRejectedValue(new Error('invalid license'))
    const setJudgeLicense = await mount()
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('CheckLicense', expect.any(Object)))
    expect(setJudgeLicense).not.toHaveBeenCalled()
    expect(setRemoteValue).not.toHaveBeenCalled()
  })

  it('keeps the enterprise product on its existing license flow', async () => {
    mocks.isMemfit.mockReturnValue(false)
    const setJudgeLicense = await mount()
    await waitFor(() => expect(getRemoteValue).toHaveBeenCalledWith('LICENSE_ACTIVATION'))
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(setJudgeLicense).not.toHaveBeenCalled()
  })
})
