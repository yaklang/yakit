import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"

const ReduceCount = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.59998 10.4C9.15815 10.4 8.79998 10.7582 8.79998 11.2C8.79998 11.6418 9.15815 12 9.59998 12H13.6C14.0418 12 14.4 11.6418 14.4 11.2V7.2C14.4 6.75817 14.0418 6.4 13.6 6.4C13.1581 6.4 12.8 6.75817 12.8 7.2V9.26863L9.36566 5.83431C9.05324 5.5219 8.54671 5.5219 8.23429 5.83431L6.39998 7.66863L2.96566 4.23431C2.65324 3.9219 2.14671 3.9219 1.83429 4.23431C1.52187 4.54673 1.52187 5.05327 1.83429 5.36569L5.83429 9.36569C6.14671 9.6781 6.65324 9.6781 6.96566 9.36569L8.79998 7.53137L11.6686 10.4H9.59998Z'
            fill='#56C991'
        />
    </svg>
)

/**
 * @description:  ReduceCountIcon
 */
export const ReduceCountIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={ReduceCount} {...props} />
}

const AddCount = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.59998 5.6C9.15815 5.6 8.79998 5.24183 8.79998 4.8C8.79998 4.35817 9.15815 4 9.59998 4H13.6C14.0418 4 14.4 4.35817 14.4 4.8V8.8C14.4 9.24183 14.0418 9.6 13.6 9.6C13.1581 9.6 12.8 9.24183 12.8 8.8V6.73137L9.36566 10.1657C9.05324 10.4781 8.54671 10.4781 8.23429 10.1657L6.39998 8.33137L2.96566 11.7657C2.65324 12.0781 2.14671 12.0781 1.83429 11.7657C1.52187 11.4533 1.52187 10.9467 1.83429 10.6343L5.83429 6.63431C6.14671 6.3219 6.65324 6.3219 6.96566 6.63431L8.79998 8.46863L11.6686 5.6H9.59998Z'
            fill='#F4736B'
        />
    </svg>
)

/**
 * @description:  AddCountIcon
 */
export const AddCountIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={AddCount} {...props} />
}

const KeepCount = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M9.83429 4.23431C10.1467 3.9219 10.6532 3.9219 10.9657 4.23431L14.1657 7.43431C14.4781 7.74673 14.4781 8.25327 14.1657 8.56569L10.9657 11.7657C10.6532 12.0781 10.1467 12.0781 9.83429 11.7657C9.52187 11.4533 9.52187 10.9467 9.83429 10.6343L11.6686 8.8H2.39998C1.95815 8.8 1.59998 8.44183 1.59998 8C1.59998 7.55817 1.95815 7.2 2.39998 7.2H11.6686L9.83429 5.36569C9.52187 5.05327 9.52187 4.54673 9.83429 4.23431Z'
            fill='#CCD2DE'
        />
    </svg>
)

/**
 * @description:  AddCountIcon
 */
export const KeepCountIcon = (props: Partial<CustomIconComponentProps>) => {
    return <Icon component={KeepCount} {...props} />
}
