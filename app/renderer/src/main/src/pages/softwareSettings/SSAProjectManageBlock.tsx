import React, { memo, useState } from 'react'
import { Divider } from 'antd'
import { SSAProjectTableSection } from './SSAProjectTableSection'
import { useIRifySSAProjectTable } from './IRifySSAProjectContext'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { SolidPluscircleIcon } from '@/assets/icon/solid'
import { AuditModalFormModal } from '@/pages/yakRunnerAuditCode/AuditCode/AuditCode'
import { getAuditModalLabels, SSAProjectPoolUI } from './ssaProjectTableShared'
import sectionStyles from './SSAProjectManageBlock.module.scss'

export interface SSAProjectManageBlockProps {
  titleKey?: 'internalAuditProjects' | 'externalAuditProjects' | 'auditProjectsSection'
  showAddProject?: boolean
  addProjectBindMode?: SSAProjectPoolUI
}

export const SSAProjectManageBlock: React.FC<SSAProjectManageBlockProps> = memo(
  ({ titleKey = 'auditProjectsSection', showAddProject = false, addProjectBindMode = 'shared' }) => {
    const { t } = useI18nNamespaces(['projectManage', 'yakRunner'])
    const table = useIRifySSAProjectTable()
    const [showAddModal, setShowAddModal] = useState(false)
    const bindModeUI = addProjectBindMode === 'dedicated' ? 'dedicated' : 'shared'
    const addLabels = getAuditModalLabels(bindModeUI, t)

    const titleDefaults: Record<string, string> = {
      internalAuditProjects: '内部审计项目',
      externalAuditProjects: '外部审计项目',
      auditProjectsSection: '审计项目',
    }

    return (
      <div className={sectionStyles['ssa-project-manage-block']} id="ssa-project-manage-block">
        <div className={sectionStyles['ssa-section-header']}>
          <div className={sectionStyles['ssa-section-title']}>
            {t(`ProjectManage.${titleKey}`, { defaultValue: titleDefaults[titleKey] })}
          </div>
          {showAddProject && (
            <>
              <Divider type="vertical" style={{ margin: 0 }} />
              <YakitButton icon={<SolidPluscircleIcon />} size="small" onClick={() => setShowAddModal(true)}>
                {addLabels.submit}
              </YakitButton>
            </>
          )}
          <Divider type="vertical" style={{ margin: 0 }} />
          <div className={sectionStyles['ssa-section-meta']}>
            <span>Total</span>
            <span className={sectionStyles['ssa-section-meta-num']}>{table.total}</span>
          </div>
          <Divider type="vertical" style={{ margin: 0 }} />
          <div className={sectionStyles['ssa-section-meta']}>
            <span>Selected</span>
            <span className={sectionStyles['ssa-section-meta-num']}>{table.selectedRowKeys.length}</span>
          </div>
        </div>
        <SSAProjectTableSection table={table} />
        {showAddModal && (
          <AuditModalFormModal
            databaseBindMode={addProjectBindMode === 'dedicated' ? 'dedicated' : 'shared'}
            onCancel={() => setShowAddModal(false)}
            onSuccee={() => {
              setShowAddModal(false)
              table.update(true)
            }}
            warrpId={document.getElementById('ssa-project-manage-block')}
            onRefresh={() => table.update(true)}
          />
        )}
      </div>
    )
  },
)
