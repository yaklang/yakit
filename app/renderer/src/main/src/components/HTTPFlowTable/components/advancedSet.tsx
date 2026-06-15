import React, { useEffect, useRef, useState } from 'react'
import { Modal, Tooltip } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { DragSortIcon } from '@/assets/newIcon'
import { OutlineBanIcon, OutlineInformationcircleIcon, OutlineXIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteHistoryGV } from '@/enums/history'
import { yakitNotify } from '@/utils/notification'
import { JSONParseLog } from '@/utils/tool'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AdvancedSetProps, ColumnAllInfoItem } from '../HTTPFlowTable.constants'
import style from '../HTTPFlowTable.module.scss'

export const AdvancedSet: React.FC<AdvancedSetProps> = React.memo((props) => {
  const {
    showBackgroundRefresh = true,
    dragSelectEnabled: propDragSelectEnabled = true,
    binaryDisplayEnabled: propBinaryDisplayEnabled = true,
    columnsAllStr,
    onCancel,
    onSave,
    defalutColumnsOrder,
  } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'history'])
  /** ---------- 后台刷新 Start ---------- */
  const [backgroundRefresh, setBackgroundRefresh] = useState<boolean>(false)
  const oldBackgroundRefresh = useRef<boolean>(false)
  useEffect(() => {
    getRemoteValue(RemoteHistoryGV.BackgroundRefresh).then((e) => {
      oldBackgroundRefresh.current = !!e
      setBackgroundRefresh(!!e)
    })
  }, [])
  /** ---------- 后台刷新 End ---------- */

  /** ---------- 框选配置 Start ---------- */
  const [dragSelectEnabled, setDragSelectEnabled] = useState<boolean>(propDragSelectEnabled)
  /** ---------- 框选配置 End ---------- */

  /** ---------- 二进制展示配置 Start ---------- */
  const [binaryDisplayEnabled, setBinaryDisplayEnabled] = useState<boolean>(propBinaryDisplayEnabled)
  /** ---------- 二进制展示配置 End ---------- */

  /** ---------- 自定义列 Start ---------- */
  const [curColumnsAll, setCurColumnsAll] = useState<ColumnAllInfoItem[]>([])
  useEffect(() => {
    try {
      setCurColumnsAll(JSONParseLog(columnsAllStr))
    } catch (error) {}
  }, [columnsAllStr])
  // 处理拖拽结束
  const handleDragEnd = (result: any) => {
    if (!result.destination) return // 没有目标位置，直接返回
    const newItems = [...curColumnsAll]
    const [movedItem] = newItems.splice(result.source.index, 1) // 移除被拖拽的项
    newItems.splice(result.destination.index, 0, movedItem) // 插入到新位置
    setCurColumnsAll(newItems)
  }
  const handleResetColumn = useMemoizedFn(() => {
    const newItems = [...curColumnsAll]
    newItems.forEach((item) => {
      item.isShow = true
    })
    const sortedArr = newItems.sort((x, y) => {
      const keyX = x.dataKey
      const keyY = y.dataKey
      return defalutColumnsOrder.indexOf(keyX) - defalutColumnsOrder.indexOf(keyY)
    })
    setCurColumnsAll(sortedArr)
  })
  /** ---------- 自定义列 End ---------- */

  const handleOk = useMemoizedFn(() => {
    // 缓存后台刷新状态
    if (oldBackgroundRefresh.current !== backgroundRefresh) {
      setRemoteValue(RemoteHistoryGV.BackgroundRefresh, backgroundRefresh ? 'true' : '')
    }
    onSave({ backgroundRefresh, dragSelectEnabled, binaryDisplayEnabled, configColumnsAll: curColumnsAll })
  })

  // 判断是否有修改
  const handleJudgeModify = useMemoizedFn(async () => {
    try {
      // 是否有修改
      let isModify: boolean = false
      if (
        oldBackgroundRefresh.current !== backgroundRefresh ||
        propDragSelectEnabled !== dragSelectEnabled ||
        propBinaryDisplayEnabled !== binaryDisplayEnabled ||
        columnsAllStr !== JSON.stringify(curColumnsAll)
      ) {
        isModify = true
      }
      return isModify
    } catch (error) {
      yakitNotify('error', `${error}`)
      return null
    }
  })
  const handleClose = useMemoizedFn(async () => {
    const result = await handleJudgeModify()
    if (result == null) return

    if (result) {
      Modal.confirm({
        title: t('YakitModal.friendlyReminder'),
        icon: <ExclamationCircleOutlined />,
        content: t('AdvancedSet.saveAdvancedConfigAndClose'),
        okText: t('YakitButton.save'),
        cancelText: t('YakitButton.doNotSave'),
        closable: true,
        closeIcon: (
          <div
            onClick={(e) => {
              e.stopPropagation()
              Modal.destroyAll()
            }}
            className="modal-remove-icon"
          >
            <OutlineXIcon />
          </div>
        ),
        onOk: handleOk,
        onCancel: onCancel,
        cancelButtonProps: { size: 'small', className: 'modal-cancel-button' },
        okButtonProps: { size: 'small', className: 'modal-ok-button' },
      })
    } else {
      onCancel()
    }
  })

  return (
    <YakitDrawer
      open={true}
      width="max(700px, 40%)"
      rootClassName={style['history-advanced-set-wrapper']}
      onClose={handleClose}
      title={
        <div className={style['advanced-configuration-drawer-title']}>
          <div className={style['advanced-configuration-drawer-title-text']}>{t('AdvancedSet.advancedConfig')}</div>
          <div className={style['advanced-configuration-drawer-title-btns']}>
            <YakitButton type="outline2" onClick={onCancel}>
              {t('YakitButton.cancel')}
            </YakitButton>
            <YakitButton type="primary" onClick={handleOk}>
              {t('YakitButton.save')}
            </YakitButton>
          </div>
        </div>
      }
      maskClosable={false}
    >
      <div className={style['history-advanced-set-cont']}>
        {showBackgroundRefresh && (
          <div className={style['history-advanced-set-item']}>
            <div className={style['history-advanced-set-item-title']}>{t('AdvancedSet.refreshConfig')}</div>
            <div className={style['history-advanced-set-item-cont']}>
              <div className={style['backgroundRefresh']}>
                <YakitCheckbox
                  checked={backgroundRefresh}
                  onChange={(e) => {
                    setBackgroundRefresh(e.target.checked)
                  }}
                />
                <span className={style['title-style']}>{t('AdvancedSet.backgroundRefresh')}</span>
                <Tooltip title={t('AdvancedSet.keepRefreshingTrafficData')}>
                  <OutlineInformationcircleIcon className={style['hint-style']} />
                </Tooltip>
              </div>
            </div>
          </div>
        )}
        <div className={style['history-advanced-set-item']}>
          <div className={style['history-advanced-set-item-title']}>{t('AdvancedSet.dragSelectConfig')}</div>
          <div className={style['history-advanced-set-item-cont']}>
            <div className={style['backgroundRefresh']}>
              <YakitCheckbox
                checked={dragSelectEnabled}
                onChange={(e) => {
                  setDragSelectEnabled(e.target.checked)
                }}
              />
              <span className={style['title-style']}>{t('AdvancedSet.dragSelectMultiData')}</span>
              <Tooltip title={t('AdvancedSet.dragSelectMultiDataTip')}>
                <OutlineInformationcircleIcon className={style['hint-style']} />
              </Tooltip>
            </div>
          </div>
        </div>

        <div className={style['history-advanced-set-item']}>
          <div className={style['history-advanced-set-item-title']}>{t('AdvancedSet.binaryDisplayConfig')}</div>
          <div className={style['history-advanced-set-item-cont']}>
            <div className={style['backgroundRefresh']}>
              <YakitCheckbox
                checked={binaryDisplayEnabled}
                onChange={(e) => {
                  setBinaryDisplayEnabled(e.target.checked)
                }}
              />
              <span className={style['title-style']}>{t('AdvancedSet.binaryDisplayModal')}</span>
              <Tooltip title={t('AdvancedSet.binaryDisplayModalTip')}>
                <OutlineInformationcircleIcon className={style['hint-style']} />
              </Tooltip>
            </div>
          </div>
        </div>

        <div className={style['history-advanced-set-item']}>
          <div className={style['history-advanced-set-item-title']}>
            {t('AdvancedSet.listDisplayFieldsAndOrder')}
            <YakitButton type="text" onClick={handleResetColumn}>
              {t('YakitButton.reset')}
            </YakitButton>
          </div>
          <div className={style['history-advanced-set-item-desc']}>{t('AdvancedSet.listDisplayConfigTips')}</div>
          <div className={style['history-advanced-set-item-cont']}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="history-column-list">
                {(provided) => (
                  <div className={style['columnSet']} ref={provided.innerRef} {...provided.droppableProps}>
                    {curColumnsAll.map((item, index) => (
                      <Draggable key={item.dataKey} draggableId={item.dataKey} index={index}>
                        {(provided, snapshot) => (
                          <div
                            className={classNames(style['column-item'], {
                              [style['column-item-not-allowed']]: !item.isShow,
                            })}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <DragSortIcon />
                            <div className={style['column-title']}>{item.title}</div>
                            <Tooltip title={item.isShow ? t('YakitButton.disable') : t('YakitButton.enable')}>
                              <OutlineBanIcon
                                className={classNames(style['ban-icon'])}
                                onClick={() => {
                                  setCurColumnsAll((prev) => {
                                    const arr = prev.slice()
                                    arr.forEach((i) => {
                                      if (i.dataKey === item.dataKey) {
                                        i.isShow = !item.isShow
                                      }
                                    })
                                    return arr
                                  })
                                }}
                              />
                            </Tooltip>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>
    </YakitDrawer>
  )
})

AdvancedSet.displayName = 'AdvancedSet'

export default AdvancedSet
