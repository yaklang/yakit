import React, {useEffect, useState} from "react"
import styles from "./TabMenu.module.scss"
import {PlusIcon, RemoveIcon} from "@/assets/newIcon"
import classNames from "classnames"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {useCreation, useMemoizedFn} from "ahooks"

interface TabMenuProps {}

interface MenuDataProps {
    key: string
    children?: MenuChildrenDataProps[]
}
interface MenuChildrenDataProps {
    key: string
    expand?: boolean
    groupName?: string
    color?: string
    children?: MenuChildrenDataProps[]
}

const reorder = (list: MenuDataProps[], startIndex: number, endIndex: number) => {
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
}
const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = transform.substring(0, index) + ",0px)"
    }
    return {
        ...draggableStyle,
        transform
    }
}
let defMenuData: MenuDataProps[] = Array.from({length: 20}, (_, index) => {
    if (index === 3) {
        return {
            key: `${index}`,
            children: Array.from({length: 15}, (_, number) => {
                if (number === 0) {
                    return {
                        key: `${index}-${number}`,
                        groupName: "收起",
                        color: "red",
                        expand: false,
                        children: [
                            {
                                key: "0555"
                            },
                            {
                                key: "0666"
                            }
                        ]
                    }
                }
                if (number === 2) {
                    return {
                        key: `${index}-${number}`,
                        groupName: "展开",
                        color: "green",
                        expand: true,
                        children: [
                            {
                                key: "2555"
                            },
                            {
                                key: "2666"
                            }
                        ]
                    }
                }
                if (number === 4) {
                    return {
                        key: `${index}-${number}`,
                        groupName: "",
                        expand: true,
                        color: "blue",
                        children: [
                            {
                                key: "4555"
                            },
                            {
                                key: "4666"
                            }
                        ]
                    }
                }
                return {key: `${index}-${number}`}
            })
        }
    } else {
        return {
            key: `${index}`
        }
    }
})
export const TabMenu: React.FC<TabMenuProps> = React.memo((props) => {
    const [menuData, setMenuData] = useState<MenuDataProps[]>(defMenuData)
    const [selectFirstMenu, setSelectFirstMenu] = useState<string>("3")

    const [subMenu, setSubMenu] = useState<MenuChildrenDataProps[]>([])
    const [selectSubMenu, setSelectSubMenu] = useState<string>("")
    useEffect(() => {
        console.log("menuData", menuData)
    }, [])
    const onDragEnd = useMemoizedFn((result) => {
        // console.log("result", result)
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const menuList: MenuDataProps[] = reorder(menuData, result.source.index, result.destination.index)
            setMenuData(menuList)
        }
        if (result.source.droppableId === "droppable2" && result.destination.droppableId === "droppable2") {
            const subMenuList: MenuDataProps[] = reorder(subMenu, result.source.index, result.destination.index)
            setSubMenu(subMenuList)
            const index = menuData.findIndex((ele) => ele.key === selectFirstMenu)
            if (index !== -1) {
                menuData[index].children = subMenuList
                setMenuData(menuData)
            }
        }
    })
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className={styles["tab-menu"]}>
                <Droppable droppableId='droppable1' direction='horizontal'>
                    {(provided, snapshot) => (
                        <div className={styles["tab-menu-first"]} {...provided.droppableProps} ref={provided.innerRef}>
                            {menuData.map((item, index) => (
                                <React.Fragment key={item.key}>
                                    <Draggable key={item.key} draggableId={item.key} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                                className={classNames(styles["tab-menu-first-item"], {
                                                    [styles["tab-menu-first-item-active"]]: item.key === selectFirstMenu
                                                })}
                                                key={item.key}
                                                onClick={() => {
                                                    setSelectFirstMenu(item.key)
                                                    setSubMenu(item.children || [])
                                                    if (item.children && item.children.length > 0) {
                                                        setSelectSubMenu(item.children[0].key)
                                                    }
                                                }}
                                            >
                                                <span>菜单{item.key}</span>
                                                <RemoveIcon />
                                            </div>
                                        )}
                                    </Draggable>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </Droppable>
                <Droppable droppableId='droppable2' direction='horizontal'>
                    {(provided, snapshot) => (
                        <div className={styles["tab-menu-sub"]} {...provided.droppableProps} ref={provided.innerRef}>
                            {subMenu.map((subItem, number) => (
                                <Draggable key={subItem.key} draggableId={subItem.key} index={number}>
                                    {(provided, snapshot) => (
                                        <React.Fragment key={subItem.key}>
                                            {subItem.groupName !== undefined ? (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={getItemStyle(
                                                        snapshot.isDragging,
                                                        provided.draggableProps.style
                                                    )}
                                                >
                                                    <SubTabGroupItem
                                                        item={subItem}
                                                        selectSubMenu={selectSubMenu}
                                                        setSelectSubMenu={setSelectSubMenu}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={getItemStyle(
                                                        snapshot.isDragging,
                                                        provided.draggableProps.style
                                                    )}
                                                    className={classNames(styles["tab-menu-sub-item"], {
                                                        [styles["tab-menu-sub-item-active"]]:
                                                            subItem.key === selectSubMenu
                                                    })}
                                                    key={subItem.key}
                                                    onClick={() => setSelectSubMenu(subItem.key)}
                                                >
                                                    <span>菜单{subItem.key}</span>
                                                    {subItem.key === selectSubMenu && <RemoveIcon />}
                                                </div>
                                            )}
                                        </React.Fragment>
                                    )}
                                </Draggable>
                            ))}
                            <PlusIcon className={styles["plus-icon"]} />
                        </div>
                    )}
                </Droppable>
            </div>
        </DragDropContext>
    )
})
interface SubTabGroupItemProps {
    item: MenuChildrenDataProps
    selectSubMenu: string
    setSelectSubMenu: (s: string) => void
}
const SubTabGroupItem: React.FC<SubTabGroupItemProps> = React.memo((props) => {
    const {selectSubMenu, setSelectSubMenu} = props
    const [item, setItem] = useState(props.item)
    const [groupItems, setGroupItems] = useState<MenuChildrenDataProps[]>(item.children || [])
    const onExpand = useMemoizedFn(() => {
        setItem({...item, expand: !item.expand})
    })
    const onDragEnd = useMemoizedFn((result) => {
        console.log("result", result)
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable3" && result.destination.droppableId === "droppable3") {
            const groupList: MenuDataProps[] = reorder(groupItems, result.source.index, result.destination.index)
            setGroupItems(groupList)
        }
    })
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId='droppable3' direction='horizontal'>
                {(provided, snapshot) => (
                    <div
                        className={classNames(styles["tab-menu-sub-group"], styles[`tab-menu-sub-group-${item.color}`])}
                    >
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={classNames(
                                styles["tab-menu-sub-group-name"],
                                styles[`tab-menu-sub-group-name-${item.color}`],
                                {
                                    [styles["tab-menu-sub-group-name-retract"]]: !item.expand
                                }
                            )}
                            onClick={() => onExpand()}
                        >
                            {item.groupName || ""}
                            {!item.expand && (
                                <div
                                    className={classNames(
                                        styles["tab-menu-sub-group-number"],
                                        styles[`tab-menu-sub-group-number-${item.color}`]
                                    )}
                                >
                                    {groupItems.length || 0}
                                </div>
                            )}
                        </div>
                        {item.expand &&
                            groupItems.map((groupItem, index) => (
                                <Draggable key={groupItem.key} draggableId={groupItem.key} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                            className={classNames(styles["tab-menu-sub-item"], {
                                                [styles["tab-menu-sub-item-dragging"]]: snapshot.isDragging,
                                                [styles["tab-menu-sub-item-active"]]: groupItem.key === selectSubMenu
                                            })}
                                            key={groupItem.key}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectSubMenu(groupItem.key)
                                            }}
                                        >
                                            <span>菜单{groupItem.key}</span>
                                            {groupItem.key === selectSubMenu && <RemoveIcon />}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
})
interface SubTabItemProps {
    item: MenuChildrenDataProps
}
const SubTabItem: React.FC<SubTabItemProps> = React.memo((props) => {
    const {item} = props
    return <div></div>
})
