import { DocumentDuplicateSvgIcon } from '@/assets/newIcon'
import { OutlinCompileThreeIcon, OutlineLogIcon } from '@/assets/icon/outline'
import { setClipboardText } from '@/utils/clipboard'
import { showYakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import { useMemoizedFn } from 'ahooks'
import { AIChatToolDrawerContent } from '../../chatTemplate/AIAgentChatTemplate'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../defaultConstant'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getCurrentPageTabRouteKey } from '@/utils/getMainOperatorPageBodyContainer'
import { YakitRoute } from '@/enums/yakitRoute'

export interface OperationCardFooterProps {
  copyStr?: string
  callToolId?: string
  aiFilePath?: string
}

export const OperationCardFooter: React.FC<OperationCardFooterProps> = ({ copyStr, callToolId, aiFilePath }) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const handleDetails = useMemoizedFn(() => {
    if (!callToolId) return
    const m = showYakitDrawer({
      title: t('YakitButton.detail'),
      width: '40%',
      bodyStyle: { padding: 0 },
      content: <AIChatToolDrawerContent callToolId={callToolId} aiFilePath={aiFilePath} />,
      onClose: () => m.destroy(),
    })
  })

  // 跳转并查看文件
  const handleViewFile = useMemoizedFn(() => {
    if (!aiFilePath) return
    if (getCurrentPageTabRouteKey() === YakitRoute.Irify_AI_Code_Audit) {
      emiter.emit('onAiCodeAuditOpenFileByPath', JSON.stringify({ params: { path: aiFilePath }, isHistory: false }))
    }
    emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_System }))
    setTimeout(() => {
      emiter.emit('fileSystemDefaultExpand', aiFilePath)
    }, 800)
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {copyStr && (
        <Tooltip placement="top" title="">
          <YakitButton
            size="small"
            type="text2"
            color="default"
            icon={<DocumentDuplicateSvgIcon />}
            onClick={() => setClipboardText(copyStr)}
          />
        </Tooltip>
      )}
      {aiFilePath && (
        <Tooltip placement="top" title={t('YakitButton.viewFile')}>
          <YakitButton
            size="small"
            type="text2"
            color="default"
            icon={<OutlinCompileThreeIcon />}
            onClick={handleViewFile}
          />
        </Tooltip>
      )}
      {callToolId && (
        <Tooltip placement="top" title={t('YakitButton.viewDetail')}>
          <YakitButton size="small" type="text2" color="default" icon={<OutlineLogIcon />} onClick={handleDetails} />
        </Tooltip>
      )}
    </div>
  )
}
