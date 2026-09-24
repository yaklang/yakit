import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MITMFiltersModal, { getMitmHijackFilter } from '../MITMFiltersModal'
import MITMContext, { MITMVersion } from '../../Context/MITMContext'
import { YakitRoute } from '@/enums/yakitRoute'
import { defaultMITMFilterData } from '@/defaultConstants/mitm'

const rpc = vi.hoisted(() => {
  Object.assign(window, { require: () => ({ ipcRenderer: {} }) })
  return { get: vi.fn(), save: vi.fn(), getFilter: vi.fn() }
})
vi.mock('../../MITMHacker/utils', () => ({
  grpcMITMHijackGetFilter: rpc.get,
  grpcMITMHijackSetFilter: rpc.save,
  grpcMITMGetFilter: rpc.getFilter,
  grpcClientMITMfilter: () => ({ on: vi.fn(), remove: vi.fn() }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(), setRemoteValue: vi.fn() }))
vi.mock('@/utils/notification', () => ({ info: vi.fn(), yakitFailed: vi.fn(), warn: vi.fn(), yakitNotify: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ saveABSFileToOpen: vi.fn() }))
vi.mock('@/utils/tool', () => ({ JSONParseLog: JSON.parse }))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({ YakitEditor: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
  YAKIT_IMPERATIVE_MODAL_Z_INDEX_OFFSET: 100,
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ children, onOk }: any) => (
    <div>
      {children}
      <button onClick={onOk}>Apply</button>
    </div>
  ),
}))
vi.mock('../MITMFilters', () => ({
  default: () => null,
  onFilterEmptyMITMAdvancedFilters: (filters: any[]) => filters.filter((filter) => filter.Group?.length),
  MITMFilters: React.forwardRef(({ filter }: any, ref) => {
    React.useImperativeHandle(ref, () => ({ getFormValue: () => filter || {} }))
    return null
  }),
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  rpc.get.mockResolvedValue({
    FilterData: { ...defaultMITMFilterData, IncludeUri: [{ MatcherType: 'word', Group: ['/login'] }] },
  })
  rpc.getFilter.mockResolvedValue({ FilterData: defaultMITMFilterData })
  rpc.save.mockResolvedValue({})
})

const showSettings = (version: MITMVersion, filterType: 'filter' | 'hijackFilter' = 'hijackFilter') =>
  render(
    <MITMContext.Provider value={{ mitmStore: { version, route: YakitRoute.MITMHacker } }}>
      <MITMFiltersModal filterType={filterType} isStartMITM visible setVisible={vi.fn()} />
    </MITMContext.Provider>,
  )

describe('conditional hijack behavior settings', () => {
  it.each([MITMVersion.V1, MITMVersion.V2])(
    'saves either behavior with the matching rule for version %s',
    async (version) => {
      showSettings(version)
      const matched = screen.getByRole('radio', { name: 'MITMFiltersModal.hijack_matched_only' })
      const manual = screen.getByRole('radio', { name: 'MITMFiltersModal.hijack_switch_manual' })
      await waitFor(() => expect(rpc.get).toHaveBeenCalled())
      expect(matched).toBeChecked()
      expect(screen.getByText('3、MITMFiltersModal.hijack_filter_priority_tip')).toBeInTheDocument()
      fireEvent.click(manual)
      fireEvent.click(screen.getByText('Apply'))
      await waitFor(() =>
        expect(rpc.save).toHaveBeenLastCalledWith(
          expect.objectContaining({
            version,
            FilterData: expect.objectContaining({
              HijackToManual: true,
              IncludeUri: [{ MatcherType: 'word', Group: ['/login'], RuleName: undefined }],
            }),
          }),
        ),
      )
      fireEvent.click(matched)
      fireEvent.click(screen.getByText('Apply'))
      await waitFor(() =>
        expect(rpc.save).toHaveBeenLastCalledWith(
          expect.objectContaining({
            FilterData: expect.objectContaining({ HijackToManual: false }),
          }),
        ),
      )
    },
  )

  it('restores the saved behavior when settings reopen', async () => {
    rpc.get.mockResolvedValue({ FilterData: { ...defaultMITMFilterData, HijackToManual: true } })
    showSettings(MITMVersion.V2)
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'MITMFiltersModal.hijack_switch_manual' })).toBeChecked(),
    )
  })

  it('does not offer hijack behavior in the ordinary traffic filter', async () => {
    showSettings(MITMVersion.V2, 'filter')
    await waitFor(() => expect(rpc.getFilter).toHaveBeenCalled())
    expect(screen.queryByRole('radio', { name: 'MITMFiltersModal.hijack_switch_manual' })).not.toBeInTheDocument()
  })

  it('does not treat the behavior alone as a configured condition', () => {
    expect(getMitmHijackFilter({ hijackToManual: true }, [])).toBe(false)
    expect(getMitmHijackFilter({ hijackToManual: true, includeUri: ['/login'] }, [])).toBe(true)
  })
})
