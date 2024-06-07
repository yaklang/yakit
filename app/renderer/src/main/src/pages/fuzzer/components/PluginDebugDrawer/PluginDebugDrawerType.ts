import {YakitRoute} from "@/routes/newRoute"

export interface PluginDebugDrawerProps {
    /**打开该抽屉的路由 */
    route: YakitRoute
    /**初始源码 */
    defaultCode: string
    /**父元素 */
    getContainer?: HTMLElement | null
    visible?: boolean
    setVisible: (b: boolean) => void
}
