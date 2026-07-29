import React, { useEffect, useRef, useState } from 'react'
import { useDebounceEffect, useDebounceFn, useMemoizedFn, useVirtualList } from 'ahooks'
import classNames from 'classnames'
import { CheckIcon } from '@/assets/newIcon'
import { FooterBottom } from '@/components/TableVirtualResize/TableVirtualResize'
import { FiltersItemProps, SelectSearchProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import style from '../HTTPFlowTable.module.scss'

export const MultipleSelect: React.FC<SelectSearchProps> = (props) => {
  const {
    originalList,
    onSelect,
    value,
    filterProps,
    onClose,
    onQuery,
    searchVal,
    onChangeSearchVal,
    selectContainerStyle,
  } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi'])
  const { filterSearch, filterSearchInputProps = {} } = filterProps || {}

  const containerRef = useRef(null)
  const wrapperRef = useRef(null)
  const scrollDomRef = useRef<any>(null)
  const selectRef = useRef<any>(null)

  const [data, setData] = useState<FiltersItemProps[]>(originalList)
  useEffect(() => {
    if (!searchVal) {
      setData(originalList)
    }
  }, [originalList, searchVal])
  useEffect(() => {
    // 新版UI组件之前的过度写法
    const scrollDom = selectRef.current?.firstChild?.firstChild?.firstChild
    if (!scrollDom) return
    scrollDomRef.current = scrollDom
  }, [])

  const [list] = useVirtualList(data, {
    containerTarget: containerRef,
    wrapperTarget: wrapperRef,
    itemHeight: 34,
    overscan: 15,
  })

  const onHandleScroll = useDebounceFn(
    useMemoizedFn(() => {
      scrollDomRef.current.scrollLeft = scrollDomRef.current.scrollWidth
    }),
    { wait: 500 },
  ).run

  const getRealOriginalList = useMemoizedFn(() => {
    return originalList
  })
  useDebounceEffect(
    () => {
      if (searchVal) {
        const newData = getRealOriginalList().filter((ele) =>
          ele.label.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase() || ''),
        )
        setData(newData)
      } else {
        setData(getRealOriginalList())
      }
    },
    [searchVal],
    { wait: 300 },
  )

  const onSelectMultiple = useMemoizedFn((selectItem: FiltersItemProps) => {
    if (value) {
      if (!Array.isArray(value)) return
      const index = value.findIndex((ele) => ele === selectItem.value)
      if (index === -1) {
        onSelect([...value, selectItem.value], selectItem)
      } else {
        const copyValue = structuredClone(value)
        copyValue.splice(index, 1)
        onSelect(copyValue, selectItem)
      }
    } else {
      onSelect([selectItem.value], selectItem)
    }
    setTimeout(() => {
      if (filterSearch) onHandleScroll()
    }, 50)
  })

  const onReset = useMemoizedFn(() => {
    onSelect([])
    setTimeout(() => {
      onQuery()
    }, 200)
  })

  const onSure = useMemoizedFn(() => {
    onClose()
  })

  const renderMultiple = useMemoizedFn(() => {
    return (
      <div
        className={classNames(style['select-search-multiple'], {
          [style['select-search-multiple-filterSearch']]: filterSearch,
        })}
      >
        {filterSearch && (
          <div className={style['select-heard']} ref={selectRef}>
            <div className={classNames(style['select-search-input'])}>
              <YakitInput
                className={style['select-header-input']}
                size="middle"
                value={searchVal}
                onChange={(e) => {
                  onChangeSearchVal && onChangeSearchVal(e.target.value)
                }}
                {...filterSearchInputProps}
              />
            </div>
          </div>
        )}
        <div ref={containerRef} className={style['select-container']} style={selectContainerStyle}>
          <div ref={wrapperRef} className={style['select-wrapper']}>
            {(list.length > 0 &&
              list.map((item) => {
                const checked = Array.isArray(value) ? value?.findIndex((ele) => ele === item.data.value) !== -1 : false
                return (
                  <div
                    key={item.data.value}
                    className={classNames(style['select-item'], {
                      [style['select-item-active']]: checked,
                    })}
                    onClick={() => onSelectMultiple(item.data)}
                  >
                    <span className={classNames(style['select-item-text'], 'content-ellipsis')}>{item.data.label}</span>
                    {checked && <CheckIcon className={style['check-icon']} />}
                  </div>
                )
              })) || <div className={classNames(style['no-data'])}>{t('YakitEmpty.noData')}</div>}
          </div>
          <FooterBottom onReset={onReset} onSure={onSure} />
        </div>
      </div>
    )
  })

  return <div className={style['select-search']}>{renderMultiple()}</div>
}

export default MultipleSelect
