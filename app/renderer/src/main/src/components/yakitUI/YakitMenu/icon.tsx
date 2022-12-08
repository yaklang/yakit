import Icon from "@ant-design/icons"
import type {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"

// Yakit-icon
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
export const YakitMenuRightSvgIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={YakitMenuRightSvg} {...props} />
}
