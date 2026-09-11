import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GlobalConfigSettings } from '../GlobalConfigSettings'

vi.mock('@/components/configNetwork/ConfigNetworkPage', () => ({
  ConfigNetworkPage: () => <div>config-network-page</div>,
}))

describe('GlobalConfigSettings', () => {
  it('设置页全局配置只包一层 ConfigNetworkPage', () => {
    render(<GlobalConfigSettings />)
    expect(screen.getByText('config-network-page')).toBeInTheDocument()
  })
})
