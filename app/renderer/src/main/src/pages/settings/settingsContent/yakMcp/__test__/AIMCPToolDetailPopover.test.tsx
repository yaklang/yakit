import '../../../../ai-re-act/hooks/__test__/setupElectron'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MCPToolConfig } from '@/pages/ai-agent/type/aiMCP'
import { AIMCPToolDetailPopover } from '../AIMCPToolDetailPopover'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/pages/ai-re-act/hooks/useAINodeLabel', () => ({
  default: () => ({ getLabelByParams: (v: { Zh?: string }) => v.Zh || '' }),
}))

const item: MCPToolConfig = {
  ID: 1,
  ToolName: 'port_scan',
  Source: 'builtin',
  ServerName: '',
  Enable: true,
  Description: 'scan ports',
  DescriptionI18n: { Zh: '端口扫描', En: 'port scan' },
  Params: [
    { Name: 'target', Type: 'string', Description: '目标', Default: '', Required: true },
    { Name: 'ports', Type: 'string', Description: '端口', Default: '80', Required: false },
  ],
}

describe('AIMCPToolDetailPopover', () => {
  it('展示工具名、i18n 描述和参数列表', () => {
    render(<AIMCPToolDetailPopover item={item} />)
    expect(screen.getByText('port_scan')).toBeInTheDocument()
    expect(screen.getByText('端口扫描')).toBeInTheDocument()
    expect(screen.getByText('target')).toBeInTheDocument()
    expect(screen.getByText('ports')).toBeInTheDocument()
    expect(screen.getByText('目标')).toBeInTheDocument()
  })
})
