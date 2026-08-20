import React, { useEffect, useRef, useState } from 'react'
import { useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import { OutlineArrownarrowdownIcon, OutlineArrownarrowupIcon, OutlineSearchIcon } from '@/assets/icon/outline'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import type { SearchInputTableWrapperProps } from '../HTTPFlowTable.constants'
import style from '../HTTPFlowTable.module.scss'

export const SearchInputTableWrapper: React.FC<SearchInputTableWrapperProps> = React.memo((props) => {
  const ref = useRef<HTMLDivElement>(null)
  const { showSort = false, sortOrder, onSort, searchValue, setSearchValue, onSure, placeholder } = props
  const { t } = useI18nNamespaces(['history', 'yakitUi'])
  const [show, setShow] = useState<boolean>(false)
  const [inputValue, setInputValue] = useState<string>(searchValue || '')
  const [_, setValueChanged, getValueChanged] = useGetSetState<boolean>(false)

  const [inViewport] = useInViewport(ref)

  const triggerSure = useMemoizedFn(() => {
    if (!getValueChanged()) return
    setValueChanged(false)
    onSure?.()
  })

  useUpdateEffect(() => {
    if (!inViewport) {
      triggerSure()
      setShow(false)
    }
  }, [inViewport])

  useEffect(() => {
    if (show) {
      setInputValue(searchValue || '')
    }
  }, [show])

  const onInputChange = useMemoizedFn((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9,]/g, '')
    setInputValue(val)
    setSearchValue?.(val)
    setValueChanged(true)
  })

  const onInputBlur = useMemoizedFn(() => {
    // allowClear 先触发 blur 再改值，延迟到当前事件循环后再搜索
    setTimeout(() => {
      triggerSure()
    }, 0)
  })

  return (
    <div
      className={style['rangeInputNumberTableWrapper']}
      style={{ padding: show ? undefined : '0 8px 8px' }}
      ref={ref}
    >
      {show ? (
        <div className={style['id-search-input']}>
          <YakitInput
            size="small"
            allowClear
            autoFocus
            value={inputValue}
            placeholder={placeholder || t('SearchInputTableWrapper.placeholder')}
            onChange={onInputChange}
            onBlur={onInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                triggerSure()
              }
            }}
          />
        </div>
      ) : (
        <>
          {showSort && (
            <>
              <div
                className={classNames(style['body-length-filter'], {
                  [style['body-length-filter-active']]: sortOrder === 'asc',
                })}
                onClick={() => {
                  onSort?.('asc')
                }}
              >
                <OutlineArrownarrowupIcon className={style['outlineFilterIcon']} /> {t('YakitTable.asc')}
              </div>
              <div
                className={classNames(style['body-length-filter'], {
                  [style['body-length-filter-active']]: sortOrder === 'desc',
                })}
                onClick={() => {
                  onSort?.('desc')
                }}
              >
                <OutlineArrownarrowdownIcon className={style['outlineFilterIcon']} /> {t('YakitTable.desc')}
              </div>
            </>
          )}
          <div
            className={classNames(style['body-length-filter'], {
              [style['body-length-filter-active']]: !!searchValue,
            })}
            onClick={() => {
              setShow(true)
            }}
          >
            <OutlineSearchIcon className={style['outlineFilterIcon']} /> {t('SearchInputTableWrapper.search')}
          </div>
        </>
      )}
    </div>
  )
})

SearchInputTableWrapper.displayName = 'SearchInputTableWrapper'

export default SearchInputTableWrapper
