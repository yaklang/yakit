import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import styles from './MITMServerStartForm.module.scss'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { useCreation, useGetState, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { info, yakitFailed, warn, yakitNotify } from '@/utils/notification'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Tooltip } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { MITMAdvancedFilter, MITMFilters, MITMFilterSchema, onFilterEmptyMITMAdvancedFilters } from './MITMFilters'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import {
  OutlineClockIcon,
  OutlineExportIcon,
  OutlinePencilaltIcon,
  OutlineSaveIcon,
  OutlineStorageIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { defaultMITMAdvancedFilter, defaultMITMFilterData } from '@/defaultConstants/mitm'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { MITMFilterUIProps, convertLocalMITMFilterRequest, convertMITMFilterUI } from './utils'
import { saveABSFileToOpen } from '@/utils/openWebsite'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { RemoteMitmGV } from '@/enums/mitm'
import {
  MITMHijackSetFilterRequest,
  MITMSetFilterRequest,
  grpcClientMITMfilter,
  grpcMITMGetFilter,
  grpcMITMHijackGetFilter,
  grpcMITMHijackSetFilter,
  grpcMITMResetFilter,
  grpcMITMSetFilter,
  grpcResetMITMFilter,
} from '../MITMHacker/utils'
import MITMContext from '../Context/MITMContext'
import { JSONParseLog } from '@/utils/tool'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const MITMAdvancedFilters = React.lazy(() => import('./MITMFilters'))
const { ipcRenderer } = window.require('electron')

export type FilterType = 'filter' | 'hijackFilter'
interface MITMFiltersModalProps {
  filterType: FilterType
  isStartMITM: boolean
  visible: boolean
  setVisible: (b: boolean) => void
  onSetHijackFilterFlag?: (b: boolean) => void // 是否配置过条件劫持
  onSetFilterFlag?: (b: boolean) => void // 是否配置过过滤器
}
interface SaveObjProps {
  filterName: string
  filter: any
  advancedFilters: MITMAdvancedFilter[]
}

type FilterSettingType = 'base-setting' | 'advanced-setting'

/**判断mitm 过滤器高级配置中是否选择了 IncludeHostname/IncludeUri */
export const getAdvancedFlag = (advancedFilters: MITMAdvancedFilter[]): boolean => {
  return !!advancedFilters.filter((ele) => ['IncludeHostnames', 'IncludeUri'].includes(ele.Field || '')).length
}
// 是否配置过条件劫持
export const getMitmHijackFilter = (baseFilter: MITMFilterSchema, advancedFilters: MITMAdvancedFilter[]): boolean => {
  return (
    !!Object.keys(baseFilter).filter((key) => {
      if (key === 'filterBundledStaticJS') {
        return false
      } else {
        return baseFilter[key].length > 0
      }
    }).length ||
    !!advancedFilters.filter((ele) =>
      ['ExcludeHostnames', 'IncludeHostnames', 'ExcludeUri', 'IncludeUri', 'ExcludeMethods'].includes(ele.Field || ''),
    ).length
  )
}
const MITMFiltersModal: React.FC<MITMFiltersModalProps> = React.memo((props) => {
  const { filterType, visible, setVisible, isStartMITM, onSetHijackFilterFlag, onSetFilterFlag } = props
  const { t } = useI18nNamespaces(['mitm', 'yakitUi'])
  const filtersRef = useRef<any>()
  const [type, setType] = useState<FilterSettingType>('base-setting')
  // filter 过滤器
  const [_mitmFilter, setMITMFilter] = useState<MITMFilterSchema>()
  const [_, setFilterName, getFilterName] = useGetState<string>('')
  const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
  const [filterData, setFilterData] = useState<MITMAdvancedFilter[]>([cloneDeep(defaultMITMAdvancedFilter)])
  const [editFilterName, setEditFilterName] = useState<string>('')
  /**弹窗打开时记录初始数据，保存时对比是否修改过 */
  const initialFilterRef = useRef<{ baseFilter: MITMFilterSchema; advancedFilters: MITMAdvancedFilter[] } | null>(null)

  const mitmContent = useContext(MITMContext)

  const mitmVersion = useCreation(() => {
    return mitmContent.mitmStore.version
  }, [mitmContent.mitmStore.version])
  const onResetFilters = useMemoizedFn(() => {
    function resetFilterOk() {
      info(t('MITMFiltersModal.reset_filter_command_sent'))
      emiter.emit('onRefFilterWhiteListEvent', mitmVersion)
      onSetFilterFlag?.(false)
      setVisible(false)
    }
    if (isStartMITM) {
      grpcMITMResetFilter(mitmVersion).then(() => {
        resetFilterOk()
      })
    } else {
      grpcResetMITMFilter().then(() => {
        resetFilterOk()
      })
    }
  })
  useEffect(() => {
    if (filterType === 'filter') {
      grpcClientMITMfilter(mitmVersion).on((filter) => {
        const value = convertMITMFilterUI(filter)
        setMITMFilter({
          ...value.baseFilter,
        })
        setFilterData([...value.advancedFilters])
      })
      return () => {
        grpcClientMITMfilter(mitmVersion).remove()
      }
    }
  }, [])
  useEffect(() => {
    if (visible) {
      getMITMFilter()
    } else {
      setEditFilterName('')
    }
  }, [visible])

  const onSetFilter = useMemoizedFn(() => {
    const params = getMITMFilterData()
    const { baseFilter, advancedFilters } = params

    if (editFilterName) {
      const filter = baseFilter
      const saveObj: SaveObjProps = {
        filterName: editFilterName,
        filter,
        advancedFilters: advancedFilters,
      }
      getRemoteValue(removeFilterKey).then((data) => {
        try {
          const saveFilterData: SaveObjProps[] = JSONParseLog(data, { page: 'MITMFiltersModal', fun: 'onSetFilter' })
          const newSaveFilterData = saveFilterData.map((item) => {
            if (item.filterName === editFilterName) {
              return saveObj
            } else {
              return item
            }
          })
          setRemoteValue(removeFilterKey, JSON.stringify(newSaveFilterData))
          yakitNotify('success', t('MITMFiltersModal.edit_success', { name: editFilterName }))
          setVisible(false)
        } catch (error) {}
      })
    }

    // baseFilter的每个字段都需要为数组，因为后端没有处理字段不存在的情况 会提示报错
    const filter = convertLocalMITMFilterRequest({ ...params })
    // 对比弹窗打开时的数据，没改过则不更新已配置标记
    const isChanged =
      !initialFilterRef.current ||
      !isEqual(baseFilter, initialFilterRef.current.baseFilter) ||
      !isEqual(advancedFilters, initialFilterRef.current.advancedFilters)
    if (filterType === 'filter') {
      const value: MITMSetFilterRequest = {
        FilterData: filter,
        version: mitmVersion,
      }
      grpcMITMSetFilter(value)
        .then(() => {
          emiter.emit('onRefFilterWhiteListEvent', mitmVersion)
          if (isChanged) {
            onSetFilterFlag?.(getMitmHijackFilter(baseFilter, advancedFilters))
          }
          setVisible(false)
          info(t('MITMFiltersModal.update_filter_status'))
        })
        .catch((err) => {
          yakitFailed(t('MITMFiltersModal.update_filter_failed', { err: err + '' }))
        })
    } else {
      const value: MITMHijackSetFilterRequest = {
        FilterData: filter,
        version: mitmVersion,
      }
      grpcMITMHijackSetFilter(value)
        .then(() => {
          // 是否配置过 劫持 过滤器
          if (isChanged && onSetHijackFilterFlag) {
            onSetHijackFilterFlag(getMitmHijackFilter(baseFilter, advancedFilters))
          }
          setVisible(false)
          info(t('MITMFiltersModal.update_hijack_status'))
        })
        .catch((err) => {
          yakitFailed(t('MITMFiltersModal.update_hijack_failed', { err: err + '' }))
        })
    }
  })
  const getMITMFilter = useMemoizedFn(() => {
    if (filterType === 'filter') {
      grpcMITMGetFilter()
        .then((val: MITMFilterSchema) => {
          const newValue = convertMITMFilterUI(val.FilterData || cloneDeep(defaultMITMFilterData))
          setMITMFilter(newValue.baseFilter)
          setFilterData(newValue.advancedFilters)
          initialFilterRef.current = {
            baseFilter: cloneDeep(newValue.baseFilter),
            advancedFilters: onFilterEmptyMITMAdvancedFilters(cloneDeep(newValue.advancedFilters)),
          }
        })
        .catch((err) => {
          yakitFailed(t('MITMFiltersModal.get_filter_failed', { err: err + '' }))
        })
    } else {
      grpcMITMHijackGetFilter()
        .then((val: MITMFilterSchema) => {
          const newValue = convertMITMFilterUI(val.FilterData || cloneDeep(defaultMITMFilterData))
          setMITMFilter(newValue.baseFilter)
          setFilterData(newValue.advancedFilters)
          initialFilterRef.current = {
            baseFilter: cloneDeep(newValue.baseFilter),
            advancedFilters: onFilterEmptyMITMAdvancedFilters(cloneDeep(newValue.advancedFilters)),
          }
        })
        .catch((err) => {
          yakitFailed(t('MITMFiltersModal.get_hijack_failed', { err: err + '' }))
        })
    }
  })
  const onClearFilters = () => {
    filtersRef.current.clearFormValue()
    setFilterData([])
  }

  const removeFilterKey = useMemo(() => {
    if (filterType === 'filter') return RemoteMitmGV.MitmSaveFilter
    if (filterType === 'hijackFilter') return RemoteMitmGV.MitmHijackFilter
    return ''
  }, [filterType])

  // 保存过滤器
  const onSaveFilter = useMemoizedFn(() => {
    const m = showYakitModal({
      title:
        filterType === 'filter' ? t('MITMFiltersModal.save_filter_config') : t('MITMFiltersModal.save_hijack_config'),
      content: (
        <div className={styles['mitm-save-filter']}>
          <YakitInput.TextArea
            placeholder={t('MITMFiltersModal.name_placeholder', {
              name: filterType === 'filter' ? t('MITMFormAdvancedConfiguration.filters') : '',
            })}
            showCount
            maxLength={50}
            onChange={(e) => {
              setFilterName(e.target.value)
            }}
          />
          <div className={styles['btn-box']}>
            <YakitButton
              type="outline2"
              onClick={() => {
                setFilterName('')
                m.destroy()
              }}
            >
              {t('YakitButton.cancel')}
            </YakitButton>
            <YakitButton
              type="primary"
              onClick={() => {
                if (getFilterName().length === 0) {
                  warn(t('MITMFiltersModal.please_enter_name'))
                  return
                }
                const filter = getMITMFilterData().baseFilter
                const saveObj: SaveObjProps = {
                  filterName: getFilterName(),
                  filter,
                  advancedFilters: getMITMFilterData().advancedFilters,
                }
                getRemoteValue(removeFilterKey).then((data) => {
                  if (!data) {
                    setRemoteValue(removeFilterKey, JSON.stringify([saveObj]))
                    info(t('MITMFiltersModal.saved_successfully'))
                    m.destroy()
                    return
                  }
                  try {
                    const saveFilterData: SaveObjProps[] = JSONParseLog(data, {
                      page: 'MITMFiltersModal',
                      fun: 'removeFilterKey',
                    })
                    if (saveFilterData.filter((item) => item.filterName === getFilterName()).length > 0) {
                      warn(t('MITMFiltersModal.duplicate_name'))
                    } else {
                      setRemoteValue(removeFilterKey, JSON.stringify([saveObj, ...saveFilterData]))
                      info(t('MITMFiltersModal.saved_successfully'))
                      m.destroy()
                    }
                  } catch (error) {}
                })
              }}
            >
              {t('YakitButton.save')}
            </YakitButton>
          </div>
        </div>
      ),
      onCancel: () => {
        setFilterName('')
        m.destroy()
      },
      footer: null,
      width: 400,
    })
  })

  const onMenuSelect = useMemoizedFn((v: MITMFilterUIProps) => {
    filtersRef.current.setFormValue(v.baseFilter)
    setFilterData(v.advancedFilters || [])
  })

  const onSetType = useMemoizedFn((e) => {
    const { value } = e.target
    setType(value)
  })

  /**获取基础配置、高级配置去除空数据 */
  const getMITMFilterData = useMemoizedFn(() => {
    const filter: MITMFilterSchema = filtersRef.current.getFormValue()
    const noEmptyFilterData: MITMAdvancedFilter[] = onFilterEmptyMITMAdvancedFilters(filterData)
    return {
      baseFilter: filter,
      advancedFilters: noEmptyFilterData,
    }
  })

  const onFilterExport = useMemoizedFn(() => {
    const baseFilter = getMITMFilterData().baseFilter
    const advancedFilters = getMITMFilterData().advancedFilters
    const encoder = new TextEncoder()
    const exportData = encoder.encode(JSON.stringify({ baseFilter, advancedFilters }))
    saveABSFileToOpen('filter-config.json', exportData)
  })

  const [importVisibel, setImportVisibel] = useState<boolean>(false)
  const onFilterImport = useMemoizedFn(() => {
    setImportVisibel(true)
  })

  return (
    <YakitModal
      visible={visible}
      onCancel={() => {
        setVisible(false)
      }}
      closable={true}
      title={
        <div className={styles['mitm-filters-title']}>
          <span>
            {filterType === 'hijackFilter'
              ? (editFilterName ? `${t('YakitButton.edit')}` : '') + t('MITMFiltersModal.hijack_condition')
              : (editFilterName ? `${t('YakitButton.edit')}` : '') + t('MITMFiltersModal.filter_configuration')}
          </span>
          <YakitRadioButtons
            value={type}
            onChange={onSetType}
            buttonStyle="solid"
            options={[
              {
                value: 'base-setting',
                label: t('MITMFiltersModal.base_configuration'),
              },
              {
                value: 'advanced-setting',
                label: t('MITMFiltersModal.advanced_configuration'),
              },
            ]}
          />
        </div>
      }
      width={730}
      maskClosable={false}
      subTitle={
        <div className={styles['mitm-filters-subTitle']}>
          {filterType === 'filter' && (
            <>
              <Tooltip title={t('MITMFiltersModal.export_configuration')} align={{ offset: [0, 10] }}>
                <YakitButton
                  style={{ padding: '3px 8px' }}
                  type="text"
                  icon={<OutlineExportIcon />}
                  onClick={onFilterExport}
                />
              </Tooltip>
              <Tooltip title={t('MITMFiltersModal.import_configuration')} align={{ offset: [0, 10] }}>
                <YakitButton
                  style={{ padding: '3px 8px' }}
                  type="text"
                  icon={<OutlineSaveIcon />}
                  onClick={onFilterImport}
                />
              </Tooltip>
              <ImportFileModal
                visible={importVisibel}
                title={t('MITMFiltersModal.import_from_json')}
                fileType="application/json"
                onCancel={() => {
                  setImportVisibel(false)
                }}
                onOk={(value) => {
                  try {
                    const importValue = JSONParseLog(value, { page: 'MITMFiltersModal', fun: 'onOk' })
                    onMenuSelect(importValue)
                    setImportVisibel(false)
                  } catch (error) {
                    yakitNotify('error', t('YakitNotification.importFailedNoError'))
                  }
                }}
              ></ImportFileModal>
            </>
          )}

          <YakitButton
            style={{ padding: '3px 8px' }}
            icon={<OutlineStorageIcon />}
            type="text"
            onClick={onSaveFilter}
          />
          <YakitPopover
            overlayClassName={styles['http-history-table-drop-down-popover']}
            content={
              <MitmFilterHistoryStore
                editFilterName={editFilterName}
                onSetEditFilterName={setEditFilterName}
                onSelect={(v) => onMenuSelect(v)}
                popoverVisible={popoverVisible}
                setPopoverVisible={setPopoverVisible}
                removeFilterKey={removeFilterKey}
              />
            }
            trigger="click"
            placement="bottom"
            onVisibleChange={setPopoverVisible}
            visible={popoverVisible}
          >
            <YakitButton style={{ padding: '3px 8px' }} icon={<OutlineClockIcon />} type="text" />
          </YakitPopover>

          <YakitButton type="text" onClick={() => onClearFilters()}>
            {t('YakitButton.clear')}
          </YakitButton>
          {filterType === 'filter' && (
            <YakitButton
              type="text"
              onClick={() => {
                onResetFilters()
              }}
            >
              {t('MITMFiltersModal.reset_filter')}
            </YakitButton>
          )}
        </div>
      }
      className={styles['mitm-filters-modal']}
      onOk={() => {
        onSetFilter()
      }}
      okText={editFilterName ? t('MITMFiltersModal.save_and_apply') : t('YakitButton.confirm')}
      bodyStyle={{ padding: 0 }}
    >
      <div className={styles.infoBox}>
        <div>{t('MITMFiltersModal.tip')}</div>
        {filterType === 'hijackFilter' ? (
          <>
            <div>1、{t('MITMFiltersModal.hijack_tip_1')}</div>
            <div>2、{t('MITMFiltersModal.hijack_tip_2')}</div>
          </>
        ) : (
          <div>{t('MITMFiltersModal.hijack_tip_2')}</div>
        )}
      </div>
      <MITMFilters
        filterType={filterType}
        visible={type === 'base-setting'}
        filter={_mitmFilter}
        onFinished={() => onSetFilter()}
        ref={filtersRef}
      />
      <React.Suspense>
        <MITMAdvancedFilters
          filterData={filterData}
          setFilterData={setFilterData}
          visible={type === 'advanced-setting'}
        />
      </React.Suspense>
    </YakitModal>
  )
})

export default MITMFiltersModal

interface MitmFilterHistoryStoreProps {
  removeFilterKey: string
  popoverVisible: boolean
  editFilterName: string
  setPopoverVisible: (v: boolean) => void
  onSelect: (v: MITMFilterUIProps) => void
  onSetEditFilterName: (v: string) => void
}
const MitmFilterHistoryStore: React.FC<MitmFilterHistoryStoreProps> = React.memo((props) => {
  const { removeFilterKey, popoverVisible, setPopoverVisible, onSelect, editFilterName, onSetEditFilterName } = props
  const { t } = useI18nNamespaces(['mitm', 'yakitUi'])
  const [mitmSaveData, setMitmSaveData] = useState<SaveObjProps[]>([])
  useEffect(() => {
    onMitmSaveFilter()
  }, [popoverVisible])
  const onMitmSaveFilter = useMemoizedFn(() => {
    getRemoteValue(removeFilterKey).then((data) => {
      if (!data) {
        setMitmSaveData([])
        return
      }
      try {
        const filterData: SaveObjProps[] = JSONParseLog(data, {
          page: 'MITMFiltersModal',
          fun: 'onMitmSaveFilter',
        })
        setMitmSaveData(filterData)
      } catch (error) {}
    })
  })

  const removeItem = useMemoizedFn((filterName: string) => {
    setMitmSaveData((mitmSaveData) => mitmSaveData.filter((item) => item.filterName !== filterName))
  })

  useUpdateEffect(() => {
    setRemoteValue(removeFilterKey, JSON.stringify(mitmSaveData))
  }, [mitmSaveData])

  const onSelectItem = useMemoizedFn((item) => {
    onSelect({
      baseFilter: item.filter,
      advancedFilters: item.advancedFilters || [],
    })
    setPopoverVisible(false)
  })

  return (
    <div className={styles['mitm-filter-history-store']}>
      <div className={styles['header']}>
        <div className={styles['title']}>{t('MITMFiltersModal.history_storage')}</div>
        {mitmSaveData.length !== 0 && (
          <YakitButton
            type="text"
            colors="danger"
            onClick={() => {
              setMitmSaveData([])
            }}
          >
            {t('YakitButton.clear')}
          </YakitButton>
        )}
      </div>

      {mitmSaveData.length > 0 ? (
        <div className={styles['list']}>
          {mitmSaveData.map((item, index) => (
            <div
              key={item.filterName}
              className={classNames(styles['list-item'], {
                [styles['list-item-border']]: index !== mitmSaveData.length - 1,
                [styles['list-item-border-top']]: index === 0,
              })}
              onClick={() => {
                onSetEditFilterName('')
                onSelectItem(item)
              }}
            >
              <div className={styles['name']}>{item.filterName}</div>
              <div
                className={classNames(styles['opt'], styles['opt-edit'])}
                onClick={(e) => {
                  e.stopPropagation()
                  onSetEditFilterName(item.filterName)
                  onSelectItem(item)
                }}
              >
                <OutlinePencilaltIcon />
              </div>
              <div
                className={classNames(styles['opt'], styles['opt-del'])}
                onClick={(e) => {
                  e.stopPropagation()
                  if (editFilterName === item.filterName) {
                    yakitNotify('info', t('MITMFiltersModal.editing_cannot_delete', { name: editFilterName }))
                  } else {
                    removeItem(item.filterName)
                  }
                }}
              >
                <OutlineTrashIcon />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={classNames(styles['no-data'])}>{t('YakitEmpty.noData')}</div>
      )}
    </div>
  )
})

interface ImportFileModalProps {
  title: string
  visible: boolean
  okText?: string
  fileType?: string
  onCancel: () => void
  onOk: (value: string) => void
}
const ImportFileModal: React.FC<ImportFileModalProps> = (props) => {
  const { t } = useI18nNamespaces(['mitm', 'yakitUi'])
  const { title, visible, okText = t('YakitButton.import'), fileType, onCancel, onOk } = props
  const [value, setValue] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setValue('')
    }
  }, [visible])

  const onClickUpload = () => {
    if (fileInputRef.current) {
      // 点击自定义按钮时触发文件选择框
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    handleReadAsText(files)
    event.target.value = ''
  }

  const handleReadAsText = (files: FileList | null) => {
    if (!files) return
    if (files.length > 0) {
      setValue('')
      const file = files[0]
      if (fileType && file.type !== fileType) {
        yakitNotify('warning', t('MITMFiltersModal.invalid_import_file'))
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result
        if (typeof content === 'string') {
          setValue(content)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault() // 防止默认行为以允许放置
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files // 获取拖放的文件
    handleReadAsText(files)
  }

  return (
    <YakitModal
      title={title}
      width={850}
      subTitle={
        <div className={styles['import-text']}>
          {t('YakitDraggerContent.drag_file_tip')}
          <input type="file" className={styles['fileInput']} ref={fileInputRef} onChange={handleFileChange} />
          <YakitButton type="text" onClick={onClickUpload} style={{ fontSize: 14 }}>
            {t('YakitDraggerContent.click_here')}
          </YakitButton>
          {t('MITMFiltersModal.drag_hint_suffix')}
        </div>
      }
      destroyOnClose={true}
      visible={visible}
      okText={okText}
      onCancel={onCancel}
      onOk={() => onOk(value)}
    >
      <div className={styles['import-editor']} onDragOver={handleDragOver} onDrop={handleDrop}>
        <YakitEditor value={value} setValue={setValue} type="json"></YakitEditor>
      </div>
    </YakitModal>
  )
}
