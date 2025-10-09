import Icon from "@ant-design/icons"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import React from "react"

interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}
const Retract = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M6.56341 13.2364C6.21194 12.8849 6.21194 12.3151 6.56341 11.9636L9.52701 9L6.56341 6.0364C6.21194 5.68492 6.21194 5.11508 6.56341 4.7636C6.91488 4.41213 7.48473 4.41213 7.8362 4.7636L11.4362 8.3636C11.7877 8.71508 11.7877 9.28492 11.4362 9.6364L7.8362 13.2364C7.48473 13.5879 6.91488 13.5879 6.56341 13.2364Z'
            fill='#868C97'
        />
    </svg>
)
/**
 * @description  收起图标
 */
export const RetractIcon = (props: Partial<IconProps>) => {
    return <Icon component={Retract} {...props} />
}

const Expand = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='17' height='18' viewBox='0 0 17 18' fill='none'>
        <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M3.7636 6.56365C4.11508 6.21218 4.68492 6.21218 5.0364 6.56365L8 9.52726L10.9636 6.56365C11.3151 6.21218 11.8849 6.21218 12.2364 6.56365C12.5879 6.91512 12.5879 7.48497 12.2364 7.83645L8.6364 11.4364C8.28492 11.7879 7.71508 11.7879 7.3636 11.4364L3.7636 7.83645C3.41213 7.48497 3.41213 6.91512 3.7636 6.56365Z'
            fill='white'
        />
    </svg>
)
/**
 * @description  收起图标
 */
export const ExpandIcon = (props: Partial<IconProps>) => {
    return <Icon component={Expand} {...props} />
}
