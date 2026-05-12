import { YakitSelectProps } from '@/components/yakitUI/YakitSelect/YakitSelectType'

export interface AIReviewRuleSelectProps extends ReviewRuleSelectProps {}

export interface ReviewRuleSelectProps {
  className?: string
}

export interface AIChatSelectProps extends Omit<YakitSelectProps, 'dropdownRender'> {
  dropdownRender: (menu: React.ReactElement, setOpen: (open: boolean) => void) => React.ReactElement
  getList?: () => void
  children?: React.ReactNode
  setOpen?: (open: boolean) => void

  /** 点击这个元素不关闭弹窗 */
  closestClassName?: string
}
