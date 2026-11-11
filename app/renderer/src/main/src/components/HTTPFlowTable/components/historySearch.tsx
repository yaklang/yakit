import React, { useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { useControllableValue, useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { QuestionMarkCircleOutlined, SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitCombinationSearch } from '@/components/YakitCombinationSearch/YakitCombinationSearch'
import type { HistorySearchOptionType } from '@/utils/yakQueryHTTPFlow'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { getReleaseEditionName } from '@/utils/envfile'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { HistorySearchProps } from '../HTTPFlowTable.constants'
import { shouldClearHistorySearchInput } from '../HTTPFlowTable.utils'
import style from '../HTTPFlowTable.module.scss'

const HistorySearch = React.memo<HistorySearchProps>((props) => {
  const {
    showPopoverSearch,
    handleSearch,
    hint = true,
    onEnterIdSearch,
    onLeaveIdSearch,
    setSearchType: setSearchTypeProp,
  } = props
  const { t, i18n } = useI18nNamespaces(['history'])
  const [isHoverSearch, setIsHoverSearch] = useState<boolean>(false)
  const [searchType, setSearchTypeState, getSearchType] = useGetSetState<HistorySearchOptionType>(
    props.searchType ?? 'all',
  )
  const setSearchType = useMemoizedFn((next: HistorySearchOptionType) => {
    setSearchTypeState(next)
    setSearchTypeProp?.(next)
  })
  const skipTypeSearchRef = useRef(false)
  const [searchVal, setSearchVal] = useControllableValue<string>(props, {
    defaultValue: '',
    valuePropName: 'searchVal',
    trigger: 'setSearchVal',
  })
  const { run: onSearch, cancel: cancelSearch } = useDebounceFn(
    useMemoizedFn(() => {
      handleSearch(searchVal, getSearchType())
    }),
    { wait: 300 },
  )
  const onSelectBeforeOption = useMemoizedFn((o: string) => {
    const next = o as HistorySearchOptionType
    const prev = getSearchType()
    if (shouldClearHistorySearchInput(prev, next)) {
      cancelSearch()
      setSearchVal('')
      if (prev === 'id') onLeaveIdSearch?.()
      else {
        skipTypeSearchRef.current = true
        onEnterIdSearch?.()
      }
    }
    setSearchType(next)
  })
  useUpdateEffect(() => {
    if (skipTypeSearchRef.current) {
      skipTypeSearchRef.current = false
      return
    }
    onSearch()
  }, [searchType])
  const onInputUpadte = useMemoizedFn((e: any) => {
    setSearchVal(e.target.value)
  })
  const handleSearchBlur = useMemoizedFn(() => {
    if (searchVal === '') {
      onSearch()
    }
  })
  const searchNode = useMemoizedFn(() => {
    return (
      <YakitCombinationSearch
        wrapperClassName={style['http-history-table-right-search']}
        afterModuleType="input"
        valueBeforeOption={searchType}
        onSelectBeforeOption={onSelectBeforeOption}
        selectProps={{ size: 'small' }}
        beforeOptionWidth={100}
        addonBeforeOption={props.addonBeforeOption ?? []}
        inputSearchModuleTypeProps={{
          size: 'middle',
          value: searchVal,
          onChange: onInputUpadte,
          onSearch: onSearch,
          onBlur: handleSearchBlur,
          // wrapperClassName: style["inputSearchModule"]
        }}
      ></YakitCombinationSearch>
    )
  })
  return (
    <div className={style['http-history-search-wrapper']}>
      {showPopoverSearch ? (
        <YakitPopover
          classNames={{ root: style['http-history-search-drop-down-popover'] }}
          trigger="click"
          placement="bottomRight"
          content={searchNode}
          open={isHoverSearch}
          onOpenChange={setIsHoverSearch}
        >
          <YakitButton
            icon={<SearchOutlined color="currentColor" />}
            type="outline2"
            isHover={isHoverSearch || !!searchVal}
          />
        </YakitPopover>
      ) : (
        searchNode()
      )}
      {hint ? (
        <Tooltip title={t('HistorySearch.fuzzSearchExplanation', { edition: getReleaseEditionName() })}>
          <QuestionMarkCircleOutlined className={style['http-history-search-question-icon']} color="currentColor" />
        </Tooltip>
      ) : null}
    </div>
  )
})

HistorySearch.displayName = 'HistorySearch'

export default HistorySearch
