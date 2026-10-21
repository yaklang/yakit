import classNames from 'classnames'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton, type YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from './TextDropdownTrigger.module.scss'

export interface TextDropdownTriggerProps extends Omit<YakitButtonProp, 'type' | 'size' | 'children'> {
  /** 触发器展示文案（可已截断） */
  label: string
  /** 原生 title，默认用 label */
  title?: string
  /** 下拉是否展开（展开时箭头旋转；同步 aria-expanded） */
  open?: boolean
}

/** 轻量文字下拉触发器：任务详情切任务 / 文件搜索范围等共用 */
export const TextDropdownTrigger: React.FC<TextDropdownTriggerProps> = (props) => {
  const { label, title, open = false, disabled = false, className, ...rest } = props
  return (
    <YakitButton
      {...rest}
      type="text2"
      size="small"
      disabled={disabled}
      aria-expanded={open}
      className={classNames(
        {
          [styles['text-dropdown-trigger-open']]: open,
          [styles['text-dropdown-trigger-disabled']]: disabled,
        },
        className,
      )}
      title={title ?? label}
    >
      <span className={styles['text-dropdown-trigger-label']}>{label}</span>
      <ChevronDownOutlined className={styles['text-dropdown-trigger-icon']} color="currentColor" size={14} />
    </YakitButton>
  )
}

TextDropdownTrigger.displayName = 'TextDropdownTrigger'
