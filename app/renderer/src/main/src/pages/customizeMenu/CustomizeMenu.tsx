import React, {useState} from "react"
import {
    CustomizeMenuProps,
    FirstMenuItemProps,
    FirstMenuProps,
    SecondMenuItemProps,
    SecondMenuProps
} from "./CustomizeMenuType"
import style from "./CustomizeMenu.module.scss"
import {
    ChevronLeftIcon,
    BanIcon,
    RemoveIcon,
    DragSortIcon,
    PhotographIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon
} from "@/assets/newIcon"
import {MenuDataProps, DefaultRouteMenuData} from "@/routes/routeSpec"
import classNames from "classnames"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {Button, Input, Radio} from "antd"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {MenuDefaultPluginIcon} from "./icon/menuIcon"

const reorder = (list: MenuDataProps[], startIndex: number, endIndex: number) => {
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}

const CustomizeMenu: React.FC<CustomizeMenuProps> = (props) => {
    const {onClose} = props
    const [menuData, setMenuData] = useState<MenuDataProps[]>(DefaultRouteMenuData)
    const [currentFirstMenu, setCurrentFirstMenu] = useState<MenuDataProps>()
    const [subMenuData, setSubMenuData] = useState<MenuDataProps[]>([])
    const onSelect = useMemoizedFn((item: MenuDataProps) => {
        setCurrentFirstMenu(item)
        setSubMenuData(item.subMenuData || [])
    })
    /**
     * @description: 新增一级菜单
     */
    const onAddFirstMenu = useMemoizedFn(() => {
        const length = menuData.filter((ele) => ele.label.includes("未命名")).length
        const id = randomString(4)
        const menu: MenuDataProps = {
            id,
            label: `未命名${length + 1}`
        }
        setCurrentFirstMenu({...menu})
        setMenuData([...menuData, menu])
    })
    /**
     * @description: 删除一级菜单
     */
    const onRemoveFirstMenu = useMemoizedFn(() => {
        if (!currentFirstMenu) return
        const index = menuData.findIndex((ele) => ele.id === currentFirstMenu?.id)
        if (index === -1) return
        menuData.splice(index, 1)
        setCurrentFirstMenu(undefined)
        setMenuData([...menuData])
    })
    /**
     * @description: 修改一级菜单以及当前选中的菜单项
     */
    const editCurrentFirstMenu = useMemoizedFn((value: string) => {
        if (!currentFirstMenu) return
        const index = menuData.findIndex((ele) => ele.id === currentFirstMenu?.id)
        if (index === -1) return
        menuData[index].label = value
        setCurrentFirstMenu({...currentFirstMenu, label: value})
        setMenuData([...menuData])
    })
    return (
        <div className={style["content"]}>
            <div className={style["left"]}>
                <div className={style["left-heard"]}>
                    <div className={style["display-flex"]}>
                        <ArrowLeftIcon className={style["content-icon"]} onClick={() => onClose()} />
                        <div className={style["left-title"]}>自定义菜单</div>
                        <div className={style["left-number"]}>6/50</div>
                    </div>
                    <div onClick={() => onAddFirstMenu()}>
                        <PlusIcon className={style["content-icon"]} />
                    </div>
                </div>
                <div className={style["left-content"]}>
                    <FirstMenu
                        menuData={menuData}
                        setMenuData={setMenuData}
                        currentFirstMenu={currentFirstMenu}
                        onSelect={onSelect}
                    />
                </div>
                <div className={style["left-footer"]}>
                    <YakitButton type='primary'>完成</YakitButton>
                    <YakitButton type='outline1'>导出 JSON</YakitButton>
                    <YakitButton>取消</YakitButton>
                </div>
            </div>
            <div className={style["middle"]}>
                <SecondMenu
                    currentFirstMenu={currentFirstMenu}
                    editCurrentFirstMenu={editCurrentFirstMenu}
                    subMenuData={subMenuData}
                    setSubMenuData={setSubMenuData}
                    onRemoveFirstMenu={onRemoveFirstMenu}
                />
            </div>
            <div className={style["right"]}>
                <div>
                    <Radio.Group defaultValue='a' buttonStyle='solid'>
                        <Radio.Button value='a'>系统功能</Radio.Button>
                        <Radio.Button value='b'>插件</Radio.Button>
                    </Radio.Group>
                </div>
            </div>
        </div>
    )
}

export default CustomizeMenu

const getItemStyle = (isDragging, draggableStyle) => ({
    ...draggableStyle
})

const FirstMenu: React.FC<FirstMenuProps> = (props) => {
    const {menuData, setMenuData, currentFirstMenu, onSelect} = props

    const [destinationDrag, setDestinationDrag] = useState<string>("droppable1")

    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const menuList: MenuDataProps[] = reorder(menuData, result.source.index, result.destination.index)
            setMenuData(menuList)
        }
    })
    /**
     * @description: 计算移动的范围是否在目标范围类
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            // console.log("onDragUpdate", result)
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    return (
        <div className={style["first-menu-list"]}>
            <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
                <Droppable droppableId='droppable1'>
                    {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            {menuData.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                        >
                                            <FirstMenuItem
                                                key={item.id}
                                                menuItem={item}
                                                currentMenuItem={currentFirstMenu}
                                                isDragging={snapshot.isDragging}
                                                onSelect={onSelect}
                                                destinationDrag={destinationDrag}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    )
}

const FirstMenuItem: React.FC<FirstMenuItemProps> = React.memo((props) => {
    const {menuItem, currentMenuItem, isDragging, onSelect, destinationDrag} = props
    return (
        <div
            className={classNames(style["first-menu-item"], {
                [style["first-menu-item-select"]]: menuItem.id === currentMenuItem?.id,
                [style["menu-item-drag"]]: isDragging
            })}
            onClick={() => onSelect(menuItem)}
        >
            <div className={classNames(style["display-flex"], style["first-menu-item-left"])}>
                <DragSortIcon
                    className={classNames(style["content-icon"], {
                        [style["content-icon-active"]]: isDragging
                    })}
                />
                <div className={style["first-menu-item-label"]} title={menuItem.label}>
                    {menuItem.label}
                </div>
            </div>
            <div className={style["first-sub-menu-number"]}>{menuItem.subMenuData?.length || 0}</div>
            {!destinationDrag && isDragging && (
                <div className={style["first-drag-state"]}>
                    <BanIcon />
                </div>
            )}
        </div>
    )
})

const SecondMenu: React.FC<SecondMenuProps> = (props) => {
    const {currentFirstMenu, subMenuData, setSubMenuData, editCurrentFirstMenu, onRemoveFirstMenu} = props
    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable2" && result.destination.droppableId === "droppable2") {
            const subMenuList: MenuDataProps[] = reorder(subMenuData, result.source.index, result.destination.index)
            setSubMenuData(subMenuList)
        }
    })
    return (
        <div className={style["second-menu"]}>
            <div className={style["second-menu-heard"]}>
                <div className={style["second-menu-heard-input"]}>
                    <Input
                        placeholder='未命名1 (菜单名建议 4-16 个英文字符内最佳)'
                        bordered={false}
                        suffix={
                            <div onClick={onRemoveFirstMenu}>
                                <TrashIcon />
                            </div>
                        }
                        value={currentFirstMenu?.label}
                        onChange={(e) => {
                            if (currentFirstMenu) {
                                editCurrentFirstMenu(e.target.value)
                            }
                        }}
                    />
                </div>
                <div className={style["second-menu-heard-tip"]}>已添加功能 {subMenuData.length}/50</div>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className={style["second-menu-list"]}>
                    <Droppable droppableId='droppable2'>
                        {(provided, snapshot) => {
                            return (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {subMenuData.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={getItemStyle(
                                                        snapshot.isDragging,
                                                        provided.draggableProps.style
                                                    )}
                                                >
                                                    <SecondMenuItem
                                                        key={item.id}
                                                        menuItem={item}
                                                        isDragging={snapshot.isDragging}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {subMenuData.length === 0 && (
                                        <div className={style["second-menu-no-data"]}>
                                            <PhotographIcon className={style["second-menu-photograph-icon"]} />
                                            <div>
                                                <div
                                                    className={classNames(
                                                        style["second-menu-text"],
                                                        style["second-menu-text-bold"]
                                                    )}
                                                >
                                                    暂未未添加功能
                                                </div>
                                                <div className={style["second-menu-text"]}>
                                                    可通过拖拽或点击添加按钮，将功能添加至此处
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {provided.placeholder}
                                </div>
                            )
                        }}
                    </Droppable>
                </div>
            </DragDropContext>
        </div>
    )
}

const SecondMenuItem: React.FC<SecondMenuItemProps> = React.memo((props) => {
    const {menuItem, isDragging} = props
    return (
        <div className={style["second-menu-item-content"]}>
            <div
                className={classNames(style["second-menu-item"], {
                    [style["menu-item-drag"]]: isDragging
                })}
            >
                <DragSortIcon
                    className={classNames({
                        [style["content-icon-active"]]: isDragging
                    })}
                />
                {menuItem.icon || <MenuDefaultPluginIcon />}
                <div>
                    <div className={style["second-menu-label"]}>{menuItem.label}</div>
                    <div className={style["second-menu-describe"]}>
                        {menuItem.describe || "No Description about it."}
                    </div>
                </div>
            </div>
            <div className={style["close-icon"]}>
                <RemoveIcon />
            </div>
        </div>
    )
})
