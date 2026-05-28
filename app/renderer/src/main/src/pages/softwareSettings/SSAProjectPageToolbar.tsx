import React, { memo } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { OutlineSearchIcon } from '@/assets/icon/outline'
import { TrashIcon } from '@/assets/newIcon'
import { IRifyUpdateProjectManagerModal } from '@/pages/YakRunnerProjectManager/YakRunnerProjectManager'
import { useIRifySSAProjectTable } from './IRifySSAProjectContext'

export const SSAProjectPageToolbar: React.FC = memo(() => {
  const table = useIRifySSAProjectTable()
  const {
    t,
    params,
    setParams,
    update,
    selectedRowKeys,
    openBatchDeleteHint,
    isAllowIRifyUpdate,
    setIsAllowIRifyUpdate,
  } = table

  return (
    <>
      <YakitInput.Search
        prefix={<OutlineSearchIcon />}
        placeholder={t('YakitInput.searchKeyWordPlaceholder')}
        value={params.SearchKeyword}
        onChange={(e) => setParams({ ...params, SearchKeyword: e.target.value })}
        onSearch={() => {
          setTimeout(() => update(true), 100)
        }}
      />
      <YakitButton type="outline1" colors="danger" icon={<TrashIcon />} onClick={openBatchDeleteHint}>
        {selectedRowKeys.length > 0 ? t('YakitButton.delete') : t('YakitButton.clear')}
      </YakitButton>
      <YakitButton type="outline1" onClick={() => setIsAllowIRifyUpdate(true)}>
        {t('AuditCode.migrateOldProjectData')}
      </YakitButton>
      <IRifyUpdateProjectManagerModal visible={isAllowIRifyUpdate} onClose={() => setIsAllowIRifyUpdate(false)} />
    </>
  )
})
