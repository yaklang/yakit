import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Form, Spin } from 'antd'
import { useControllableValue, useMemoizedFn } from 'ahooks'
import { yakitNotify } from '../../../utils/notification'
import styles from './MITMServerStartForm.module.scss'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import classNames from 'classnames'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import {
  LabelNodeItem,
  MatcherAndExtractionValueList,
} from '@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCard'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { OutlineTrashIcon } from '@/assets/icon/outline'
import { YakitSelectProps } from '@/components/yakitUI/YakitSelect/YakitSelectType'
import { defaultMITMBaseFilter, defaultMITMAdvancedFilter } from '@/defaultConstants/mitm'
import cloneDeep from 'lodash/cloneDeep'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { FilterType } from './MITMFiltersModal'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { PencilAltIcon } from '@/assets/newIcon'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitCombinationSearch } from '@/components/YakitCombinationSearch/YakitCombinationSearch'

const { YakitPanel } = YakitCollapse
const { ipcRenderer } = window.require('electron')

export interface MITMFiltersProp {
  filterType: FilterType
  filter?: MITMFilterSchema
  onFinished?: (filter: MITMFilterSchema) => any
  onClosed?: () => any
  ref?: any
  visible?: boolean
}

export interface MITMFilterSchema {
  includeHostname?: string[]
  excludeHostname?: string[]
  includeSuffix?: string[]
  excludeSuffix?: string[]
  filterBundledStaticJS?: boolean
  excludeMethod?: string[]
  excludeContentTypes?: string[]
  excludeUri?: string[]
  includeUri?: string[]
  FilterData?: MITMFilterData
}

export const MITMFilters: React.FC<MITMFiltersProp> = React.forwardRef((props, ref) => {
  const [params, setParams] = useState<MITMFilterSchema>(props.filter || cloneDeep(defaultMITMBaseFilter))
  const [loading, setLoading] = useState(false)
  useImperativeHandle(
    ref,
    () => ({
      getFormValue: () => params,
      clearFormValue: () => setParams(cloneDeep(defaultMITMBaseFilter)),
      setFormValue: (v) => setParams(v),
    }),
    [params],
  )
  useEffect(() => {
    setParams(props.filter || cloneDeep(defaultMITMBaseFilter))
  }, [props.filter])

  const { t, i18n } = useI18nNamespaces(['mitm'])

  return (
    <Spin spinning={loading}>
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        className={classNames(styles['mitm-filters-form'], {
          [styles['mitm-filters-form-hidden']]: props.visible === false,
        })}
      >
        <Form.Item label={t('MITMFilters.includeHostname')}>
          <YakitSelect
            mode="tags"
            value={params?.includeHostname}
            onChange={(value, _) => {
              setParams({ ...params, includeHostname: value })
            }}
          ></YakitSelect>
        </Form.Item>
        <Form.Item label={t('MITMFilters.excludeHostname')}>
          <YakitSelect
            mode="tags"
            value={params?.excludeHostname || undefined}
            onChange={(value, _) => {
              setParams({ ...params, excludeHostname: value })
            }}
          ></YakitSelect>
        </Form.Item>
        <Form.Item label={t('MITMFilters.includeUri')} help={t('MITMFilters.includeUriHelp')}>
          <YakitSelect
            mode="tags"
            value={params?.includeUri || undefined}
            onChange={(value, _) => {
              setParams({ ...params, includeUri: value })
            }}
          ></YakitSelect>
        </Form.Item>
        <Form.Item label={t('MITMFilters.excludeUri')} help={t('MITMFilters.excludeUriHelp')}>
          <YakitSelect
            mode="tags"
            value={params?.excludeUri || undefined}
            onChange={(value, _) => {
              setParams({ ...params, excludeUri: value })
            }}
          ></YakitSelect>
        </Form.Item>
        <Form.Item label={t('MITMFilters.includeSuffix')}>
          <YakitSelect
            mode="tags"
            value={params?.includeSuffix || undefined}
            onChange={(value, _) => {
              setParams({ ...params, includeSuffix: value })
            }}
          ></YakitSelect>
        </Form.Item>
        <Form.Item label={t('MITMFilters.excludeSuffix')}>
          <YakitSelect
            mode="tags"
            value={params?.excludeSuffix || undefined}
            onChange={(value, _) => {
              setParams({ ...params, excludeSuffix: value })
            }}
          ></YakitSelect>
        </Form.Item>
        <Form.Item label={t('MITMFilters.excludeContentTypes')}>
          <YakitSelect
            mode="tags"
            value={params?.excludeContentTypes || undefined}
            onChange={(value, _) => {
              setParams({ ...params, excludeContentTypes: value })
            }}
          ></YakitSelect>
        </Form.Item>
        {props.filterType === 'filter' && (
          <Form.Item label={t('MITMFilters.filterJS')} help={t('MITMFilters.filterJSHelp')}>
            <YakitSwitch
              checked={!!params?.filterBundledStaticJS}
              onChange={(checked) => {
                setParams({ ...params, filterBundledStaticJS: checked })
              }}
            ></YakitSwitch>
          </Form.Item>
        )}
        <Form.Item label={t('MITMFilters.excludeMethod')}>
          <YakitSelect
            mode="tags"
            value={params?.excludeMethod || undefined}
            onChange={(value, _) => {
              setParams({ ...params, excludeMethod: value })
            }}
          ></YakitSelect>
        </Form.Item>
      </Form>
    </Spin>
  )
})

interface MITMAdvancedFiltersProps {
  visible?: boolean
  filterData: MITMAdvancedFilter[]
  setFilterData?: (v: MITMAdvancedFilter[]) => void
  activeKey?: string
  setActiveKey?: (v: string) => void
}

export type FilterMatcherType = 'word' | 'regexp' | 'glob' | 'mime' | 'suffix'
export interface FilterDataItem {
  MatcherType: FilterMatcherType
  Group: string[]
  RuleName?: string
}
export interface MITMFilterData {
  IncludeHostnames: FilterDataItem[]
  ExcludeHostnames: FilterDataItem[]

  IncludeSuffix: FilterDataItem[]
  ExcludeSuffix: FilterDataItem[]

  IncludeUri: FilterDataItem[]
  ExcludeUri: FilterDataItem[]

  ExcludeMethods: FilterDataItem[]

  ExcludeMIME: FilterDataItem[]

  FilterBundledStaticJS?: boolean
}

export interface MITMAdvancedFilter extends FilterDataItem {
  Field?: MITMFilterArrayKey
  RuleName?: string
}

export type MITMFilterArrayKey = {
  [K in keyof MITMFilterData]-?: MITMFilterData[K] extends FilterDataItem[] ? K : never
}[keyof MITMFilterData]

export const onFilterEmptyMITMAdvancedFilters = (list: FilterDataItem[]) => {
  return list.filter((i) => i.MatcherType && !isFilterItemEmpty(i))
}

type MITMAdvancedFilterSearchType = 'ruleName' | 'ruleContent'

const MITMAdvancedFilters: React.FC<MITMAdvancedFiltersProps> = React.memo((props, ref) => {
  const { t, i18n } = useI18nNamespaces(['mitm', 'webFuzzer'])
  const { visible = true } = props

  const [activeKey, setActiveKey] = useControllableValue<string | string[]>(props, {
    defaultValue: 'ID:0',
    valuePropName: 'activeKey',
    trigger: 'setActiveKey',
  })

  const [filterData, setFilterData] = useControllableValue<MITMAdvancedFilter[]>(props, {
    defaultValue: [],
    valuePropName: 'filterData',
    trigger: 'setFilterData',
  })
  const [searchValue, setSearchValue] = useState('')
  const [searchType, setSearchType] = useState<MITMAdvancedFilterSearchType>('ruleName')
  const [editNameVisible, setEditNameVisible] = useState(false)
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [draftRuleName, setDraftRuleName] = useState('')

  const onEdit = useMemoizedFn((field: string, value, index: number) => {
    filterData[index][field] = value
    setFilterData([...filterData])
  })

  const resetDraftRuleName = useMemoizedFn(() => {
    setDraftRuleName('')
    setCurrentIndex(-1)
  })

  const onStartEditName = useMemoizedFn((index: number, ruleName?: string) => {
    setDraftRuleName(ruleName || '')
    setCurrentIndex(index)
  })

  const onCloseEditName = useMemoizedFn(() => {
    if (currentIndex !== -1) {
      const nextRuleName = draftRuleName.trim()
      if (nextRuleName) {
        onEdit('RuleName', nextRuleName, currentIndex)
      }
    }
    resetDraftRuleName()
  })

  const onAddAdvancedSetting = useMemoizedFn(() => {
    const isEmptyIndex = filterData.findIndex((i) => isFilterItemEmpty(i))
    if (isEmptyIndex !== -1) {
      setActiveKey(`ID:${isEmptyIndex}`)
      yakitNotify('error', t('MITMAdvancedFilters.pleaseCompleteCondition'))
      return
    }
    const newFilterData = [...filterData, cloneDeep(defaultMITMAdvancedFilter)]
    setFilterData(newFilterData)
    const index = newFilterData.length - 1 || 0
    setActiveKey(`ID:${index}`)
  })

  const isMatchedSearch = useMemoizedFn(
    (item: MITMAdvancedFilter, value: string, index, type: MITMAdvancedFilterSearchType = searchType) => {
      const keyword = value.trim().toLowerCase()
      if (!keyword) return true

      if (type === 'ruleName') {
        return (item.RuleName || `规则_${index}`).toLowerCase().includes(keyword)
      } else {
        return item.Group.some((g) => g.toLowerCase().includes(keyword))
      }
    },
  )

  const isSearchName = useMemo(() => searchType === 'ruleName', [searchType])

  useEffect(() => {
    if (!searchValue.trim()) return

    if (isSearchName) {
      setActiveKey([])
      return
    }

    setActiveKey(filterData.map((_, index) => `ID:${index}`))
  }, [isSearchName, searchValue])

  return (
    <div
      className={classNames(styles['filter-content'], {
        [styles['filter-content-hidden']]: visible === false,
      })}
    >
      <div className={styles['filter-operation']}>
        <YakitCombinationSearch
          beforeOptionWidth={i18n.language === 'zh' ? 96 : 120}
          valueBeforeOption={searchType}
          addonBeforeOption={[
            { label: t('ExtractorCollapse.ruleName'), value: 'ruleName' },
            { label: t('ExtractorCollapse.ruleContent'), value: 'ruleContent' },
          ]}
          onSelectBeforeOption={(value) => {
            if (searchType === value) return
            setSearchType(value as MITMAdvancedFilterSearchType)
            setSearchValue('')
          }}
          wrapperClassName={classNames(styles['filter-content-search'])}
          inputSearchModuleTypeProps={{
            onSearch: setSearchValue,
            allowClear: true,
          }}
        />
        <YakitButton type="text" disabled={!!searchValue} onClick={onAddAdvancedSetting}>
          {t('MITMAdvancedFilters.addAdvancedConfig')}
        </YakitButton>
      </div>
      {!!filterData.length ? (
        <YakitCollapse
          activeKey={activeKey}
          onChange={(key) => setActiveKey(key)}
          accordion={!searchValue}
          className={styles['filter-collapse']}
        >
          {filterData!.map((filterItem, index) => {
            const name = filterRangeOption?.find((ele) => ele.value === filterItem.Field)?.label
            if (!!searchValue && !isMatchedSearch(filterItem, searchValue, index)) return null
            const displayName = filterItem.RuleName || `规则_${index}`
            return (
              <YakitPanel
                header={
                  <div className={styles['collapse-panel-header']}>
                    <span className={classNames(styles['header-id'])}>
                      <span>{displayName}</span>
                      <YakitPopover
                        overlayClassName={styles['edit-name-popover']}
                        content={
                          <div className={styles['edit-name-popover-content']} onClick={(e) => e.stopPropagation()}>
                            <div className={styles['edit-name-popover-content-title']}>
                              {t('ExtractorCollapse.edit_name')}
                            </div>
                            <YakitInput
                              value={draftRuleName}
                              onChange={(e) => {
                                setDraftRuleName(e.target.value)
                              }}
                              onPressEnter={() => {
                                setEditNameVisible(false)
                                onCloseEditName()
                              }}
                              maxLength={20}
                            />
                          </div>
                        }
                        placement="top"
                        trigger={['click']}
                        visible={editNameVisible && currentIndex === index}
                        onVisibleChange={(visible) => {
                          setEditNameVisible(visible)
                          if (!visible) {
                            onCloseEditName()
                          }
                        }}
                      >
                        <PencilAltIcon
                          className={classNames({
                            [styles['icon-active']]: editNameVisible && currentIndex === index,
                          })}
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartEditName(index, displayName)
                          }}
                        />
                      </YakitPopover>
                    </span>
                    <span>[{name}]</span>
                    {filterItem.Group.length > 0 ? (
                      <span className={classNames('content-ellipsis', styles['header-number'])}>
                        {filterItem.Group.length}
                      </span>
                    ) : (
                      <YakitTag color="danger" size="small">
                        {t('MITMAdvancedFilters.notSetCondition')}
                      </YakitTag>
                    )}
                  </div>
                }
                extra={
                  <OutlineTrashIcon
                    className={styles['trash-icon']}
                    onClick={(e) => {
                      e.stopPropagation()
                      setFilterData(filterData.filter((_, n) => n !== index))
                      if (index === 0) {
                        setActiveKey(`ID:${index + 1}`)
                      } else {
                        setActiveKey(`ID:${index - 1}`)
                      }
                    }}
                  />
                }
                key={`ID:${index}`}
              >
                <MITMAdvancedFiltersItem
                  item={filterItem}
                  onEdit={(field, value) => onEdit(field, value, index)}
                  searchValue={isSearchName ? '' : searchValue}
                />
              </YakitPanel>
            )
          })}
        </YakitCollapse>
      ) : (
        <YakitEmpty
          description={
            <YakitButton
              type="primary"
              disabled={!!searchValue}
              onClick={onAddAdvancedSetting}
              style={{ marginTop: 12 }}
            >
              {t('MITMAdvancedFilters.addAdvancedConfig')}
            </YakitButton>
          }
        />
      )}
    </div>
  )
})
export default MITMAdvancedFilters
interface MITMAdvancedFiltersItemProps {
  item: MITMAdvancedFilter
  onEdit: (f: string, v: any) => void
  searchValue?: string
}

export const isFilterItemEmpty = (item: FilterDataItem) => {
  return (item.Group || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}
const filterRangeOption: YakitSelectProps['options'] = [
  {
    label: '排除 Hostnames',
    value: 'ExcludeHostnames',
  },
  {
    label: '包含 Hostnames',
    value: 'IncludeHostnames',
  },
  {
    label: '排除 URL路径',
    value: 'ExcludeUri',
  },
  {
    label: '包含 URL路径',
    value: 'IncludeUri',
  },
  {
    label: '排除 HTTP方法',
    value: 'ExcludeMethods',
  },
]
export const MITMAdvancedFiltersItem: React.FC<MITMAdvancedFiltersItemProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['mitm'])
  const { item, onEdit, searchValue } = props
  const onAddGroup = useMemoizedFn(() => {
    if (isFilterItemEmpty(item)) {
      yakitNotify('error', t('MITMAdvancedFilters.pleaseCompleteCondition'))
      return
    } else {
      item.Group.push('')
      onEdit('Group', item.Group)
    }
  })
  return (
    <>
      <div className={classNames(styles['collapse-panel-condition'])}>
        <LabelNodeItem label={t('MITMAdvancedFiltersItem.scope')}>
          <YakitSelect value={item.Field} onSelect={(value) => onEdit('Field', value)} options={filterRangeOption} />
        </LabelNodeItem>
        <LabelNodeItem label={t('MITMAdvancedFiltersItem.matcherType')}>
          <YakitRadioButtons
            value={item.MatcherType}
            onChange={(e) => {
              onEdit('MatcherType', e.target.value)
            }}
            buttonStyle="solid"
            options={[
              { label: t('MITMAdvancedFiltersItem.regexp'), value: 'regexp' },
              { label: 'glob', value: 'glob' },
            ]}
          />
        </LabelNodeItem>
      </div>
      <MatcherAndExtractionValueList
        httpResponse={''}
        showRegex={false}
        group={item.Group}
        notEditable={false}
        onEditGroup={(g) => {
          onEdit('Group', g)
        }}
        onAddGroup={onAddGroup}
        searchValue={searchValue}
        supportCommaSeparated
        includeCommaDelimiter={item.Field === 'ExcludeHostnames' || item.Field === 'IncludeHostnames'}
      />
    </>
  )
})
