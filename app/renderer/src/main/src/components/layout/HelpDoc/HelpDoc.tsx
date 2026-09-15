import React, { useState } from 'react'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSystem } from '@/yakitGVDefine'
import { YakitMenu } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { useMemoizedFn } from 'ahooks'
import { OutlineQuestionmarkcircleIcon } from '@/assets/icon/outline'
import { yakitShell } from '@/services/electronBridge'

import classNames from 'classnames'
import styles from './HelpDoc.module.scss'

interface HelpDocProps {
  system: YakitSystem
}

/** @name 帮助菜单 */
export const HelpDoc: React.FC<HelpDocProps> = React.memo((props) => {
  const { system } = props

  const [show, setShow] = useState<boolean>(false)
  const menu = (
    <YakitMenu
      data={[
        {
          key: 'official_website',
          label: '官方网站',
        },
      ]}
      onClick={({ key }) => menuSelect(key)}
    ></YakitMenu>
  )
  const menuSelect = useMemoizedFn((type: string) => {
    if (show) setShow(false)
    switch (type) {
      case 'official_website':
        yakitShell.openExternal('https://www.asiainfo-sec.com/intelligent-operations.html')
        return
      default:
        return
    }
  })

  return (
    <YakitPopover
      overlayClassName={classNames(styles['ui-op-dropdown'], styles['ui-op-setting-dropdown'])}
      trigger={'click'}
      placement={system === 'Darwin' ? 'bottomRight' : 'bottom'}
      content={menu}
      visible={show}
      onVisibleChange={(visible) => setShow(visible)}
    >
      <div className={styles['ui-op-btn-wrapper']}>
        <div
          className={classNames(styles['op-btn-body'], {
            [styles['op-btn-body-hover']]: show,
          })}
        >
          <OutlineQuestionmarkcircleIcon className={styles['icon-style']} />
        </div>
      </div>
    </YakitPopover>
  )
})
