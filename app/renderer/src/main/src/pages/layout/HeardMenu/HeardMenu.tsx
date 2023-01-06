import React, {useEffect, useRef, useState} from "react"
import {HeardMenuProps, RouteMenuDataItemProps, SubMenuProps, CollapseMenuProp} from "./HeardMenuType"
import style from "./HeardMenu.module.scss"
import {DefaultRouteMenuData, MenuDataProps, Route} from "@/routes/routeSpec"
import classNames from "classnames"
import {
    AcademicCapIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CubeIcon,
    CursorClickIcon,
    DotsHorizontalIcon,
    PencilAltIcon,
    SaveIcon,
    SortAscendingIcon,
    SortDescendingIcon,
    UserIcon
} from "@/assets/newIcon"
import ReactResizeDetector from "react-resize-detector"
import {useGetState, useMemoizedFn} from "ahooks"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {Divider, Dropdown, Tabs, Tooltip} from "antd"
import {
    MenuBasicCrawlerIcon,
    MenuComprehensiveCatalogScanningAndBlastingIcon,
    MenuSpaceEngineHunterIcon,
    MenuSubDomainCollectionIcon,
    MenuDefaultPluginIcon,
    MenuPayloadIcon,
    MenuYakRunnerIcon
} from "@/pages/customizeMenu/icon/menuIcon"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"

const {ipcRenderer} = window.require("electron")

export const getScriptIcon = (name: string) => {
    switch (name) {
        case "基础爬虫":
            return <MenuBasicCrawlerIcon />
        case "空间引擎: Hunter": //中文
            return <MenuSpaceEngineHunterIcon />
        case "子域名收集":
            return <MenuSubDomainCollectionIcon />
        case "综合目录扫描与爆破":
            return <MenuComprehensiveCatalogScanningAndBlastingIcon />
        default:
            return <MenuDefaultPluginIcon />
    }
}

/**
 * @description:
 * @param {MenuDataProps} menuItemGroup 自定义菜单参数
 * @param {menuItemGroup} routeMenuData 路由参数
 * @param {} onRouteMenuSelect 系统菜单选择事件
 */
const HeardMenu: React.FC<HeardMenuProps> = React.memo((props) => {
    const {routeMenuData, menuItemGroup, onRouteMenuSelect} = props
    /**
     * @description: 融合系统菜单和自定义菜单
     */
    const [routeMenu, setRouteMenu] = useState<MenuDataProps[]>([])
    /**
     * @description: 折叠起来的菜单
     */
    const [routeMenuDataAfter, setRouteMenuDataAfter] = useState<MenuDataProps[]>([])
    const [width, setWidth] = useState<number>(0)
    const [number, setNumber] = useState<number>(-1)
    const [moreLeft, setMoreLeft] = useState<number>(0) // 更多文字的left
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [subMenuData, setSubMenuData] = useState<MenuDataProps[]>([])
    const [menuId, setMenuId, getMenuId] = useGetState<string>("")
    const [customizeVisible, setCustomizeVisible] = useState<boolean>(false)
    const menuLeftRef = useRef<any>()
    const menuLeftInnerRef = useRef<any>()
    useEffect(() => {
        const newMenuItemGroup: MenuDataProps[] = []
        menuItemGroup.forEach((menuGroupItem, index) => {
            let item: MenuDataProps = {
                id: menuGroupItem.Group === "UserDefined" ? "社区插件" : menuGroupItem.Group,
                label: menuGroupItem.Group === "UserDefined" ? "社区插件" : menuGroupItem.Group,
                subMenuData: menuGroupItem.Items.map((item) => {
                    const key =
                        item.YakScriptId > 0
                            ? `plugin:${item.Group}:${item.YakScriptId}`
                            : `batch:${item.Group}:${item.Verbose}:${item.MenuItemId}`
                    return {
                        id: key,
                        label: item.Verbose,
                        key: key as Route,
                        icon: getScriptIcon(item.Verbose)
                    }
                })
            }
            newMenuItemGroup.push(item)
        })
        const route = newMenuItemGroup.concat(routeMenuData)
        setRouteMenu(route)
        if (getMenuId()) {
            let currentMenu = route.find((ele) => ele.id === getMenuId())
            if (!currentMenu) {
                setSubMenuData((route[0] && route[0].subMenuData) || [])
                setMenuId((route[0] && routeMenu[0].id) || "")
            } else {
                setSubMenuData(currentMenu.subMenuData || [])
            }
        } else {
            if (route.length >= 0) {
                setSubMenuData((route[0] && route[0].subMenuData) || [])
            }
        }
    }, [routeMenuData, menuItemGroup])
    useEffect(() => {
        if (!width) return
        toMove()
    }, [width, routeMenu])

    /**
     * @description: 计算是否显示一级折叠菜单
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
                n = index
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
        routeMenu.forEach((ele, index) => {
            if (ele.subMenuData && ele.subMenuData.length > 0) {
                if (index < n) {
                    beforeRoute.push(ele)
                } else {
                    afterRoute.push(ele)
                }
            }
        })
        setRouteMenuDataAfter(afterRoute)
    })
    const onExpand = useMemoizedFn(() => {
        setIsExpand(true)
        if (!menuId && routeMenu.length > 0) {
            setSubMenuData(routeMenu[0].subMenuData || [])
            setMenuId(routeMenu[0].id || "")
        }
    })
    const onTabClick = useMemoizedFn((key) => {
        const index = key.indexOf("###")
        if (index === -1) return
        const newKey = key.substring(0, index)
        onRouteMenuSelect(newKey as Route)
    })
    const onCustomizeMenuClick = useMemoizedFn((key: string) => {
        setRemoteValue("PatternMenu", key)
        setPatternMenu(key as "expert" | "new")
    })
    /**
     * @description: 编辑菜单
     */
    const onGoCustomize = useMemoizedFn(() => {
        ipcRenderer.invoke("open-customize-menu")
    })
    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    useEffect(() => {
        getRemoteValue("PatternMenu").then((patternMenu) => {
            setPatternMenu(patternMenu || "expert")
        })
    }, [])
    /**
     * @description: 复原新手
     */
    const onRestoreNew = useMemoizedFn(() => {
        console.log(
            "新手",
            DefaultRouteMenuData.filter((item) => item.isNovice)
        )
    })
    /**
     * @description: 复原专家
     */
    const onRestoreExpert = useMemoizedFn(() => {})
    const CustomizeMenuData = [
        {
            key: "new",
            label: "新手模式",
            itemIcon: <UserIcon />,
            tip: "复原新手模式",
            onRestoreMenu: () => onRestoreNew()
        },
        {
            key: "expert",
            label: "专家模式",
            itemIcon: <AcademicCapIcon />,
            tip: "复原专家模式",
            onRestoreMenu: () => onRestoreExpert()
        }
    ]
    return (
        <div className={style["heard-menu-body"]}>
            <div
                className={classNames(style["heard-menu"], {
                    [style["heard-menu-expand"]]: isExpand
                })}
            >
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
                <div className={classNames(style["heard-menu-left"])} ref={menuLeftRef}>
                    <div className={classNames(style["heard-menu-left-inner"])} ref={menuLeftInnerRef}>
                        {routeMenu
                            .filter((ele) => ele.subMenuData && ele.subMenuData?.length > 0)
                            .map((menuItem, index) => {
                                return (
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
                                )
                            })}
                    </div>
                    {number > 0 && routeMenuDataAfter.length > 0 && (
                        <>
                            <CollapseMenu
                                moreLeft={moreLeft}
                                menuData={routeMenuDataAfter}
                                isExpand={isExpand}
                                onMenuSelect={(key) => onRouteMenuSelect(key as Route)}
                            />
                        </>
                    )}
                </div>
                <div className={classNames(style["heard-menu-right"])}>
                    <YakitButton
                        type='text'
                        className={style["heard-menu-theme"]}
                        onClick={() => onImportShare()}
                        icon={<SaveIcon />}
                    >
                        导入协作资源
                    </YakitButton>
                    <YakitButton
                        type='secondary2'
                        className={style["heard-menu-grey"]}
                        onClick={() => onRouteMenuSelect(Route.PayloadManager)}
                        icon={<MenuPayloadIcon />}
                    >
                        Payload
                    </YakitButton>
                    <YakitButton
                        type='secondary2'
                        className={classNames(style["heard-menu-grey"], style["heard-menu-yak-run"], {
                            [style["margin-right-0"]]: isExpand
                        })}
                        onClick={() => onRouteMenuSelect(Route.YakScript)}
                        icon={<MenuYakRunnerIcon />}
                    >
                        Yak Runner
                    </YakitButton>
                    <Dropdown
                        overlayClassName={style["customize-drop-menu"]}
                        overlay={
                            <>
                                {CustomizeMenuData.map((item) => (
                                    <div
                                        key={item.key}
                                        className={classNames(style["customize-item"], {
                                            [style["customize-item-select"]]: patternMenu === item.key
                                        })}
                                        onClick={() => onCustomizeMenuClick(item.key)}
                                    >
                                        <div className={style["customize-item-left"]}>
                                            {item.itemIcon}
                                            <span className={style["customize-item-label"]}>{item.label}</span>
                                        </div>
                                        {patternMenu === item.key && <CheckIcon />}
                                    </div>
                                ))}
                                <Divider style={{margin: "6px 0"}} />
                                <div>
                                    <div
                                        className={classNames(style["customize-item"])}
                                        onClick={() =>
                                            CustomizeMenuData.find((ele) => patternMenu === ele.key)?.onRestoreMenu()
                                        }
                                    >
                                        {CustomizeMenuData.find((ele) => patternMenu === ele.key)?.tip}
                                    </div>
                                    <div
                                        className={classNames(style["customize-item"])}
                                        onClick={() => onGoCustomize()}
                                    >
                                        编辑菜单
                                    </div>
                                    <div className={classNames(style["customize-item"])}>导入 JSON 配置</div>
                                </div>
                            </>
                        }
                        onVisibleChange={(e) => {
                            setCustomizeVisible(e)
                        }}
                    >
                        <YakitButton
                            type='secondary2'
                            className={classNames(style["heard-menu-grey"], style["heard-menu-customize"], {
                                [style["margin-right-0"]]: isExpand,
                                [style["heard-menu-customize-menu"]]: customizeVisible
                            })}
                            onClick={() => onRouteMenuSelect(Route.YakScript)}
                            icon={<CursorClickIcon />}
                        >
                            <div className={style["heard-menu-customize-content"]}>
                                自定义{(customizeVisible && <ChevronUpIcon />) || <ChevronDownIcon />}
                            </div>
                        </YakitButton>
                    </Dropdown>
                    {!isExpand && (
                        <div className={style["heard-menu-sort"]} onClick={() => onExpand()}>
                            {!isExpand && <SortDescendingIcon />}
                        </div>
                    )}
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
                                            <Tooltip title={item.label} placement='bottom'>
                                                <div
                                                    className={classNames(
                                                        style["sub-menu-expand-item-label"],
                                                        style["heard-menu-item-label"]
                                                    )}
                                                >
                                                    {item.label}
                                                </div>
                                            </Tooltip>
                                        </div>
                                        {index !== subMenuData.length - 1 && (
                                            <div className={style["sub-menu-expand-item-line"]} />
                                        )}
                                    </div>
                                }
                                key={`${item.key}###${item.label}`}
                            />
                        ))}
                    </Tabs>
                </div>
            )}
        </div>
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
            className={classNames(style["heard-menu-item"], style["heard-menu-item-font-weight"], {
                [style["heard-menu-item-none"]]: isShow,
                [style["heard-menu-item-flex-start"]]: isExpand,
                [style["heard-menu-item-active"]]: (isExpand && activeMenuId === menuItem.id) || visible
            })}
            onClick={() => onOpenSecondMenu()}
        >
            <Tooltip title={menuItem.label} placement='top'>
                <div className={style["heard-menu-item-label"]}>{menuItem.label}</div>
            </Tooltip>
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

const SubMenu: React.FC<SubMenuProps> = (props) => {
    const {subMenuData, onSelect} = props
    return (
        <div className={style["heard-sub-menu"]}>
            {subMenuData.map((subMenuItem) => (
                <div
                    className={style["heard-sub-menu-item"]}
                    key={`subMenuItem-${subMenuItem.key}`}
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
    const {menuData, moreLeft, isExpand, onMenuSelect} = props

    const [show, setShow] = useState<boolean>(false)

    const newMenuData: YakitMenuItemProps[] = menuData.map((item) => ({
        key: item.id || "",
        label: item.label,
        itemIcon: item.icon,
        children:
            item.subMenuData?.map((subItem) => ({
                key: subItem.key || "",
                label: subItem.label
            })) || []
    }))
    const menu = (
        <YakitMenu
            type='secondary'
            data={newMenuData}
            selectedKeys={[]}
            width={136}
            onSelect={({key}) => onMenuSelect(key)}
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
                overlayClassName={classNames(style["popover"])}
                // visible={true}
            >
                <div
                    className={classNames(style["heard-menu-item"], style["heard-menu-item-font-weight"], {
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
