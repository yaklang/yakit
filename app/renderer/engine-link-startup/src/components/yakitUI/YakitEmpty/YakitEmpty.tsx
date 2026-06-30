import { Empty } from 'antd'
import React, { useMemo } from 'react'
import { YakitEmptyProps } from './YakitEmptyType'
import classNames from 'classnames'
import styles from './YakitEmpty.module.scss'

import YakitEmptyPng from './YakitEmptyPng.png'
import YakitDarkEmptyPng from './YakitDarkEmptyPng.png'
import IrifyDarkEmptyPng from './IrifyDarkEmptyPng.png'
import IrifyEmptyPng from './IrifyEmptyPng.png'
import MemfitEmptyPng from './MemfitEmptyPng.png'
import MemfitDarkEmptyPng from './MemfitDarkEmptyPng.png'

import { useTheme } from '@/hooks/useTheme'
import { __PLATFORM__ } from '@/utils/envfile'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

/**
 * @description:YakitEmpty
 * @augments YakitEmptyProps 继承antd的 Empty 默认属性
 */
export const YakitEmpty: React.FC<YakitEmptyProps> = (props) => {
  const { theme } = useTheme()
  const { title, titleClassName, ...restProps } = props
  const { t } = useI18nNamespaces(['yakitUi'])

  const emptyImageTarget = useMemo(() => {
    switch (__PLATFORM__) {
      case 'irify':
      case 'irify-enterprise':
        return theme === 'dark' ? IrifyDarkEmptyPng : IrifyEmptyPng
      case 'memfit':
        return theme === 'dark' ? MemfitDarkEmptyPng : MemfitEmptyPng
      case 'enterprise':
      case 'simple-enterprise':

      default:
        return theme === 'dark' ? YakitDarkEmptyPng : YakitEmptyPng
    }
  }, [theme])

  return (
    <Empty
      image={<img style={{ userSelect: 'none' }} draggable={false} src={emptyImageTarget} alt="" />}
      styles={{
        image: props?.styles?.image || {
          height: 200,
          width: 200,
          margin: '24px auto',
        },
      }}
      {...restProps}
      description={
        props.descriptionReactNode ? (
          props.descriptionReactNode
        ) : (
          <div className={styles['yakit-empty']}>
            <div className={classNames(styles['yakit-empty-title'], titleClassName)}>
              {title || t('YakitEmpty.noData')}
            </div>
            <div className={styles['yakit-empty-description']}>{props.description}</div>
          </div>
        )
      }
    >
      {props.children}
    </Empty>
  )
}
