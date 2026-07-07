import React, { memo, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineDocumentIcon, OutlineDownloadIcon } from '@/assets/icon/outline'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import type { AIReportFinishCardProps } from './AIReportFinishCardType'
import styles from './AIReportFinishCard.module.scss'
import { FileSuffix } from '@/pages/yakRunner/FileTree/icon'
import { failed, success, yakitNotify } from '@/utils/notification'
import { getCodeByPath } from '@/pages/yakRunner/utils'
import { yakitDialog } from '@/services/electronBridge'
import { StreamMarkdown } from '@/pages/assetViewer/reportRenders/markdownRender'
import { Tooltip } from 'antd'
import ChatCard from '../ChatCard'
const { ipcRenderer } = window.require('electron')

export const AIReportFinishCard: React.FC<AIReportFinishCardProps> = memo((props) => {
  const { item, renderNum } = props
  const { data } = item
  const { t } = useI18nNamespaces(['aiAgent'])
  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const reportPath = useCreation(() => {
    return data.reportPath
  }, [renderNum])

  const title = useCreation(() => {
    return data.title
  }, [renderNum])

  const content = useCreation(() => {
    return data.content
  }, [renderNum])

  const handleOpenReport = useMemoizedFn(() => {
    if (!reportPath) return
    if (currentRouteKey === YakitRoute.Irify_AI_Code_Audit) {
      emiter.emit(
        'onAiCodeAuditOpenTemporaryFile',
        JSON.stringify({
          name: '审计报告.md',
          path: reportPath,
          icon: FileSuffix['md'],
          language: 'markdown',
          aiReport: true,
        }),
      )
    } else {
      yakitNotify('error', t('AIReportFinishCard.openInAICodeAuditError'))
    }
  })

  const handleDownloadReport = useMemoizedFn(async () => {
    try {
      if (!reportPath) return
      let code = await getCodeByPath(reportPath)
      if (!code) {
        yakitNotify('error', t('AIReportFinishCard.reportContentEmpty'))
        return
      }
      const baseName = (title || 'report').replace(/\.(md|markdown)$/i, '') || 'report'
      setDownloadLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 0))
      const saveRes = await yakitDialog.showSaveDialog(`${baseName}.pdf`)
      if (saveRes.canceled || !saveRes.filePath) return
      const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
      await ipcRenderer.invoke('PrintMarkdownPdfFromTemplate', {
        outputPath: saveRes.filePath,
        code,
        name: title,
        theme,
      })
      success(t('AIReportFinishCard.pdfExportSuccess'))
    } catch (e) {
      failed(t('AIReportFinishCard.pdfExportFailed', { error: String(e) }))
    } finally {
      setDownloadLoading(false)
    }
  })

  return (
    <ChatCard
      titleText={title}
      titleMore={
        <div className={styles['header-extra']}>
          <Tooltip title={t('AIReportFinishCard.openInAICodeAudit')}>
            <YakitButton size="small" type="text" icon={<OutlineDocumentIcon />} onClick={handleOpenReport} />
          </Tooltip>
          <YakitButton
            size="small"
            type="text"
            icon={<OutlineDownloadIcon />}
            onClick={handleDownloadReport}
            loading={downloadLoading}
          />
        </div>
      }
    >
      {content && <StreamMarkdown content={content || ''} />}
    </ChatCard>
  )
})
