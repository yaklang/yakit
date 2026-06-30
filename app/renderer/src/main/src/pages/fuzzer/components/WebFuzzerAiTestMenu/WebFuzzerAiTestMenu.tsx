import styles from './WebFuzzerAiTestMenu.module.scss'

import React, { useEffect, useMemo, useState } from 'react'
import { Dropdown, Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'

import { OutlinePencilaltIcon, OutlinePluscircleIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { WebFuzzerAiTestTemplate } from '@/defaultConstants/webFuzzerAiTestTemplates'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  loadWebFuzzerAiTestTemplates,
  saveWebFuzzerAiTestTemplates,
} from '@/pages/fuzzer/webFuzzerAiTestTemplateStorage'
import { yakitNotify } from '@/utils/notification'

import { WebFuzzerAiTestTemplateModal } from './WebFuzzerAiTestTemplateModal'
import { ColorsAIIcon } from '@/assets/icon/colors'

export interface WebFuzzerAiTestMenuProps {
  inViewport?: boolean
  onSelect: (template: WebFuzzerAiTestTemplate) => void
}

export const WebFuzzerAiTestMenu: React.FC<WebFuzzerAiTestMenuProps> = React.memo((props) => {
  const { inViewport = true, onSelect } = props
  const { t } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const [templates, setTemplates] = useState<WebFuzzerAiTestTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingIndex, setEditingIndex] = useState<number>(-1)

  const refreshTemplates = useMemoizedFn(async () => {
    setLoading(true)
    try {
      const list = await loadWebFuzzerAiTestTemplates()
      setTemplates(list)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (!inViewport) return
    refreshTemplates()
  }, [inViewport, refreshTemplates])

  const editingTemplate = useMemo(() => {
    if (editingIndex < 0) return undefined
    return templates[editingIndex]
  }, [editingIndex, templates])

  const existingLabels = useMemo(() => templates.map((item) => item.label), [templates])

  const openAddModal = useMemoizedFn(() => {
    setModalMode('add')
    setEditingIndex(-1)
    setModalVisible(true)
    setDropdownVisible(false)
  })

  const openEditModal = useMemoizedFn((index: number) => {
    setModalMode('edit')
    setEditingIndex(index)
    setModalVisible(true)
    setDropdownVisible(false)
  })

  const handleSelect = useMemoizedFn((template: WebFuzzerAiTestTemplate) => {
    setDropdownVisible(false)
    onSelect(template)
  })

  const handleDelete = useMemoizedFn(async (index: number) => {
    if (templates.length <= 1) {
      yakitNotify('info', t('WebFuzzerAiTestTemplate.deleteLastOne'))
      return
    }
    const nextTemplates = templates.filter((_, i) => i !== index)
    try {
      await saveWebFuzzerAiTestTemplates(nextTemplates)
      setTemplates(nextTemplates)
      yakitNotify('success', t('YakitNotification.deleted'))
    } catch (error) {
      yakitNotify('error', `${error}`)
    }
  })

  const handleModalSubmit = useMemoizedFn(async (value: WebFuzzerAiTestTemplate) => {
    let nextTemplates = [...templates]
    if (modalMode === 'add') {
      nextTemplates = [...nextTemplates, value]
    } else if (editingIndex >= 0) {
      nextTemplates[editingIndex] = value
    }
    try {
      await saveWebFuzzerAiTestTemplates(nextTemplates)
      setTemplates(nextTemplates)
      setModalVisible(false)
      yakitNotify('success', t('YakitNotification.saved'))
    } catch (error) {
      yakitNotify('error', `${error}`)
    }
  })

  const overlay = useMemo(
    () => (
      <div className={styles['web-fuzzer-ai-test-menu']}>
        <div className={styles['web-fuzzer-ai-test-menu-list']}>
          {templates.map((item, index) => (
            <div key={`${item.label}-${index}`} className={styles['web-fuzzer-ai-test-menu-item']}>
              <div
                className={classNames(styles['web-fuzzer-ai-test-menu-item-label'], 'content-ellipsis')}
                title={item.label}
                onClick={() => handleSelect(item)}
              >
                {item.label}
              </div>
              <div className={styles['web-fuzzer-ai-test-menu-item-actions']}>
                <YakitButton
                  type="text2"
                  size="small"
                  icon={<OutlinePencilaltIcon />}
                  className={classNames(
                    styles['web-fuzzer-ai-test-menu-item-action'],
                    styles['web-fuzzer-ai-test-menu-item-action-edit'],
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditModal(index)
                  }}
                />
                <YakitPopconfirm
                  title={t('WebFuzzerAiTestTemplate.deleteConfirm')}
                  placement="left"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    handleDelete(index)
                  }}
                >
                  <YakitButton
                    type="text2"
                    size="small"
                    colors="danger"
                    icon={<OutlineTrashIcon />}
                    className={classNames(
                      styles['web-fuzzer-ai-test-menu-item-action'],
                      styles['web-fuzzer-ai-test-menu-item-action-delete'],
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                </YakitPopconfirm>
              </div>
            </div>
          ))}
        </div>
        <div className={styles['web-fuzzer-ai-test-menu-footer']} onClick={openAddModal}>
          <OutlinePluscircleIcon />
          <span>{t('WebFuzzerAiTestTemplate.add')}</span>
        </div>
      </div>
    ),
    [templates, handleSelect, handleDelete, openAddModal, openEditModal, t],
  )

  return (
    <>
      <Dropdown
        popupRender={() => overlay}
        trigger={['click']}
        placement="bottomLeft"
        open={dropdownVisible}
        onOpenChange={(visible) => {
          if (loading) {
            yakitNotify('info', t('HTTPFuzzerPage.loadData'))
            return
          }
          setDropdownVisible(visible)
          if (visible) {
            refreshTemplates()
          }
        }}
        overlayClassName={styles['web-fuzzer-ai-test-menu-overlay']}
      >
        <Tooltip title={t('HTTPFuzzerPage.aiTest')}>
          <div className={styles['ai-button']}>
            <ColorsAIIcon />
          </div>
        </Tooltip>
      </Dropdown>
      <WebFuzzerAiTestTemplateModal
        visible={modalVisible}
        mode={modalMode}
        initialValue={editingTemplate}
        existingLabels={existingLabels}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  )
})

WebFuzzerAiTestMenu.displayName = 'WebFuzzerAiTestMenu'
