import React, {useRef, useState} from "react"
import {ExtraSettingProps, FuzzerSequenceProps, SequenceItemProps, SequenceProps} from "./FuzzerSequenceType"
import styles from "./FuzzerSequence.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDragsortIcon, SolidPlayIcon, SolidPlusIcon, SolidStopIcon} from "@/assets/icon/solid"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {useCreation, useHover, useMemoizedFn} from "ahooks"
import {OutlineCogIcon, OutlinePlussmIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {Divider, Form} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import classNames from "classnames"
import {LabelNodeItem} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {yakitNotify} from "@/utils/notification"

// 拖拽功能所需
const getItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    if (isDragging) {
        const number = transform.indexOf("(")
        const index = transform.indexOf(",")
        if (index !== -1 && number !== -1) {
            const pre = transform.substring(0, number + 1)
            const after = transform.substring(index + 1, transform.length)
            transform = pre + "0px," + after
        }
    }
    return {
        ...draggableStyle,
        transform
    }
}

/**数组元素交换位置 */
const reorder = (arr, index1, index2) => {
    // 检查索引是否有效
    if (index1 < 0 || index1 >= arr.length || index2 < 0 || index2 >= arr.length) {
        // console.error("索引无效")
        return
    }

    // 交换元素位置
    var temp = arr[index1]
    arr[index1] = arr[index2]
    arr[index2] = temp

    return arr
}

const groupPageList = [
    {
        id: "1",
        pageId: "1",
        pageName: "Web Fuzzer-[1]",
        inheritCookies: false,
        inheritVariables: false,
        pageParams: {
            advancedConfigValue: {},
            request: ""
        }
    },
    {
        id: "2",
        pageId: "2",
        pageName: "Web Fuzzer-[2]",
        inheritCookies: false,
        inheritVariables: false,
        pageParams: {
            advancedConfigValue: {},
            request: ""
        }
    }
]
const isEmptySequence = (list: SequenceProps[]) => {
    return list.findIndex((ele) => !ele.pageId) !== -1
}
const FuzzerSequence: React.FC<FuzzerSequenceProps> = React.memo((props) => {
    const [loading, setLoading] = useState<boolean>(false)

    const [sequenceList, setSequenceList] = useState<SequenceProps[]>([...groupPageList])
    const onDragEnd = useMemoizedFn((result) => {
        if (!result.destination) {
            return
        }
        if (result.source.droppableId === "droppable1" && result.destination.droppableId === "droppable1") {
            const newSequenceList: SequenceProps[] = reorder(
                sequenceList,
                result.source.index,
                result.destination.index
            )
            setSequenceList(newSequenceList)
        }
    })
    const onUpdateItem = useMemoizedFn((item: SequenceProps, index: number) => {
        sequenceList[index] = {...item}
        setSequenceList([...sequenceList])
    })
    const onStartExecution = useMemoizedFn(() => {
        setLoading(true)
        // setTimeout(() => {
        //     setLoading(false)
        // }, 2000)
    })
    const onForcedStop = useMemoizedFn(() => {
        setLoading(false)
    })
    const onAddSequenceNode = useMemoizedFn(() => {
        if (isEmptySequence(sequenceList)) {
            yakitNotify("error", "已有空节点，请配置后再添加")
            return
        }
        const addItem: SequenceProps = {
            id: `${sequenceList.length + 1}`,
            pageId: "",
            pageName: "",
            inheritCookies: false,
            inheritVariables: false,
            pageParams: {
                advancedConfigValue: {},
                request: ""
            }
        }
        setSequenceList([...sequenceList, addItem])
    })
    const onApplyOtherNodes = useMemoizedFn((extraSetting: ExtraSettingProps) => {
        const newSequenceList = sequenceList.map((item) => ({
            ...item,
            ...extraSetting
        }))
        setSequenceList([...newSequenceList])
    })
    const onRemoveNode = useMemoizedFn((index: number) => {
        if (sequenceList.length <= 1) {
            const newItem: SequenceProps = {
                id: "1",
                pageId: "",
                pageName: "",
                inheritCookies: false,
                inheritVariables: false,
                pageParams: {
                    advancedConfigValue: {},
                    request: ""
                }
            }
            setSequenceList([newItem])
        } else {
            sequenceList.splice(index, 1)
            setSequenceList([...sequenceList])
        }
    })
    console.log("sequenceList", sequenceList)
    return (
        <div className={styles["fuzzer-sequence"]}>
            <div className={styles["fuzzer-sequence-left"]}>
                <div className={styles["fuzzer-sequence-left-heard"]}>
                    <span>序列配置</span>
                    <div className={styles["fuzzer-sequence-left-heard-extra"]}>
                        <YakitButton type='text' disabled={loading} onClick={() => onAddSequenceNode()}>
                            添加节点
                            <SolidPlusIcon className={styles["plus-icon"]} />
                        </YakitButton>
                        {loading ? (
                            <YakitButton
                                onClick={() => onForcedStop()}
                                icon={<SolidStopIcon className={styles["stop-icon"]} />}
                                className='button-primary-danger'
                                danger={true}
                                type={"primary"}
                            >
                                强制停止
                            </YakitButton>
                        ) : (
                            <YakitButton
                                onClick={() => onStartExecution()}
                                icon={<SolidPlayIcon className={styles["play-icon"]} />}
                                type={"primary"}
                            >
                                开始执行
                            </YakitButton>
                        )}
                    </div>
                </div>
                <div className={styles["fuzzer-sequence-left-body"]}>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId='droppable1'>
                            {(provided, snapshot) => {
                                return (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={styles["fuzzer-sequence-list"]}
                                    >
                                        {sequenceList.map((sequenceItem, index) => (
                                            <Draggable
                                                key={sequenceItem.id}
                                                draggableId={sequenceItem.id}
                                                index={index}
                                                isDragDisabled={loading}
                                            >
                                                {(providedItem, snapshotItem) => (
                                                    <div
                                                        ref={providedItem.innerRef}
                                                        {...providedItem.draggableProps}
                                                        {...providedItem.dragHandleProps}
                                                        style={getItemStyle(
                                                            snapshotItem.isDragging,
                                                            providedItem.draggableProps.style
                                                        )}
                                                    >
                                                        <SequenceItem
                                                            pageNodeList={groupPageList}
                                                            item={sequenceItem}
                                                            index={index}
                                                            disabled={loading}
                                                            isDragging={snapshotItem.isDragging}
                                                            onApplyOtherNodes={onApplyOtherNodes}
                                                            onUpdateItem={(item) => onUpdateItem(item, index)}
                                                            onRemove={() => onRemoveNode(index)}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )
                            }}
                        </Droppable>
                    </DragDropContext>
                    <div className={styles["plus-sm-icon-body"]}>
                        <OutlinePlussmIcon className={styles["plus-sm-icon"]} onClick={() => onAddSequenceNode()} />
                    </div>
                    <div className={styles["to-end"]}>已经到底啦～</div>
                </div>
            </div>
        </div>
    )
})

export default FuzzerSequence

const SequenceItem: React.FC<SequenceItemProps> = React.memo((props) => {
    const {item, pageNodeList, index, disabled, isDragging, onUpdateItem, onApplyOtherNodes, onRemove} = props
    const [visible, setVisible] = useState<boolean>(false)

    const selectRef = useRef(null)
    const isHovering = useHover(selectRef)

    const options = useCreation(() => {
        return pageNodeList.map((ele) => ({
            value: ele.pageId,
            label: ele.pageName
        }))
    }, [pageNodeList])
    return (
        <div className={styles["fuzzer-sequence-list-item-body"]}>
            <div
                className={classNames(styles["fuzzer-sequence-list-item"], {
                    [styles["fuzzer-sequence-list-item-hover"]]: visible,
                    [styles["fuzzer-sequence-list-item-hover-none"]]: disabled || isHovering,
                    [styles["fuzzer-sequence-list-item-disabled"]]: disabled,
                    [styles["fuzzer-sequence-list-item-isDragging"]]: isDragging
                })}
            >
                <div className={styles["fuzzer-sequence-list-item-heard"]}>
                    <div className={styles["fuzzer-sequence-list-item-heard-title"]}>
                        <SolidDragsortIcon
                            className={classNames(styles["drag-sort-icon"], {
                                [styles["drag-sort-disabled-icon"]]: disabled
                            })}
                        />
                        Step [{index}]
                    </div>
                    <div className={styles["fuzzer-sequence-list-item-heard-extra"]}>
                        <OutlineTrashIcon
                            className={classNames(styles["trash-icon"], {
                                [styles["item-disabled-icon"]]: disabled
                            })}
                            onClick={() => onRemove(item)}
                        />
                        {index > 0 && (
                            <>
                                <Divider type='vertical' style={{margin: 0}} />
                                <YakitPopover
                                    title={
                                        <div className={styles["cog-popover-heard"]}>
                                            <span className={styles["cog-popover-heard-title"]}>节点配置</span>
                                            <span
                                                className={styles["cog-popover-heard-extra"]}
                                                onClick={() =>
                                                    onApplyOtherNodes({
                                                        inheritVariables: item.inheritVariables,
                                                        inheritCookies: item.inheritCookies
                                                    })
                                                }
                                            >
                                                应用到其他节点
                                            </span>
                                        </div>
                                    }
                                    content={
                                        <div className={styles["cog-popover-content"]}>
                                            <LabelNodeItem
                                                label='继承变量'
                                                labelClassName={styles["cog-popover-content-item"]}
                                            >
                                                <YakitSwitch
                                                    checked={item.inheritVariables}
                                                    onChange={(checked) =>
                                                        onUpdateItem({...item, inheritVariables: checked})
                                                    }
                                                />
                                            </LabelNodeItem>
                                            <LabelNodeItem
                                                label='继承 Cookie'
                                                labelClassName={styles["cog-popover-content-item"]}
                                            >
                                                <YakitSwitch
                                                    checked={item.inheritCookies}
                                                    onChange={(checked) =>
                                                        onUpdateItem({...item, inheritCookies: checked})
                                                    }
                                                />
                                            </LabelNodeItem>
                                        </div>
                                    }
                                    visible={visible}
                                    onVisibleChange={(v) => {
                                        if (disabled) return
                                        setVisible(v)
                                    }}
                                    overlayClassName={styles["cog-popover"]}
                                >
                                    <OutlineCogIcon
                                        className={classNames(styles["cog-icon"], {
                                            [styles["cog-icon-hover"]]: visible,
                                            [styles["item-disabled-icon"]]: disabled
                                        })}
                                    />
                                </YakitPopover>
                            </>
                        )}
                    </div>
                </div>
                <div ref={selectRef}>
                    <YakitSelect
                        value={item.pageId}
                        labelInValue={true}
                        options={options}
                        onChange={(v) => {
                            onUpdateItem({...item, pageId: v.value, pageName: v.label})
                        }}
                        getPopupContainer={(dom) => dom}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    )
})
