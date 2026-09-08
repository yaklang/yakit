import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/electronBridge', () => ({
  yakitClipboard: { setText: vi.fn() },
  yakitLicense: {
    isRequired: vi.fn(),
    verifyCached: vi.fn(),
    getRequestCode: vi.fn(),
    activate: vi.fn(),
  },
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: { TextArea: ({ isShowResize, ...props }: any) => <textarea {...props} /> },
}))
vi.mock('antd', () => ({ Spin: ({ children }: any) => <div>{children}</div> }))

import { yakitLicense } from '@/utils/electronBridge'
import { MemfitLicenseGate } from '../index'

describe('Memfit license entry policy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  afterEach(cleanup)

  it('enters integration mode without showing activation or calling license RPCs', async () => {
    vi.mocked(yakitLicense.isRequired).mockResolvedValue(false)
    const onVerified = vi.fn().mockResolvedValue(undefined)
    render(<MemfitLicenseGate onVerified={onVerified} />)
    expect(screen.queryByText('产品授权')).toBeNull()
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
    expect(yakitLicense.verifyCached).not.toHaveBeenCalled()
    expect(yakitLicense.getRequestCode).not.toHaveBeenCalled()
    expect(yakitLicense.activate).not.toHaveBeenCalled()
    expect(screen.queryByText('产品授权')).toBeNull()
  })

  it('restores activation when the policy requires a license', async () => {
    vi.mocked(yakitLicense.isRequired).mockResolvedValue(true)
    vi.mocked(yakitLicense.verifyCached).mockResolvedValue(false)
    vi.mocked(yakitLicense.getRequestCode).mockResolvedValue('device-request')
    const onVerified = vi.fn()
    render(<MemfitLicenseGate onVerified={onVerified} />)
    await screen.findByDisplayValue('device-request')
    expect(screen.getByText('产品授权')).toBeTruthy()
    expect(onVerified).not.toHaveBeenCalled()
  })

  it('does not allow entry if the policy IPC fails', async () => {
    vi.mocked(yakitLicense.isRequired).mockRejectedValue(new Error('policy unavailable'))
    const onVerified = vi.fn()
    render(<MemfitLicenseGate onVerified={onVerified} />)
    await screen.findByRole('alert')
    expect(onVerified).not.toHaveBeenCalled()
    expect(yakitLicense.verifyCached).not.toHaveBeenCalled()
  })
})
