export type MainOperatorEventProps = {
    /** 远程打开一个页面 */
    openPage: string
    /** 远程关闭一个页面 */
    closePage: string
    /** 从顶部菜单打开一个页面 */
    menuOpenPage: string

    /**二级路由Tab数据变化 */
    secondMenuTabDataChange: string
}
