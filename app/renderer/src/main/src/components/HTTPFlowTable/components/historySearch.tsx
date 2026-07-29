import React, { useState } from 'react'
import { Tooltip } from 'antd'
import { useControllableValue, useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { OutlineQuestionmarkcircleIcon, OutlineSearchIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitCombinationSearch } from '@/components/YakitCombinationSearch/YakitCombinationSearch'
import { HistoryPluginSearchType } from '@/utils/yakQueryHTTPFlow'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { getReleaseEditionName } from '@/utils/envfile'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { HistorySearchProps } from '../HTTPFlowTable.constants'
import style from '../HTTPFlowTable.module.scss'

const HistorySearch = React.memo<HistorySearchProps>((props) => {
  const { showPopoverSearch, handleSearch, hint = true } = props
  const { t, i18n } = useI18nNamespaces(['history'])
  const [isHoverSearch, setIsHoverSearch] = useState<boolean>(false)
  const [searchType, setSearchType, getSearchType] = useGetSetState<HistoryPluginSearchType>('all')
  const [searchVal, setSearchVal] = useControllableValue<string>(props, {
    defaultValue: '',
    valuePropName: 'searchVal',
    trigger: 'setSearchVal',
  })
  const onSelectBeforeOption = useMemoizedFn((o: string) => {
    setSearchType(o as HistoryPluginSearchType)
  })
  useUpdateEffect(() => {
    onSearch()
  }, [searchType])
  const onInputUpadte = useMemoizedFn((e: any) => {
    setSearchVal(e.target.value)
  })
  const onSearch = useDebounceFn(
    useMemoizedFn(() => {
      handleSearch(searchVal, getSearchType())
    }),
    { wait: 300 },
  ).run
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
          overlayClassName={style['http-history-search-drop-down-popover']}
          trigger="click"
          placement="bottomRight"
          content={searchNode}
          visible={isHoverSearch}
          onVisibleChange={setIsHoverSearch}
        >
          <YakitButton icon={<OutlineSearchIcon />} type="outline2" isHover={isHoverSearch || !!searchVal} />
        </YakitPopover>
      ) : (
        searchNode()
      )}
      {hint ? (
        <Tooltip title={t('HistorySearch.fuzzSearchExplanation', { edition: getReleaseEditionName() })}>
          <OutlineQuestionmarkcircleIcon className={style['http-history-search-question-icon']} />
        </Tooltip>
      ) : null}
    </div>
  )
})

HistorySearch.displayName = 'HistorySearch'

export default HistorySearch
