import React, {useEffect, useRef, useState} from "react"
import {Input, Tooltip} from "antd"
import {MenuOutlined} from "@ant-design/icons"
import {useGetState, useThrottleFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./NewPayload.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineClouddownloadIcon, OutlineFolderaddIcon, OutlinePlusIcon} from "@/assets/icon/outline"
import {OutlineAddPayloadIcon} from "./icon"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
const {ipcRenderer} = window.require("electron")

export interface NewPayloadTableProps {}
export const NewPayloadTable: React.FC<NewPayloadTableProps> = (props) => {
    return <div className={styles["new-payload-table"]}></div>
}
export interface DragDataProps {}
export interface NewPayloadListProps {}
const defaultChapter = [
    {
        name: "文件夹",
        id: "1",
        node_list: [
            {
                name: "护网专用工具",
                id: "node_id"
            }
        ]
    },
    {
        name: "文件夹1",
        id: "2"
    }
]
export const NewPayloadList: React.FC<NewPayloadListProps> = (props) => {
    const [nodeList, setNodeList] = useState(defaultChapter)
    const [destinationDrag, setDestinationDrag] = useState<string>("droppable-payload")
    // 是否在拖拽中
    const isDragging = useRef<boolean>(false)

    const reorder = (list: any[], startIndex: number, endIndex: number): any[] => {
        const result = Array.from(list)
        const [removed] = result.splice(startIndex, 1)
        result.splice(endIndex, 0, removed)

        return result
    }

    // 拖放完成后的回调函数
    const onDragEnd = (result) => {
        const {source, destination, draggableId, type} = result
        console.log("source", source, "destination", destination, "draggableId", draggableId, "type", type)
        if (!destination) {
            return
        }
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return
        }
        if (result.type === "COLUMN") {
            const ordered = reorder(
                // this.state.ordered,
                nodeList,
                source.index,
                destination.index
            )
            setNodeList([...ordered])
            return
        }
        if (result.type === "CHAPT") {
            const sourceArr = nodeList.filter((n) => n.name == source.droppableId)[0].node_list
            const desArr = nodeList.filter((n) => n.name === destination.droppableId)[0].node_list
            console.log(sourceArr, desArr)
            if (sourceArr && desArr) {
                let moveItem = sourceArr.splice(source.index, 1)[0]
                desArr.splice(destination.index, 0, moveItem)
                console.log(sourceArr, desArr)
            }
            return
        }
    }

    /**
     * @description: 计算移动的范围是否在目标范围类destinationDrag
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            if (!result.destination) {
                setDestinationDrag("")
                return
            }
            if (result.destination.droppableId !== destinationDrag) setDestinationDrag(result.destination.droppableId)
        },
        {wait: 200}
    ).run
    return (
        <div className={styles["new-payload-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>Payload 字典管理</div>
                    <div className={styles["count"]}>8</div>
                </div>
                <div className={styles["extra"]}>
                    <YakitDropdownMenu
                        menu={{
                            data: [
                                {
                                    key: "createDictionaries",
                                    label: (
                                        <div className={styles["extra-menu"]}>
                                            <OutlineAddPayloadIcon />
                                            <div className={styles["menu-name"]}>新建字典</div>
                                        </div>
                                    )
                                },
                                {
                                    key: "createFolder",
                                    label: (
                                        <div className={styles["extra-menu"]}>
                                            <OutlineFolderaddIcon />
                                            <div className={styles["menu-name"]}>新建文件夹</div>
                                        </div>
                                    )
                                }
                            ],
                            onClick: ({key}) => {
                                switch (key) {
                                    case "createDictionaries":
                                        break
                                    case "createFolder":
                                        break
                                    default:
                                        break
                                }
                            }
                        }}
                        dropdown={{
                            trigger: ["click"],
                            placement: "bottomRight"
                        }}
                    >
                        <YakitButton type='secondary2' icon={<OutlinePlusIcon />} />
                    </YakitDropdownMenu>
                </div>
            </div>
            <div className={styles["content"]}>
                <div className={styles["drag-list"]}>
                    <DragDropContext
                        onDragEnd={onDragEnd}
                        onDragUpdate={onDragUpdate}
                        onBeforeDragStart={() => {
                            isDragging.current = true
                        }}
                    >
                        <Droppable droppableId='droppable-payload'>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {nodeList.map((node, index) => {
                                        return <Column key={node?.name} index={index} title={node?.name} node={node} />
                                    })}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </div>
        </div>
    )
}
interface ColumnProps {
    title: string
    index: number
    node: any
}
export const Column: React.FC<ColumnProps> = (props) => {
    const {title, index, node} = props
    return (
        <Draggable draggableId={title} index={index} key={title}>
            {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps}>
                    <div
                        // isDragging={snapshot.isDragging}
                        {...provided.dragHandleProps}
                        style={{
                            marginBottom: "8px",
                            marginTop: "8px",
                            fontSize: "16px"
                        }}
                    >
                        {index + 1} {title}
                        {/* {index !== 0 && (
                <CloseOutlined
                  color="#ccc"
                  size={10}
                  onClick={() => deleChapterBtnClick(index, node)}
                />
              )} */}
                    </div>
                    <ChapterList preIndex={index + 1} listId={title} listType='CHAPT' list={node.node_list} />
                </div>
            )}
        </Draggable>
    )
}
interface ChapterListProps {
    listId: string
    preIndex: number
    listType: string
    list: any
}
export const ChapterList: React.FC<ChapterListProps> = (props) => {
    const {list, listId, listType, preIndex} = props
    return (
        <Droppable droppableId={listId} type={listType}>
            {(dropProvided, dropSnapshot) => (
                <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                    {list?.map((li, index) => (
                        <Draggable key={li.id} draggableId={li.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                                <>
                                    <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        key={li.id}
                                        // isDragging={dragSnapshot.isDragging}
                                    >
                                        <div {...dragProvided.dragHandleProps} style={{marginBottom: 13}}>
                                            <span>
                                                {preIndex}.{index + 1} {li.name}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </Draggable>
                    ))}
                    {dropProvided.placeholder}
                </div>
            )}
        </Droppable>
    )
}

export interface NewPayloadProps {}
export const NewPayload: React.FC<NewPayloadProps> = (props) => {
    return (
        <div className={styles["new-payload"]}>
            <div className={styles["payload-list-box"]}>
                <NewPayloadList />
            </div>
            <div className={styles["no-data"]}>
                <YakitEmpty
                    title='暂无 Payload 字典'
                    description='可一键获取官方内置字典，或新建字典'
                    children={
                        <>
                            <YakitButton style={{marginRight: 8}} type='outline1' icon={<OutlineClouddownloadIcon />}>
                                一键获取
                            </YakitButton>
                            <YakitButton icon={<OutlineAddPayloadIcon />}>新建字典</YakitButton>
                        </>
                    }
                />
            </div>
        </div>
    )
}
