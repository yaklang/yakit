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
import {useMutationObserver} from "ahooks"

const {TabPane} = Tabs
/**
 * @description:
 * @param {MenuDataProps} menuItemGroup 自定义菜单参数
 * @param {menuItemGroup} routeMenuData 路由参数
 */
const HeardMenu: React.FC<HeardMenuProps> = React.memo((props) => {
    const {routeMenuData, menuItemGroup} = props
    /**
     * @description: 显示的菜单
     */
    const [routeMenuDataBefore, setRouteMenuDataBefore] = useState<MenuDataProps[]>([])
    /**
     * @description: 折叠起来的菜单
     */
    const [routeMenuDataAfter, setRouteMenuDataAfter] = useState<MenuDataProps[]>([])
    const [width, setWidth] = useState<number>(0)
    const [number, setNumber] = useState<number>(-1)
    const menuLeftRef = useRef<any>()
    /**
     * @description: 用来计算折叠菜单的
     */
    const menuLeftInnerRef = useRef<any>()
    /**
     * @description: 用来展示菜单的
     */
    const menuLeftInnerDisplayRef = useRef<any>()
    // const number = useRef<number>(-1)
    useEffect(() => {
        // console.log("menuItemGroup", menuItemGroup)
        // console.log("routeMenuData", routeMenuData)
    }, [routeMenuData, menuItemGroup])
    const childrenIsViewList = useRef<boolean[]>([])
    useEffect(() => {
        if (!width) return
        const menuWidth = menuLeftInnerDisplayRef.current.clientWidth
        // const childrenList: any[] = menuLeftInnerRef.current.children
        const childrenList: any[] = menuLeftInnerDisplayRef.current.children
        let childWidthAll = 0
        let number = -1
        let clientWidth: number[] = []
        for (let index = 0; index < childrenList.length; index++) {
            const element = childrenList[index]
            if (index === 0) {
                childWidthAll += element.clientWidth
                clientWidth[index] = element.clientWidth
            } else {
                childWidthAll += element.clientWidth + 32
                clientWidth[index] = element.clientWidth + 32
            }
            if (menuWidth < childWidthAll) {
                number = index - 1
                break
            }
        }
        console.log("menuLeftInnerDisplayRef.current", menuLeftInnerDisplayRef.current)
        console.log("childrenList", childrenList)
        console.log("clientWidth", clientWidth)
        console.log("childrenIsViewList", childrenIsViewList.current)
        console.log("number", number, menuWidth, childWidthAll)
        setNumber(number)
        if (number < 0) {
            setRouteMenuDataAfter([])
            setRouteMenuDataBefore(routeMenuData)
            return
        }
        const afterRoute: MenuDataProps[] = []
        const beforeRoute: MenuDataProps[] = []
        routeMenuData.forEach((ele, index) => {
            if (index < number) {
                beforeRoute.push(ele)
            } else {
                afterRoute.push(ele)
            }
        })
        console.log("beforeRoute", beforeRoute)
        console.log("afterRoute", afterRoute)
        setRouteMenuDataAfter(afterRoute)
        setRouteMenuDataBefore(beforeRoute)
    }, [width])

    return (
        <div className={style["heard-menu"]}>
            <div className={style["heard-menu-left"]} ref={menuLeftRef}>
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
                {/* 不展示只是用来计算宽度 */}
                {/* <HeardMenuLeft
                    menuLeftInnerRef={menuLeftInnerRef}
                    isDisplay={true}
                    routeMenuData={routeMenuData}
                    menuItemGroup={menuItemGroup}
                /> */}
                {/* 真正展示的菜单部分 */}
                <HeardMenuLeft
                    isDisplay={false}
                    routeMenuData={routeMenuData}
                    menuItemGroup={menuItemGroup}
                    childrenIsViewList={childrenIsViewList.current || []}
                    menuLeftInnerRef={menuLeftInnerDisplayRef}
                    number={number}
                />
                {/* {routeMenuDataAfter.length > 0 && ( */}
                {number > 0 && (
                    <>
                        <div className={style["heard-menu-more"]}>
                            <Popover
                                placement='bottomLeft'
                                arrowPointAtCenter={true}
                                content={
                                    <div>
                                        {routeMenuDataAfter.map((ele) => (
                                            <div>{ele.label}</div>
                                        ))}
                                    </div>
                                }
                                trigger='hover'
                            >
                                <div className={style["heard-menu-item"]} style={{width: "max-content"}}>
                                    更多 <ChevronDownIcon />
                                </div>
                            </Popover>
                        </div>
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
                    // id={menuItem.id}
                >
                    {menuItem.label}
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
        <div className={style["sub-menu"]}>
            {subMenuGroupData.map((subMenuGroupItem) => (
                <div className={style["sub-menu-item"]}>
                    {/* {subMenuGroupItem.icon || <DefaultPluginIcon />} */}
                    <DefaultPluginIcon />
                    <div className={style["sub-menu-label"]}>{subMenuGroupItem.Verbose}</div>
                </div>
            ))}
        </div>
    )
}

const SubMenu: React.FC<SubMenuProps> = (props) => {
    const {subMenuData} = props
    return (
        <div className={style["sub-menu"]}>
            {subMenuData.map((subMenuItem) => (
                <div className={style["sub-menu-item"]} key={`subMenuItem-${subMenuItem.id}`}>
                    {subMenuItem.icon || <DefaultPluginIcon />}
                    <div className={style["sub-menu-label"]}>{subMenuItem.label}</div>
                </div>
            ))}
        </div>
    )
}

const HeardMenuLeft: React.FC<HeardMenuLeftProps> = (props) => {
    const {menuLeftInnerRef, menuItemGroup, routeMenuData, childrenIsViewList = [], isDisplay, number} = props
    return (
        <div
            className={classNames(style["heard-menu-left-inner"], {
                [style["heard-menu-left-inner-none"]]: isDisplay
            })}
            ref={menuLeftInnerRef}
        >
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
                        {menuGroupItem.Group === "社区插件" ? "" : menuGroupItem.Group}
                    </div>
                </Popover>
            ))}
            {routeMenuData.map((menuItem, index) => (
                <>
                    <RouteMenuDataItem
                        key={`menuItem-${menuItem.id}`}
                        menuItem={menuItem}
                        // isShow={childrenIsViewList.length > 0 ? !childrenIsViewList[index] : false}
                        isShow={number > 0 ? number <= index : false}
                    />
                </>
            ))}
        </div>
    )
}
