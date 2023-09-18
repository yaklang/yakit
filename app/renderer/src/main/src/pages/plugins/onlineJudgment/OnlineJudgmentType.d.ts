/**
 * @description 在线判断
 * @property children 页面
 * @property faultImg 每个页面可以传自己的故障图。例如消息页面接口返回502，就展示消息页面的故障图加报错信息
 */
export interface OnlineJudgmentProps {
    ref?: any
    children: ReactNode
    faultImg?: string
}

/**
 * @description 在线返回
 * @property code 状态码
 * @property 错误信息
 * */
export interface OnlineResponseStatusProps {
    code: number
    message: string
}
