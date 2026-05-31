import React from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { getArkiumNavItems } from '@/config/brand/arkiumNav'
import { getBrandProductName } from '@/config/brand/brandConfig'
import { YakitRoute } from '@/enums/yakitRoute'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './ArkiumWelcome.module.scss'

/**
 * Arkium 轻量欢迎页（仅 Arkium 发行版使用）。
 *
 * - 复用 YakitRoute.NewHome 路由位，不新增 route key、不新增业务页面。
 * - 五个入口卡片复用现有路由，通过 emiter('menuOpenPage') 跳转。
 * - 文案走 product i18n 命名空间，Yaklang Engine 作为底层引擎名保留。
 */
export const ArkiumWelcome: React.FC = React.memo(() => {
  const { t } = useI18nNamespaces(['product'])
  const productName = getBrandProductName()
  const navItems = getArkiumNavItems()

  const openRoute = useMemoizedFn((route: YakitRoute) => {
    emiter.emit('menuOpenPage', JSON.stringify({ route }))
  })

  return (
    <div className={styles['arkium-welcome']}>
      <div className={styles['arkium-welcome-inner']}>
        <div className={styles['hero']}>
          <h1 className={styles['title']}>{t('Welcome.title', { productName })}</h1>
          <p className={styles['subtitle']}>{t('Welcome.subtitle')}</p>
        </div>

        <div className={styles['cards']}>
          {navItems.map((item) => (
            <div
              key={item.key}
              className={styles['card']}
              onClick={() => openRoute(item.route)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openRoute(item.route)
              }}
            >
              <div className={styles['card-title']}>{t(`Welcome.cards.${item.key}.title`)}</div>
              <div className={styles['card-desc']}>{t(`Welcome.cards.${item.key}.desc`)}</div>
            </div>
          ))}
        </div>

        <div className={styles['footer']}>{t('Welcome.footer')}</div>
      </div>
    </div>
  )
})
