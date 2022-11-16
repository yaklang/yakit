import React, {useEffect, useRef, useState} from "react"
import {
    HeardMenuProps,
    HeardMenuLeftProps,
    RouteMenuDataItemProps,
    SubMenuGroupProps,
    SubMenuProps
} from "./HeardMenuType"
import style from "./HeardMenu.module.scss"
import {DefaultRouteMenuData, MenuDataProps} from "@/routes/routeSpec"
import {Popover, Tabs} from "antd"
import {DefaultPluginIcon, PayloadIcon, YakRunnerIcon} from "@/pages/customizeMenu/icon/menuIcon"
import classNames from "classnames"
import {ChevronDownIcon, SaveIcon, SortDescendingIcon} from "@/assets/newIcon"
import ReactResizeDetector from "react-resize-detector"
import {useMemoizedFn} from "ahooks"
import {YakitMenu} from "../YakitMenu/YakitMenu"
import {YakitPopover} from "../YakitPopover/YakitPopover"

const {TabPane} = Tabs
/**
 * @description:
 * @param {MenuDataProps} menuItemGroup 自定义菜单参数
 * @param {menuItemGroup} routeMenuData 路由参数
 */
const HeardMenu: React.FC<HeardMenuProps> = React.memo((props) => {
    const {routeMenuData, menuItemGroup} = props
    /**
     * @description: 折叠起来的菜单
     */
    const [routeMenuDataAfter, setRouteMenuDataAfter] = useState<MenuDataProps[]>([])
    const [width, setWidth] = useState<number>(0)
    const [number, setNumber] = useState<number>(-1)
    const [moreLeft, setMoreLeft] = useState<number>(0) // 更多文字的left
    const menuLeftRef = useRef<any>()
    const menuLeftInnerRef = useRef<any>()
    useEffect(() => {
        // console.log("menuItemGroup", menuItemGroup)
        // console.log("routeMenuData", routeMenuData)
    }, [routeMenuData, menuItemGroup])
    useEffect(() => {
        if (!width) return
        toMove()
    }, [width])

    /**
     * @description: 计算是否显示折叠菜单
     */
    const toMove = useMemoizedFn(() => {
        const menuWidth = menuLeftRef.current.clientWidth
        let childrenList: any[] = menuLeftInnerRef.current.children
        let childWidthAll = 0
        let n = -1
        let clientWidth: number[] = []
        for (let index = 0; index < childrenList.length; index++) {
            const element = childrenList[index]
            childWidthAll += element.clientWidth
            if (childWidthAll > menuWidth) {
                n = index - 1
                break
            }
            clientWidth[index] = element.clientWidth
        }
        setNumber(n)
        setMoreLeft(clientWidth.reduce((p, c) => p + c))
        if (n < 0) {
            setRouteMenuDataAfter([])
            return
        }
        const afterRoute: MenuDataProps[] = []
        const beforeRoute: MenuDataProps[] = []
        routeMenuData.forEach((ele, index) => {
            if (index < n) {
                beforeRoute.push(ele)
            } else {
                afterRoute.push(ele)
            }
        })
        setRouteMenuDataAfter(afterRoute)
    })

    return (
        <div className={style["heard-menu"]}>
            <ReactResizeDetector
                onResize={(w) => {
                    if (!w) {
                        return
                    }
                    setWidth(w)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div className={style["heard-menu-left"]} ref={menuLeftRef}>
                <div className={classNames(style["heard-menu-left-inner"])} ref={menuLeftInnerRef}>
                    {menuItemGroup.map((menuGroupItem) => (
                        <Popover
                            placement='bottomLeft'
                            arrowPointAtCenter={true}
                            content={<SubMenuGroup subMenuGroupData={menuGroupItem.Items || []} />}
                            trigger='hover'
                            overlayClassName={classNames(style["popover"], {
                                [style["popover-content"]]: menuGroupItem.Items && menuGroupItem.Items.length <= 1
                            })}
                            key={`menuItem-${menuGroupItem.Group}`}
                        >
                            <div className={style["heard-menu-item"]}>
                                <div className={style["heard-menu-item-label"]}>
                                    {menuGroupItem.Group === "社区插件" ? "" : menuGroupItem.Group}
                                </div>
                            </div>
                        </Popover>
                    ))}
                    {routeMenuData.map((menuItem, index) => {
                        return (
                            <>
                                <RouteMenuDataItem
                                    key={`menuItem-${menuItem.id}`}
                                    menuItem={menuItem}
                                    isShow={number > 0 ? number <= index : false}
                                />
                            </>
                        )
                    })}
                </div>
                {number > 0 && routeMenuDataAfter.length > 0 && (
                    <>
                        <CollapseMenu moreLeft={moreLeft} menuData={routeMenuDataAfter} />
                        {/* <div className={style["heard-menu-more"]} style={{left: moreLeft}}>
                            <Popover
                                placement='bottomLeft'
                                arrowPointAtCenter={true}
                                content={
                                    <div>
                                        {routeMenuDataAfter.map((ele) => (
                                            <div key={`after-${ele.id}`}>{ele.label}</div>
                                        ))}
                                    </div>
                                }
                                trigger='hover'
                            >
                                <div className={style["heard-menu-item"]}>
                                    更多
                                    <ChevronDownIcon />
                                </div>
                            </Popover>
                        </div> */}
                    </>
                )}
            </div>

            <div className={style["heard-menu-right"]}>
                <div className={style["heard-menu-theme"]}>
                    <SaveIcon />
                    <span className={style["heard-menu-label"]}>导入协作资源</span>
                </div>
                <div className={style["heard-menu-grey"]}>
                    <PayloadIcon />
                    <span className={style["heard-menu-label"]}>Payload</span>
                </div>
                <div className={classNames(style["heard-menu-grey"], style["heard-menu-yak-run"])}>
                    <YakRunnerIcon />
                    <span className={style["heard-menu-label"]}>Yak Runner</span>
                </div>
                <div className={style["heard-menu-sort"]}>
                    <SortDescendingIcon />
                </div>
            </div>
        </div>
    )
})

export default HeardMenu

const RouteMenuDataItem: React.FC<RouteMenuDataItemProps> = React.memo(
    (props) => {
        const {menuItem, isShow} = props
        return (
            <Popover
                placement='bottomLeft'
                arrowPointAtCenter={true}
                content={<SubMenu subMenuData={menuItem.subMenuData || []} />}
                trigger='hover'
                overlayClassName={classNames(style["popover"], {
                    [style["popover-content"]]: menuItem.subMenuData && menuItem.subMenuData.length <= 1
                })}
            >
                <div
                    className={classNames(style["heard-menu-item"], {
                        [style["heard-menu-item-none"]]: isShow
                    })}
                >
                    <div className={style["heard-menu-item-label"]}>{menuItem.label}</div>
                </div>
            </Popover>
        )
    },
    (preProps, nextProps) => {
        if (preProps.isShow != nextProps.isShow) {
            return false
        }
        return true
    }
)

const SubMenuGroup: React.FC<SubMenuGroupProps> = (props) => {
    const {subMenuGroupData} = props
    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuGroupData.map((subMenuGroupItem) => (
                <div className={style["heard-sub-menu-item"]} key={subMenuGroupItem.YakScriptId}>
                    {/* {subMenuGroupItem.icon || <DefaultPluginIcon />} */}
                    <DefaultPluginIcon />
                    <div className={style["heard-sub-menu-label"]}>{subMenuGroupItem.Verbose}</div>
                </div>
            ))}
        </div>
    )
}

const SubMenu: React.FC<SubMenuProps> = (props) => {
    const {subMenuData} = props
    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuData.map((subMenuItem) => (
                <div className={style["heard-sub-menu-item"]} key={`subMenuItem-${subMenuItem.id}`}>
                    {subMenuItem.icon || <DefaultPluginIcon />}
                    <div className={style["heard-sub-menu-label"]}>{subMenuItem.label}</div>
                </div>
            ))}
        </div>
    )
}

interface CollapseMenuProp {
    menuData: MenuDataProps[]
    moreLeft: number
}
const CollapseMenu: React.FC<CollapseMenuProp> = React.memo((props) => {
    const {menuData, moreLeft} = props

    const [show, setShow] = useState<boolean>(false)

    const menuSelect = useMemoizedFn((type: string) => {})

    const menu = (
        <YakitMenu
            // selectedKeys={[engineMode]}
            data={[
                {
                    key: "plugin",
                    label: "配置插件源",
                    children: [
                        {label: "外部", key: "external"},
                        {label: "插件商店", key: "store"}
                    ]
                },
                {
                    key: "reverse",
                    label: "全局反连"
                },
                {
                    key: "agent",
                    label: "系统代理"
                },
                {
                    key: "engineAgent",
                    label: "引擎扫描代理"
                },
                {
                    key: "engineVar",
                    label: "引擎环境变量"
                },
                {
                    key: "link",
                    label: "切换连接模式",
                    children: [
                        {label: "本地", key: "local"},
                        {label: "远程", key: "remote"},
                        {label: "管理员", key: "admin"}
                    ]
                }
            ]}
            onSelect={({key}) => menuSelect(key)}
        ></YakitMenu>
    )

    return (
        <div className={style["heard-menu-more"]} style={{left: moreLeft}}>
            <YakitPopover
                placement={"bottomLeft"}
                arrowPointAtCenter={true}
                content={menu}
                trigger='hover'
                onVisibleChange={(visible) => setShow(visible)}
                overlayClassName={classNames(style["ui-op-dropdown"], style["ui-op-setting-dropdown"])}
            >
                <div className={style["heard-menu-item"]}>
                    更多
                    <ChevronDownIcon />
                </div>
            </YakitPopover>
        </div>
    )
})
