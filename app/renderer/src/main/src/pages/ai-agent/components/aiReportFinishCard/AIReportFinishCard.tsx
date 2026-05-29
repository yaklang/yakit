import React, { memo, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineClipboardlistIcon, OutlineDocumentIcon, OutlineDownloadIcon } from '@/assets/icon/outline'
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
const { ipcRenderer } = window.require('electron')

export const AIReportFinishCard: React.FC<AIReportFinishCardProps> = memo((props) => {
  const { item } = props
  const { data } = item
  const { t } = useI18nNamespaces(['aiAgent'])
  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const reportPath = data.reportPath
  const title = data.title
  const content = data.content

  // 打开报告
  const handleOpenReport = useMemoizedFn(() => {
    if (!reportPath) return
    if (currentRouteKey === YakitRoute.Irify_AI_Code_Audit) {
      emiter.emit(
        'onOpenTemporaryFile',
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

  // 下载报告
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
    <div className={styles['report-finish-card']}>
      <div className={styles['card-header']}>
        <div className={styles['card-header-left']}>
          <OutlineClipboardlistIcon className={styles['header-list-icon']} />
          <span className={classNames(styles['file-name'], 'yakit-single-line-ellipsis')}>{title}</span>
        </div>
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

      {content && (
        <div className={styles['card-desc']}>
          <StreamMarkdown content={content || ''} />
        </div>
      )}
    </div>
  )
})
