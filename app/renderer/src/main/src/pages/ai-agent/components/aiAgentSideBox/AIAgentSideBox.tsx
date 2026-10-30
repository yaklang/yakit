import type { ReactNode, Ref } from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { InformationCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { SideSettingButton } from '../../aiChatWelcome/AIChatWelcomeSideSetting'
import styles from './AIAgentSideBox.module.scss'

interface AIAgentSideBoxProps {
  title?: ReactNode
  titleHint?: ReactNode
  titleExtra?: ReactNode
  extra?: ReactNode
  children?: ReactNode
  className?: string
  showPinButton?: boolean
  ref?: Ref<HTMLDivElement>
}

const AIAgentSideBox = ({
  title,
  titleHint,
  titleExtra,
  extra,
  children,
  className,
  showPinButton = true,
  ref,
}: AIAgentSideBoxProps) => {
  return (
    <div ref={ref} className={classNames(styles['ai-agent-side-box'], className)}>
      <div className={styles['ai-agent-side-box-header']}>
        <div className={styles['ai-agent-side-box-header-left']}>
          {title}
          {titleHint && (
            <Tooltip title={titleHint}>
              <InformationCircleOutlined
                className={styles['ai-agent-side-box-header-icon']}
                color="currentColor"
                size={16}
              />
            </Tooltip>
          )}
          {titleExtra}
        </div>
        <div className={styles['ai-agent-side-box-header-right']}>
          {extra}
          {showPinButton && <SideSettingButton type="text2" />}
        </div>
      </div>
      {children && <div className={styles['ai-agent-side-box-content']}>{children}</div>}
    </div>
  )
}

export default AIAgentSideBox
