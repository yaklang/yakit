import { useState } from 'react'
import type { FC } from 'react'
import { useCreation, useDebounce } from 'ahooks'
import { SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getPublicRouteMenu } from '@/routes/newRoute'
import type { PublicRouteMenuProps } from '@/routes/newRoute'
import { YakitModeEnum } from '@/store/softMode'
import { openMenuRoute } from '../../publicMenu/openMenuRoute'
import { buildFirstTabRouteOptions, flattenFirstTabRouteMenus } from './utils'
import type { FirstTabRouteMenuProps } from './type'
import styles from './FirstTabRouteMenu.module.scss'

const FirstTabRouteMenu: FC<FirstTabRouteMenuProps> = ({ softMode, onSelect }) => {
  const { t } = useI18nNamespaces(['yakitUi', 'yakitRoute', 'layout'])
  const [searchValue, setSearchValue] = useState('')
  const searchKeyword = useDebounce(searchValue, { wait: 300, leading: true })
  const routeMode = softMode === YakitModeEnum.SecurityExpert ? YakitModeEnum.Classic : softMode
  const routeMenus = useCreation(() => flattenFirstTabRouteMenus(getPublicRouteMenu(routeMode)), [routeMode])
  const routeMenuOptions = buildFirstTabRouteOptions(routeMenus, (key) => t(key), searchKeyword)

  const onOpenRoute = (option: PublicRouteMenuProps) => {
    if (!option.page) return
    onSelect?.()
    openMenuRoute({ route: option.page })
  }

  return (
    <div className={styles['tab-route-menu']}>
      <div className={styles['tab-route-search']}>
        <YakitInput
          size="small"
          allowClear
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          prefix={<SearchOutlined size={14} className={styles['tab-route-search-icon']} />}
          placeholder={t('YakitInput.searchKeyWordPlaceholder')}
          aria-label={t('YakitInput.search')}
        />
      </div>
      <div className={styles['tab-route-list']} role="list">
        {routeMenuOptions.length > 0 ? (
          routeMenuOptions.map((option) => (
            <div
              key={option.page}
              className={styles['tab-route-option']}
              role="listitem"
              onClick={() => onOpenRoute(option)}
            >
              {option.displayLabel}
            </div>
          ))
        ) : (
          <div className={styles['tab-route-empty']}>{t('YakitEmpty.noData')}</div>
        )}
      </div>
    </div>
  )
}

export default FirstTabRouteMenu
