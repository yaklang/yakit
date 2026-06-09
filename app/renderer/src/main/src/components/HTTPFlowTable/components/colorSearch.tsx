import React, { useMemo } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { CheckIcon } from '@/assets/newIcon'
import { OutlineBanIcon } from '@/assets/icon/outline'
import { FooterBottom } from '@/components/TableVirtualResize/TableVirtualResize'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { availableColors } from '../HTTPFlowTable.availableColors'
import type { ColorSearchProps } from '../HTTPFlowTable.constants'
import style from '../HTTPFlowTable.module.scss'

export const ColorSearch = React.memo((props: ColorSearchProps) => {
  const { color, setColor, onReset, onSure, setIsShowColor } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi'])
  const onMouseLeave = useMemoizedFn(() => {
    setIsShowColor(false)
    onSure()
  })
  const onSelect = useMemoizedFn((ele) => {
    const index = color.findIndex((c) => c === ele.searchWord)
    if (index === -1) {
      const newColor: string[] = [...color, ele.searchWord]
      setColor(newColor)
    } else {
      setColor(color.filter((c) => c !== ele.searchWord))
    }
  })

  const NoColor = useMemo(
    () => ({
      color: 'NOCOLOR',
      searchWord: 'YAKIT_COLOR_NONE',
      render: (t) => (
        <div className={classNames(style['history-color-tag'])}>
          <OutlineBanIcon className={classNames(style['tag-color-display'])} />
          {t('YakitTable.noColor')}
        </div>
      ),
    }),
    [],
  )

  return (
    <div onMouseLeave={onMouseLeave}>
      <div className={style['http-history-table-color-item-list']}>
        {[...availableColors, NoColor].map((ele) => {
          const checked = color.findIndex((c) => c === ele.searchWord) !== -1
          return (
            <div
              className={classNames(style['http-history-table-color-item'], {
                [style['http-history-table-color-item-active']]: checked,
              })}
              onClick={() => onSelect(ele)}
              key={ele.color}
            >
              <div className={style['http-history-table-color-item-render']}>{ele.render(t)}</div>
              {checked && <CheckIcon className={style['check-icon']} />}
            </div>
          )
        })}
      </div>
      <FooterBottom className={style['color-select-footer']} onReset={onReset} onSure={onSure} />
    </div>
  )
})

ColorSearch.displayName = 'ColorSearch'

export default ColorSearch
