/** @name 传给数据库一级菜单项属性 */
export interface SendDatabaseFirstMenuProps {
    /** @name 一级菜单展示名 */
    Group: string
    /** @name 二级菜单项集合 */
    Items: SendDatabaseSecondMenuProps[]
    /** @name 一级菜单顺序位 */
    GroupSort: number
    /** @name 菜单模式 */
    Mode: string
    /** @name 一级菜单初始值 */
    GroupLabel: string
}
/** @name 传给数据库二级菜单项属性 */
export interface SendDatabaseSecondMenuProps {
    /** @name 插件名称 */
    YakScriptName: string
    /** @name 菜单模式 */
    Mode: string
    /** @name 二级菜单顺序位 */
    VerboseSort: number
    /** @name 一级菜单顺序位 */
    GroupSort: number
    /** @name 二级菜单路由 */
    Route: string
    /** @name 二级菜单展示名 */
    Verbose: string
    /** @name 二级菜单初始值 */
    VerboseLabel: string
    /** @name 一级菜单展示名 */
    Group: string
    /** @name 一级菜单初始值 */
    GroupLabel: string
}
