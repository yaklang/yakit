import {ComponentParams} from "@/routes/newRoute"
import {YakitRoute} from "@/enums/yakitRoute"

/**
 * @description 页面渲染
 * @property routeKey 路由key
 * @property yakScriptId
 * @property {ComponentParams} params 页面初始渲染的参数
 */
export interface PageItemProps {
    routeKey: YakitRoute | string
    yakScriptId?: number
    params?: ComponentParams
}

export interface RenderSubPageProps {
    renderSubPage: MultipleNodeInfo[]
    route: YakitRoute
    pluginId?: number
    selectSubMenuId: string
}

export interface RenderFuzzerSequenceProps {
    route: YakitRoute
    type: WebFuzzerType
    setType: (w: WebFuzzerType) => void
}

export interface RenderSubPageItemProps {
    route: YakitRoute
    pluginId?: number
    selectSubMenuId: string
    subItem: MultipleNodeInfo
}
