import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"

export interface AIReviewRuleSelectProps extends ReviewRuleSelectProps {}

export interface ReviewRuleSelectProps {}

export interface AIChatSelectProps extends Omit<YakitSelectProps, "dropdownRender"> {
    dropdownRender: (menu: React.ReactElement, setOpen: (open: boolean) => void) => React.ReactElement
    getList?: () => void
    children?: React.ReactNode
    setOpen?: (open: boolean) => void
}
