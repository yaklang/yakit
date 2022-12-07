import Icon from "@ant-design/icons"
import type {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"

const YakitMenuRightSvg = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M6 3.33332L10.6667 7.99999L6 12.6667'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** Yakit-menu-right */
export const YakitMenuRightSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitMenuRightSvg} {...props} />
}

const YakitCloseSvg = () => (
    <svg width='1em' height='1em' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M4 12L12 4M4 4L12 12'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)
/** @name 关闭图标 */
export const YakitCloseSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitCloseSvg} {...props} />
}
