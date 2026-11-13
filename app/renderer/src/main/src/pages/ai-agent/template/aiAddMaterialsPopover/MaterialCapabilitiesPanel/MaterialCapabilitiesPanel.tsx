import { useLayoutEffect, useState } from 'react'
import type { FC } from 'react'
import { useMemoizedFn, useRequest } from 'ahooks'
import {
  FlowOutlined,
  RefreshOutlined,
  ShieldExclamationOutlined,
  Wrench1Outlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { ColorsPreViewMDIcon } from '@yakit-libs/yakit-ui-icons/oldicon/ColorsPreViewMDIcon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIEnabledCapability, AIReActRecommendedSkill } from '@/pages/ai-re-act/hooks/grpcApi'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import { yakitNotify } from '@/utils/notification'
import { ColorsCapabilityIcon } from '../../../aiChatWelcome/icon'
import {
  grpcGetAIReActRecommendedSkills,
  grpcResetAIReActRecommendedSkill,
  grpcUpdateAIReActRecommendedSkill,
} from '../../../grpc'
import type { MaterialSummaryGroup } from '../materialSummary/type'
import type { MaterialCapabilitiesPanelProps } from './type'
import styles from './MaterialCapabilitiesPanel.module.scss'

const capabilityKey = ({ Type, Name }: AIEnabledCapability) => `${Type}:${Name}`
const emptyCapabilities: AIReActRecommendedSkill[] = []

const getIconByName = (name: string) => {
  const outlineProps = { size: 16, color: 'var(--Colors-Use-Neutral-Text-3-Secondary)' }
  switch (name) {
    case 'code-review':
      return <ColorsPreViewMDIcon />
    case 'security-engineering':
      return <ShieldExclamationOutlined {...outlineProps} />
    case 'pentest-task-design':
      return <FlowOutlined {...outlineProps} />
    default:
      return <Wrench1Outlined {...outlineProps} />
  }
}

const MaterialCapabilitiesPanel: FC<MaterialCapabilitiesPanelProps> = ({
  initialEnabledCapabilities,
  onEnabledCapabilitiesChange,
  children,
}) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [selectedCapabilityKeys, setSelectedCapabilityKeys] = useState(() =>
    initialEnabledCapabilities?.map(capabilityKey),
  )
  const [editingSkill, setEditingSkill] = useState<AIReActRecommendedSkill>()
  const [editContent, setEditContent] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const {
    data: recommendedSkills,
    loading,
    refresh: refreshCapabilities,
  } = useRequest(() => grpcGetAIReActRecommendedSkills(true), {
    onSuccess: ({ Data }) => {
      const first = Data?.[0]
      if (first) setSelectedCapabilityKeys((current) => current ?? [capabilityKey(first)])
    },
  })
  const capabilities = recommendedSkills?.Data ?? emptyCapabilities
  useLayoutEffect(() => {
    const selected = (recommendedSkills ? capabilities : (initialEnabledCapabilities ?? emptyCapabilities))
      .filter((item) => selectedCapabilityKeys?.includes(capabilityKey(item)))
      .map(({ Name, Type }) => ({ Name, Type }))
    onEnabledCapabilitiesChange?.(selected)
  }, [capabilities, initialEnabledCapabilities, onEnabledCapabilitiesChange, recommendedSkills, selectedCapabilityKeys])

  const toggleCapability = (key: string) => {
    setSelectedCapabilityKeys((current = []) =>
      current.includes(key) ? current.filter((selected) => selected !== key) : [...current, key],
    )
  }
  const getDisplayName = ({ Name, DisplayNameZhCN }: AIReActRecommendedSkill) =>
    i18n.language?.startsWith('zh') ? DisplayNameZhCN || Name : Name

  const onEdit = (item: AIReActRecommendedSkill) => {
    setEditContent(item.Content)
    setEditingSkill(item)
  }
  const handleSave = useMemoizedFn(async () => {
    if (!editingSkill || editLoading) return
    setEditLoading(true)
    try {
      await grpcUpdateAIReActRecommendedSkill({ Name: editingSkill.Name, Content: editContent })
      yakitNotify('success', '保存成功')
      setEditingSkill(undefined)
      refreshCapabilities()
    } catch {
      // 接口封装负责提示保存失败。
    } finally {
      setEditLoading(false)
    }
  })
  const handleReset = useMemoizedFn(async () => {
    if (!editingSkill || editLoading) return
    setEditLoading(true)
    try {
      const result = await grpcResetAIReActRecommendedSkill({ Name: editingSkill.Name })
      setEditContent(result.Content)
      yakitNotify('success', '已恢复默认内容')
      refreshCapabilities()
    } catch {
      // 接口封装负责提示重置失败。
    } finally {
      setEditLoading(false)
    }
  })

  const label = t('AIAddMaterialsPopover.scenarioCapabilities')
  const group: MaterialSummaryGroup = {
    key: 'capabilities',
    label,
    title: label,
    icon: <ColorsCapabilityIcon />,
    count: capabilities.filter((item) => selectedCapabilityKeys?.includes(capabilityKey(item))).length,
    headerAction: (
      <YakitButton
        type="text2"
        size="small"
        icon={<RefreshOutlined size={16} color="currentColor" />}
        aria-label={t('YakitButton.refresh')}
        loading={loading}
        onClick={refreshCapabilities}
      />
    ),
    rows: capabilities.map((item) => {
      const key = capabilityKey(item)
      return {
        key,
        name: getDisplayName(item),
        description: item.Description,
        icon: getIconByName(item.Name),
        selection: {
          checked: selectedCapabilityKeys?.includes(key) ?? false,
          onChange: () => toggleCapability(key),
        },
        onEdit: () => onEdit(item),
      }
    }),
  }

  return (
    <>
      {children(group)}
      <YakitModal
        open={!!editingSkill}
        title={editingSkill ? getDisplayName(editingSkill) : undefined}
        width={700}
        maskClosable={false}
        centered
        confirmLoading={editLoading}
        onOk={handleSave}
        onCancel={() => {
          if (!editLoading) setEditingSkill(undefined)
        }}
        getContainer={getMainOperatorPageBodyContainerOrBody}
        footerExtra={
          <YakitButton type="outline2" disabled={editLoading} onClick={handleReset}>
            恢复默认
          </YakitButton>
        }
        destroyOnHidden
      >
        <div className={styles['edit-skill-modal']}>
          <YakitEditor type="markdown" value={editContent} setValue={setEditContent} noMiniMap noLineNumber />
        </div>
      </YakitModal>
    </>
  )
}

export default MaterialCapabilitiesPanel
