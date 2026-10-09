import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HTTPFlow } from '../HTTPFlowTable.constants'

const mocks = vi.hoisted(() => ({
  formProps: undefined as Record<string, any> | undefined,
  apiBatchSetHTTPFlowIssueFields: vi.fn(),
}))

vi.mock('antd', () => ({
  Form: Object.assign(
    (props: Record<string, any>) => {
      mocks.formProps = props
      return <form>{props.children}</form>
    },
    {
      useForm: () => [{}],
      Item: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    },
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: Object.assign(({ children }: { children: React.ReactNode }) => <select>{children}</select>, {
    Option: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  }),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: { TextArea: () => <textarea /> },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('../HTTPFlowMark.utils', () => ({
  apiBatchSetHTTPFlowIssueFields: mocks.apiBatchSetHTTPFlowIssueFields,
}))

import { FlowMarkEditForm } from '../FlowMarkEditForm'

describe('FlowMarkEditForm', () => {
  beforeEach(() => {
    mocks.formProps = undefined
    mocks.apiBatchSetHTTPFlowIssueFields.mockReset()
    mocks.apiBatchSetHTTPFlowIssueFields.mockResolvedValue({ UpdatedCount: 1 })
  })

  it('initializes a single edit from the current record', () => {
    const info = {
      Id: 7,
      IssueType: 'SQL注入',
      Severity: '高危',
      Status: '待修复',
      StatusReason: '待确认',
    } as HTTPFlow

    render(<FlowMarkEditForm info={info} ids={[7]} />)

    expect(mocks.formProps?.initialValues).toEqual({
      IssueType: 'SQL注入',
      Severity: '高危',
      Status: '待修复',
      StatusReason: '待确认',
    })
  })

  it('does not overwrite fields left empty in a batch edit', async () => {
    render(<FlowMarkEditForm batch ids={[7, 8]} token="token" />)

    await mocks.formProps?.onFinish({
      IssueType: undefined,
      Severity: '',
      Status: undefined,
      StatusReason: '   ',
    })

    expect(mocks.apiBatchSetHTTPFlowIssueFields).toHaveBeenCalledWith({
      Ids: [7, 8],
      Filter: undefined,
      Token: 'token',
    })
  })
})
