export type MainOperatorEventProps = {
    /** 远程打开一个页面 */
    openPage: string
    /** 远程关闭一个页面 */
    closePage: string
    /** 从顶部菜单打开一个页面 */
    menuOpenPage: string

    /** 菜单展开收起状态切换 */
    menuExpandSwitch: string
    /**二级路由Tab数据变化 */
    secondMenuTabDataChange: string
}
