import { useState } from 'react'
import type { FC } from 'react'
import { useCreation, useDebounce } from 'ahooks'
import { SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getPublicRouteMenu } from '@/routes/newRoute'
import type { PublicRouteMenuProps } from '@/routes/newRoute'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitModeEnum } from '@/store/softMode'
import { grpcFetchLocalPluginDetail } from '@/pages/pluginHub/utils/grpc'
import { yakitNotify } from '@/utils/notification'
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

  const onOpenRoute = async (option: PublicRouteMenuProps) => {
    if (!option.page) return
    let pluginInfo: { pluginId?: number; pluginName?: string } = {}
    if (option.page === YakitRoute.Plugin_OP) {
      try {
        const pluginName = option.yakScripName || option.label
        const plugin = await grpcFetchLocalPluginDetail({ Name: pluginName }, true)
        if (!plugin.Id) {
          yakitNotify('error', t('Layout.HeardMenu.pluginLoadFailed'))
          return
        }
        pluginInfo = { pluginId: +plugin.Id, pluginName: plugin.ScriptName || pluginName }
      } catch {
        yakitNotify('error', t('Layout.HeardMenu.pluginLoadFailed'))
        return
      }
    }
    openMenuRoute({ route: option.page, ...pluginInfo })
    onSelect?.()
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
              key={`${option.page}-${option.yakScripName || ''}`}
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
