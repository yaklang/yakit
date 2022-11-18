import React, {useEffect, useRef, useState, ReactNode} from "react"
import {
    HeardMenuProps,
    HeardMenuLeftProps,
    RouteMenuDataItemProps,
    SubMenuGroupProps,
    SubMenuProps,
    CollapseMenuProp
} from "./HeardMenuType"
import style from "./HeardMenu.module.scss"
import {DefaultRouteMenuData, MenuDataProps, Route} from "@/routes/routeSpec"
import {MenuDefaultPluginIcon, MenuPayloadIcon, MenuYakRunnerIcon} from "@/pages/customizeMenu/icon/menuIcon"
import classNames from "classnames"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    DotsHorizontalIcon,
    SaveIcon,
    SortAscendingIcon,
    SortDescendingIcon
} from "@/assets/newIcon"
import ReactResizeDetector from "react-resize-detector"
import {useMemoizedFn} from "ahooks"
import {YakitMenu, YakitMenuItemProps} from "../YakitMenu/YakitMenu"
import {YakitPopover} from "../YakitPopover/YakitPopover"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {Tabs} from "antd"

/**
 * @description:
 * @param {MenuDataProps} menuItemGroup 自定义菜单参数
 * @param {menuItemGroup} routeMenuData 路由参数
 * @param {} onRouteMenuSelect 系统菜单选择事件
 */
const HeardMenu: React.FC<HeardMenuProps> = React.memo((props) => {
    const {routeMenuData, menuItemGroup, onRouteMenuSelect} = props
    /**
     * @description: 折叠起来的菜单
     */
    const [routeMenuDataAfter, setRouteMenuDataAfter] = useState<MenuDataProps[]>([])
    const [width, setWidth] = useState<number>(0)
    const [number, setNumber] = useState<number>(-1)
    const [moreLeft, setMoreLeft] = useState<number>(0) // 更多文字的left
    const [isExpand, setIsExpand] = useState<boolean>(false)
    const [subMenuData, setSubMenuData] = useState<MenuDataProps[]>([])
    const [menuId, setMenuId] = useState<string>("")
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
        if (clientWidth.length > 0) {
            setMoreLeft(clientWidth.reduce((p, c) => p + c))
        }
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
    const onExpand = useMemoizedFn(() => {
        setIsExpand(true)
        if (subMenuData.length === 0 && routeMenuData.length > 0) {
            // setSubMenuData(routeMenuData[0].subMenuData || [])
            setSubMenuData(
                [
                    ...(routeMenuData[0].subMenuData || []),
                    ...(routeMenuData[1].subMenuData || []),
                    ...(routeMenuData[2].subMenuData || []),
                    ...(routeMenuData[3].subMenuData || []),
                    ...(routeMenuData[4].subMenuData || []),
                    ...(routeMenuData[5].subMenuData || [])
                ] || []
            )
            // setMenuId(routeMenuData[0].id || "")
        }
    })
    const onTabClick = useMemoizedFn((key) => {
        onRouteMenuSelect(key as Route)
    })
    return (
        <>
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
                            <YakitPopover
                                placement='bottomLeft'
                                arrowPointAtCenter={true}
                                content={<SubMenuGroup subMenuGroupData={menuGroupItem.Items || []} />}
                                trigger='hover'
                                overlayClassName={classNames(style["popover"], {
                                    [style["popover-content"]]: menuGroupItem.Items && menuGroupItem.Items.length <= 1
                                })}
                                key={`menuItem-${menuGroupItem.Group}`}
                            >
                                <div
                                    className={classNames(style["heard-menu-item"], {
                                        [style["heard-menu-item-flex-start"]]: isExpand
                                    })}
                                >
                                    <div className={style["heard-menu-item-label"]}>
                                        {menuGroupItem.Group === "社区插件" ? "" : menuGroupItem.Group}
                                    </div>
                                </div>
                            </YakitPopover>
                        ))}
                        {routeMenuData.map((menuItem, index) => {
                            return (
                                <>
                                    <RouteMenuDataItem
                                        key={`menuItem-${menuItem.id}`}
                                        menuItem={menuItem}
                                        isShow={number > 0 ? number <= index : false}
                                        onSelect={(r) => onRouteMenuSelect(r.key as Route)}
                                        isExpand={isExpand}
                                        setSubMenuData={(menu) => {
                                            setSubMenuData(menu.subMenuData || [])
                                            setMenuId(menu.id || "")
                                        }}
                                        activeMenuId={menuId}
                                    />
                                </>
                            )
                        })}
                    </div>
                    {number > 0 && routeMenuDataAfter.length > 0 && (
                        <>
                            <CollapseMenu moreLeft={moreLeft} menuData={routeMenuDataAfter} isExpand={isExpand} />
                        </>
                    )}
                </div>
                <div className={style["heard-menu-right"]}>
                    <div className={style["heard-menu-theme"]}>
                        <SaveIcon />
                        <span className={style["heard-menu-label"]} onClick={() => onImportShare()}>
                            导入协作资源
                        </span>
                    </div>
                    <div className={style["heard-menu-grey"]} onClick={() => onRouteMenuSelect(Route.PayloadManager)}>
                        <MenuPayloadIcon />
                        <span className={style["heard-menu-label"]}>Payload</span>
                    </div>
                    <div
                        className={classNames(style["heard-menu-grey"], style["heard-menu-yak-run"], {
                            [style["margin-right-0"]]: isExpand
                        })}
                        onClick={() => onRouteMenuSelect(Route.YakScript)}
                    >
                        <MenuYakRunnerIcon />
                        <span className={style["heard-menu-label"]}>Yak Runner</span>
                    </div>
                    <div className={style["heard-menu-sort"]} onClick={() => onExpand()}>
                        {!isExpand && <SortDescendingIcon />}
                    </div>
                </div>
            </div>
            {isExpand && (
                <div className={style["heard-sub-menu-expand"]}>
                    <Tabs
                        tabBarExtraContent={
                            <div className={style["heard-menu-sort"]} onClick={() => setIsExpand(false)}>
                                <SortAscendingIcon />
                            </div>
                        }
                        onTabClick={onTabClick}
                        popupClassName={style["heard-sub-menu-popup"]}
                        moreIcon={<DotsHorizontalIcon className={style["dots-icon"]} />}
                    >
                        {subMenuData.map((item, index) => (
                            <Tabs.TabPane
                                tab={
                                    <div className={style["sub-menu-expand"]}>
                                        <div
                                            className={style["sub-menu-expand-item"]}
                                            style={{paddingLeft: index === 0 ? 0 : ""}}
                                        >
                                            <div className={style["sub-menu-expand-item-icon"]}>{item.icon}</div>
                                            <div
                                                className={classNames(
                                                    style["sub-menu-expand-item-label"],
                                                    style["heard-menu-item-label"]
                                                )}
                                            >
                                                {item.label}
                                            </div>
                                        </div>
                                        {index !== subMenuData.length - 1 && (
                                            <div className={style["sub-menu-expand-item-line"]} />
                                        )}
                                    </div>
                                }
                                key={item.key}
                            />
                        ))}
                    </Tabs>
                </div>
            )}
        </>
    )
})

export default HeardMenu

const RouteMenuDataItem: React.FC<RouteMenuDataItemProps> = React.memo((props) => {
    const {menuItem, isShow, onSelect, isExpand, setSubMenuData, activeMenuId} = props
    const [visible, setVisible] = useState<boolean>(false)
    const onOpenSecondMenu = useMemoizedFn(() => {
        if (!isExpand) return
        setSubMenuData(menuItem || [])
    })
    const popoverContent = (
        <div
            className={classNames(style["heard-menu-item"], {
                [style["heard-menu-item-none"]]: isShow,
                [style["heard-menu-item-flex-start"]]: isExpand,
                [style["heard-menu-item-active"]]: (isExpand && activeMenuId === menuItem.id) || visible
            })}
            onClick={() => onOpenSecondMenu()}
        >
            <div className={style["heard-menu-item-label"]}>{menuItem.label}</div>
        </div>
    )
    return (
        (isExpand && popoverContent) || (
            <YakitPopover
                placement='bottomLeft'
                content={<SubMenu subMenuData={menuItem.subMenuData || []} onSelect={onSelect} />}
                trigger='hover'
                overlayClassName={classNames(style["popover"], {
                    [style["popover-content"]]: menuItem.subMenuData && menuItem.subMenuData.length <= 1
                })}
                onVisibleChange={setVisible}
                // visible={menuItem.id === "2"}
            >
                {popoverContent}
            </YakitPopover>
        )
    )
})

const SubMenuGroup: React.FC<SubMenuGroupProps> = (props) => {
    const {subMenuGroupData} = props
    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuGroupData.map((subMenuGroupItem) => (
                <div className={style["heard-sub-menu-item"]} key={subMenuGroupItem.YakScriptId}>
                    {/* {subMenuGroupItem.icon || <MenuDefaultPluginIcon />} */}
                    <MenuDefaultPluginIcon />
                    <div className={style["heard-sub-menu-label"]}>{subMenuGroupItem.Verbose}</div>
                </div>
            ))}
        </div>
    )
}

const SubMenu: React.FC<SubMenuProps> = (props) => {
    const {subMenuData, onSelect} = props
    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuData.map((subMenuItem) => (
                <div
                    className={style["heard-sub-menu-item"]}
                    key={`subMenuItem-${subMenuItem.id}`}
                    onClick={() => onSelect(subMenuItem)}
                >
                    {subMenuItem.icon || <MenuDefaultPluginIcon />}
                    <div className={style["heard-sub-menu-label"]}>{subMenuItem.label}</div>
                </div>
            ))}
        </div>
    )
}

const CollapseMenu: React.FC<CollapseMenuProp> = React.memo((props) => {
    const {menuData, moreLeft, isExpand} = props

    const [show, setShow] = useState<boolean>(false)

    const menuSelect = useMemoizedFn((type: string) => {})
    const newMenuData: YakitMenuItemProps[] = menuData.map((item) => ({
        key: item.id || "",
        label: item.label,
        itemIcon: item.icon,
        children:
            item.subMenuData?.map((subItem) => ({
                key: subItem.id || "",
                label: subItem.label
            })) || []
    }))

    const menu = <YakitMenu data={newMenuData} width={136} onSelect={({key}) => menuSelect(key)}></YakitMenu>

    return (
        <div className={style["heard-menu-more"]} style={{left: moreLeft}}>
            <YakitPopover
                placement={"bottomLeft"}
                arrowPointAtCenter={true}
                content={menu}
                trigger='hover'
                onVisibleChange={(visible) => setShow(visible)}
                overlayClassName={classNames(style["popover"])}
            >
                <div
                    className={classNames(style["heard-menu-item"], {
                        [style["heard-menu-item-open"]]: show,
                        [style["heard-menu-item-flex-start"]]: isExpand
                    })}
                >
                    更多
                    {(show && <ChevronUpIcon />) || <ChevronDownIcon />}
                </div>
            </YakitPopover>
        </div>
    )
})
