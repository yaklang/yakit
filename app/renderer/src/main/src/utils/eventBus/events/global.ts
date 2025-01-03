import {YakitRoute} from "@/enums/yakitRoute"

export type GlobalEventProps = {
    /** 打开引擎日志终端 */
    openEngineLogTerminal?: boolean
    /** 软件顶部是否能拖拽移动软件 */
    setYakitHeaderDraggable: boolean
    /**切换二级菜单的选中项目 */
    switchSubMenuItem: string
    /**触发性能采样 */
    performanceSampling?: string
    cancelPerformanceSampling?: string
    /**刷新顶部漏洞风险的已读未读状态 */
    onRefRisksRead: string
    /**系统代理已刷新 */
    onRefConfigSystemProxy: string
    /**消息通知查看全部 */
    openAllMessageNotification?: string
    /**切换一级菜单的选中key */
    switchMenuItem: string
    /**关闭当前页面 传页面id */
    onCloseCurrentPage: string
    /**
     * 关闭一级菜单
     * OnlyPageCache
     * @param {YakitRoute} route
     * @param {string} menuName 当route为YakitRoute.Plugin_OP时，menuName必传，其他可不传
     * @param {OnlyPageCache}assignPage 删除页面后指定某个页面展示 //LINK app\renderer\src\main\src\pages\layout\mainOperatorContent\MainOperatorContent.tsx#remove-menuPage
     */
    onCloseFirstMenu: string
    /**
     * 更新二级菜单的名字，从页面上发送的信号
     * @param {YakitRoute} route
     * @param {string} value tab名称
     * @param {string} pageId 修改的页面id
     */
    onUpdateSubMenuNameFormPage: string
}
