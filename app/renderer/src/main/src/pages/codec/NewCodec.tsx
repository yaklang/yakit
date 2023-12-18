import React, {useEffect, useRef, useState} from "react"
import {Divider, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useThrottleFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./NewCodec.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDragsortIcon, SolidPlayIcon} from "@/assets/icon/solid"
import {YakEditor} from "@/utils/editors"
import {SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {
    OutlineArrowBigUpIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineBanIcon,
    OutlineClockIcon,
    OutlineDocumentduplicateIcon,
    OutlineImportIcon,
    OutlinePauseIcon,
    OutlineSearchIcon,
    OutlineStorageIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
const {ipcRenderer} = window.require("electron")

interface NewCodecRightEditorBoxProps {
    isExpand: boolean
    setExpand: (v: boolean) => void
}
// codec右边编辑器
export const NewCodecRightEditorBox: React.FC<NewCodecRightEditorBoxProps> = (props) => {
    const {isExpand, setExpand} = props
    const Expand = () => (
        <div
            className={styles["expand-box"]}
            onClick={() => {
                setExpand && setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )
    return (
        <div className={styles["new-codec-editor-box"]}>
            <YakitResizeBox
                isVer={true}
                isShowDefaultLineStyle={false}
                lineDirection='bottom'
                lineStyle={{backgroundColor: "#f0f1f3", height: 4}}
                firstNodeStyle={{padding: 0}}
                secondNodeStyle={{padding: 0}}
                firstNode={
                    <div className={classNames(styles["input-box"], styles["editor-box"])}>
                        <div className={styles["header"]}>
                            <div className={styles["title"]}>Input</div>
                            <div className={styles["extra"]}>
                                <div className={styles["extra-icon"]}>
                                    <OutlineImportIcon />
                                </div>
                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                <div className={styles["clear"]}>清空</div>
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakEditor
                                type='plaintext'
                                noMiniMap={true}
                                value={""}
                                setValue={(content: string) => {
                                    // setEditorValue(content)
                                }}
                                // loading={loading}
                                noWordWrap={true}
                            />
                        </div>
                    </div>
                }
                secondNode={
                    <div className={classNames(styles["output-box"], styles["editor-box"])}>
                        <div className={styles["header"]}>
                            <div className={styles["title"]}>Output</div>
                            <div className={styles["extra"]}>
                                <div className={styles["extra-icon"]}>
                                    <OutlineStorageIcon />
                                </div>
                                <div className={styles["extra-icon"]}>
                                    <OutlineArrowBigUpIcon />
                                </div>
                                <div className={styles["extra-icon"]}>
                                    <OutlineDocumentduplicateIcon />
                                </div>
                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                {Expand()}
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakEditor
                                type='plaintext'
                                readOnly={true}
                                value={""}
                                noMiniMap={true}
                                setValue={(content: string) => {
                                    // setEditorValue(content)
                                }}
                                // loading={loading}
                                noWordWrap={true}
                            />
                        </div>
                    </div>
                }
            />
        </div>
    )
}

interface NewCodecMiddleTypeItemProps {
    title: string
}

export const NewCodecMiddleTypeItem: React.FC<NewCodecMiddleTypeItemProps> = (props) => {
    const {title} = props
    const [itemStatus, setItemStatus] = useState<"run" | "suspend" | "shield">("run")

    // 屏蔽
    const onShieldFun = useMemoizedFn(() => {
        itemStatus === "shield" ? setItemStatus("run") : setItemStatus("shield")
    })

    // 中止
    const onSuspendFun = useMemoizedFn(() => {
        itemStatus === "suspend" ? setItemStatus("run") : setItemStatus("suspend")
    })

    // 删除
    const onDeleteFun = useMemoizedFn(() => {})

    return (
        <div
            className={classNames(styles["new-codec-middle-type-item"], {
                // 运行
                [styles["type-item-run"]]: itemStatus === "run",
                // 中止
                [styles["type-item-suspend"]]: itemStatus === "suspend",
                // 屏蔽
                [styles["type-item-shield"]]: itemStatus === "shield"
            })}
        >
            <div className={styles["type-header"]}>
                <div className={styles["type-title"]}>
                    <div className={styles["drag-icon"]}>
                        <SolidDragsortIcon />
                    </div>
                    <div
                        className={classNames(styles["text"], {
                            [styles["text-default"]]: itemStatus !== "shield",
                            [styles["text-active"]]: itemStatus === "shield"
                        })}
                    >
                        {title}
                    </div>
                </div>
                <div className={styles["type-extra"]}>
                    <div
                        className={classNames(styles["extra-icon"], {
                            [styles["extra-icon-default"]]: itemStatus !== "shield",
                            [styles["extra-icon-active"]]: itemStatus === "shield"
                        })}
                        onClick={onShieldFun}
                    >
                        <OutlineBanIcon />
                    </div>
                    <div
                        className={classNames(styles["extra-icon"], {
                            [styles["extra-icon-default"]]: itemStatus !== "suspend",
                            [styles["extra-icon-active"]]: itemStatus === "suspend"
                        })}
                        onClick={onSuspendFun}
                    >
                        <OutlinePauseIcon />
                    </div>
                    <div className={styles["close-icon"]} onClick={onDeleteFun}>
                        <OutlineXIcon />
                    </div>
                </div>
            </div>
        </div>
    )
}
interface NewCodecMiddleRunListProps {
    rightItems: any
}

const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const index = transform.indexOf(",")
        if (index !== -1) transform = "translate(0px" + transform.substring(index, transform.length)
    }
    return {
        ...draggableStyle,
        transform
    }
}

// codec中间可执行列表
export const NewCodecMiddleRunList: React.FC<NewCodecMiddleRunListProps> = (props) => {
    const {rightItems} = props
    return (
        <div className={styles["new-codec-run-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    编解码顺序<span className={styles["count"]}>0</span>
                </div>
                <div className={styles["extra"]}>
                    <div className={styles["extra-icon"]}>
                        <OutlineStorageIcon />
                    </div>
                    <div className={styles["extra-icon"]}>
                        <OutlineClockIcon />
                    </div>
                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                    <div className={styles["clear"]}>清空</div>
                </div>
            </div>
            <div className={styles["run-list"]}>
                {/* 右边拖放目标 */}
                <Droppable droppableId='right'>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {rightItems.map((item, index) => (
                                <Draggable key={index} draggableId={`right-${index}`} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{
                                                ...getItemStyle(snapshot.isDragging, provided.draggableProps.style)
                                            }}
                                        >
                                            <NewCodecMiddleTypeItem title={item} />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
                {/* <div className={styles["no-data"]}>
                    <YakitEmpty title='请从左侧列表拖入要使用的 Codec 工具' />
                </div> */}
            </div>
            <div className={styles["run-box"]}>
                <YakitCheckbox
                    checked={true}
                    // onChange={(e) =>
                    //     onCheck( e.target.checked)
                    // }
                >
                    自动执行
                </YakitCheckbox>
                <YakitButton size='max' className={styles["run-box-btn"]} icon={<SolidPlayIcon />}>
                    立即执行
                </YakitButton>
            </div>
        </div>
    )
}

interface NewCodecLeftDragListProps {
    leftItems: any
}
// codec左边拖拽列表
export const NewCodecLeftDragList: React.FC<NewCodecLeftDragListProps> = (props) => {
    const {leftItems} = props
    const [fold, setFold] = useState<boolean>(true)
    return (
        <>
            {fold ? (
                <div className={styles["new-codec-drag-list"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>Codec 分类</div>
                        <div className={classNames(styles["extra"], styles["fold-icon"])}>
                            <Tooltip placement='top' title='向左收起'>
                                <SideBarCloseIcon
                                    className={styles["fold-icon"]}
                                    onClick={() => {
                                        setFold(false)
                                    }}
                                />
                            </Tooltip>
                        </div>
                    </div>
                    <div className={styles["search"]}>
                        <YakitInput
                            prefix={
                                <div className={styles["prefix"]}>
                                    <OutlineSearchIcon />
                                </div>
                            }
                            style={{width: "100%"}}
                            placeholder='请输入关键词搜索'
                            value={""}
                            onChange={(e) => {
                                // setDictionariesName(e.target.value)
                            }}
                        />
                    </div>
                    <div className={styles["left-drag-list"]}>
                        {/* 左边拖拽源 */}
                        <Droppable droppableId='left'>
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} style={{width: "50%"}}>
                                    {leftItems.map((item, index) => (
                                        <Draggable key={index} draggableId={`left-${index}`} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{
                                                        padding: 8,
                                                        margin: "0 0 8px 0",
                                                        backgroundColor: "lightblue",
                                                        ...provided.draggableProps.style
                                                    }}
                                                >
                                                    {item}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>
            ) : (
                <div className={classNames(styles["drag-list-hidden"])}>
                    <div className={styles["open-box"]}>
                        <Tooltip placement='right' title='向右展开'>
                            <SideBarOpenIcon
                                className={styles["fold-icon"]}
                                onClick={() => {
                                    setFold(true)
                                }}
                            />
                        </Tooltip>
                    </div>
                </div>
            )}
        </>
    )
}

const initialLeftItems = ["Item 1", "Item 2", "Item 3"]
const initialRightItems = ["Item A", "Item B", "Item C"]
export interface NewCodecProps {}
const NewCodec: React.FC<NewCodecProps> = (props) => {
    // 是否全部展开
    const [isExpand, setExpand] = useState<boolean>(false)
    const [leftItems, setLeftItems] = useState(initialLeftItems)
    const [rightItems, setRightItems] = useState(initialRightItems)
    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result) => {
        const {source, destination} = result

        // 左边向右边拖拽
        if (source.droppableId === "left" && destination && destination.droppableId === "right") {
            const [removed] = leftItems.splice(source.index, 1)
            rightItems.splice(destination.index, 0, removed)
            setLeftItems([...leftItems])
            setRightItems([...rightItems])
        }

        // 右边内部排序
        if (source.droppableId === "right" && destination && destination.droppableId === "right") {
            const [removed] = rightItems.splice(source.index, 1)
            rightItems.splice(destination.index, 0, removed)
            setRightItems([...rightItems])
        }
    })

    /**
     * @description: 计算移动的范围是否在目标范围类
     */
    const onDragUpdate = useThrottleFn(
        (result) => {
            const {index, droppableId} = result.source
            const {combine, destination, draggableId} = result
        },
        {wait: 200}
    ).run
    return (
        <div className={styles["new-codec"]}>
            {!isExpand && (
                <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
                    <NewCodecLeftDragList leftItems={leftItems} />
                    <NewCodecMiddleRunList rightItems={rightItems} />
                </DragDropContext>
            )}
            <NewCodecRightEditorBox isExpand={isExpand} setExpand={setExpand} />
        </div>
    )
}
export default NewCodec
