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
import {SolidChevrondownIcon, SolidChevronrightIcon, SolidDatabaseIcon, SolidDocumenttextIcon, SolidDotsverticalIcon, SolidDragsortIcon, SolidFolderopenIcon} from "@/assets/icon/solid"
const {ipcRenderer} = window.require("electron")

export interface NewPayloadTableProps {}
export const NewPayloadTable: React.FC<NewPayloadTableProps> = (props) => {
    return <div className={styles["new-payload-table"]}></div>
}
export interface DragDataProps {}
export interface NewPayloadListProps {}

export const NewPayloadList: React.FC<NewPayloadListProps> = (props) => {
    const [destinationDrag, setDestinationDrag] = useState<string>("droppable-payload")

    // 示例数据，可以根据实际需求进行修改
    const initialData = [
        {
            type: "folders",
            name: "文件夹1",
            node: [
                {
                    type: "file",
                    name: "文件1-1"
                },
                {
                    type: "file",
                    name: "文件1-2"
                }
            ]
        },
        {
            type: "file",
            name: "文件2-2"
        },
        {
            type: "folders",
            name: "文件夹3",
            node: [
                {
                    type: "file",
                    name: "文件3-1"
                },
                {
                    type: "file",
                    name: "文件3-2"
                }
            ]
        }
    ]

    const [data, setData] = useState(initialData)

    // 拖放结束时的回调函数
    const onDragEnd = (result) => {
        const {destination, source, draggableId, type} = result

        if (!destination) {
            return
        }
        console.log("destination, source, draggableId, type", destination, source, draggableId, type)
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
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId='droppable' type='ITEM'>
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                    {data.map((item, index) => (
                                        <Draggable key={index} draggableId={`draggable-${index}`} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                >
                                                    {/* 渲染你的文件夹或文件组件 */}
                                                    {/* 使用 item.type 来区分文件夹和文件 */}
                                                    {item.type === "folders" ? (
                                                        // 渲染文件夹组件
                                                        <FolderComponent folder={item} />
                                                    ) : (
                                                        // 渲染文件组件
                                                        <FileComponent file={item} fileOutside={true} />
                                                    )}
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
            </div>
        </div>
    )
}
interface FolderComponentProps {
    folder: any
}
export const FolderComponent: React.FC<FolderComponentProps> = ({folder}) => {
    return (
        <>
            <div className={styles["folder"]}>
                <div className={styles["folder-header"]}>
                    <div className={styles["is-fold-icon"]}>
                        {/* <SolidChevronrightIcon/> */}
                        <SolidChevrondownIcon/>
                    </div>
                    <div className={styles["folder-icon"]}>
                        <SolidFolderopenIcon/>
                    </div>
                    <div className={styles["folder-name"]}>{folder.name}</div>
                </div>
                <div className={styles["extra"]}>
                    <div className={styles["file-count"]}>10</div>
                    <div className={styles["extra-icon"]}>
                        <SolidDotsverticalIcon />
                    </div>
                </div>
            </div>

            <Droppable droppableId={`droppable-${folder.name}`} type='ITEM'>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                        {folder.node.map((file, index) => (
                            <Draggable key={index} draggableId={`draggable-${folder.name}-${index}`} index={index}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                    >
                                        {/* 渲染文件组件 */}
                                        <FileComponent file={file} fileInside={true} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </>
    )
}

interface FileComponentProps {
    file: any
    fileOutside?: boolean
    fileInside?: boolean
}

export const FileComponent: React.FC<FileComponentProps> = (props) => {
    const {file, fileOutside, fileInside} = props
    return (
        <div
            className={classNames(styles["file"], {
                [styles["file-outside"]]: fileOutside,
                [styles["file-inside"]]: fileInside
            })}
        >
            <div className={styles["file-header"]}>
                <div className={styles["drag-icon"]}>
                    <SolidDragsortIcon />
                </div>
                <div className={styles["file-icon"]}>
                    <SolidDatabaseIcon />
                    {/* <SolidDocumenttextIcon/> */}
                </div>
                <div className={styles["file-name"]}>{file.name}</div>
            </div>
            <div className={styles["extra"]}>
                <div className={styles["file-count"]}>10</div>
                <div className={styles["extra-icon"]}>
                    <SolidDotsverticalIcon />
                </div>
            </div>
        </div>
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
