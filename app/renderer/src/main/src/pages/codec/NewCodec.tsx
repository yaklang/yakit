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
import {SolidDragsortIcon, SolidPlayIcon, SolidStarIcon} from "@/assets/icon/solid"
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
    OutlineStarIcon,
    OutlineStorageIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {DragDropContextResultProps} from "../layout/mainOperatorContent/MainOperatorContentType"
const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse
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

const getMiddleItemStyle = (isDragging, draggableStyle) => {
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
                <Droppable droppableId='right' direction='vertical'>
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
                                                ...getMiddleItemStyle(
                                                    snapshot.isDragging,
                                                    provided.draggableProps.style
                                                )
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

interface NewCodecLeftDragListItemProps {
    node: LeftDataNodeProps[]
    itemIndex: number
}
let lastIsDragging = false
const getLeftItemStyle = (isDragging, draggableStyle) => {
    let transform: string = draggableStyle["transform"] || ""
    // console.log("transform---",transform,isDragging);
    if (isDragging) {
        // 使用正则表达式匹配 translate 函数中的两个参数
        const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
        if (match) {
            // 提取匹配到的两个值，并将它们转换为数字
            const [value1, value2] = match.slice(1).map(Number)
            // 判断值是否小于 0
            if (value1 < 0) {
                // 修改值为 0
                const modifiedString = transform.replace(
                    /translate\((-?\d+)px, (-?\d+)px\)/,
                    `translate(0px, ${value2}px)`
                )
                transform = modifiedString
            }
            // 为解决列表最后一个元素超出时,样式溢出
            if(!lastIsDragging&&value1===0&&value2<-200){
                transform = `translate(0px, 0px)`
            }
        }
    }
    lastIsDragging = isDragging
    return {
        ...draggableStyle,
        transform
    }
}

// 左边拖拽源
export const NewCodecLeftDragListItem: React.FC<NewCodecLeftDragListItemProps> = (props) => {
    const {node, itemIndex} = props

    const dragListItemDom = useMemoizedFn((item) => (
        <div className={styles["drag-list-item"]}>
            <div className={styles["title"]}>{item.title}</div>
            <div className={styles["extra"]}></div>
            {/* <div className={classNames(styles['star-icon'],styles['star-icon-default'])} onClick={(e) => {
                e.stopPropagation()
            }}>
                <OutlineStarIcon/>
            </div> */}
            <div
                className={classNames(styles["star-icon"], styles["star-icon-active"])}
                onClick={(e) => {
                    e.stopPropagation()
                }}
            >
                <SolidStarIcon />
            </div>
        </div>
    ))

    return (
        <Droppable
            droppableId='left'
            direction='vertical'
            isDropDisabled={true}
            renderClone={(provided, snapshot, rubric) => {
                const item: LeftDataNodeProps[] =
                    node.filter((item) => `left-${item.title}` === rubric.draggableId) || []
                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                            ...getLeftItemStyle(snapshot.isDragging, provided.draggableProps.style)
                        }}
                    >
                        <>
                            {item.length > 0 && (
                                <div className={styles["drag-list-item-clone"]}>
                                    <div className={styles["title"]}>{item[0].title}</div>
                                    <div className={styles["extra"]}></div>
                                    {/* <div className={classNames(styles['star-icon'],styles['star-icon-default'])}>
                                        <OutlineStarIcon/>
                                    </div> */}
                                    <div
                                        className={classNames(styles["star-icon"], styles["star-icon-active"])}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        <SolidStarIcon />
                                    </div>
                                </div>
                            )}
                        </>
                    </div>
                )
            }}
        >
            {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                    {node.map((item, index) => {
                        return (
                            <Draggable
                                key={itemIndex * 10 + index}
                                draggableId={`left-${item.title}`}
                                index={itemIndex * 10 + index}
                                shouldCloneOnDrag={false}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                            ...getLeftItemStyle(snapshot.isDragging, provided.draggableProps.style)
                                        }}
                                    >
                                        {dragListItemDom(item)}
                                    </div>
                                )}
                            </Draggable>
                        )
                    })}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}

interface NewCodecLeftDragListProps {
    leftData: LeftDataProps[]
}

interface LeftDataNodeProps {
    title: string
}

interface LeftDataProps {
    title: string
    node: LeftDataNodeProps[]
}

// codec左边拖拽列表
export const NewCodecLeftDragList: React.FC<NewCodecLeftDragListProps> = (props) => {
    const {leftData} = props
    const [fold, setFold] = useState<boolean>(true)
    const [activeKey, setActiveKey] = useState<string[]>([])

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
                        <YakitSpin spinning={false}>
                            {/* 左边列表 */}
                            <YakitCollapse
                                expandIcon={() => <></>}
                                accordion={true}
                                activeKey={activeKey}
                                onChange={(key) => {
                                    const arr = key as string[]
                                    setActiveKey(arr)
                                }}
                                className={styles["left-drag-list-collapse"]}
                            >
                                {leftData.map((item, index) => {
                                    return (
                                        <YakitPanel
                                            header={
                                                (activeKey || []).includes(item.title) ? (
                                                    <div className={styles["panel-active-title"]}>{item.title}</div>
                                                ) : (
                                                    item.title
                                                )
                                            }
                                            key={item.title}
                                            extra={
                                                item.title === "我收藏的工具" ? (
                                                    <>
                                                        {/* <div className={classNames(styles['star-icon'],styles['star-icon-default'])} onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}>
                                                    <OutlineStarIcon/>
                                                </div> */}
                                                        <div
                                                            className={classNames(
                                                                styles["star-icon"],
                                                                styles["star-icon-active"]
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                            }}
                                                        >
                                                            <SolidStarIcon />
                                                        </div>
                                                    </>
                                                ) : null
                                            }
                                        >
                                            {item.node.length > 0 && (
                                                <NewCodecLeftDragListItem
                                                    node={item.node}
                                                    itemIndex={index}
                                                />
                                            )}
                                        </YakitPanel>
                                    )
                                })}
                                <div className={styles["to-end"]}>已经到底啦～</div>
                            </YakitCollapse>
                        </YakitSpin>
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
    const [leftData, setLeftData] = useState<LeftDataProps[]>([
        {
            title: "我收藏的工具",
            node: []
        },
        {
            title: "对称加解密",
            node: [{title: "SM4加密"}, {title: "SM4解密"}, {title: "AES加密"}, {title: "AES解密"}]
        },
        {
            title: "Java",
            node: [{title: "反序列化"}, {title: "序列化"}]
        },
        {
            title: "解码",
            node: [
                {title: "Base64 解码"},
                {title: "HTML 解码"},
                {title: "URL解码"},
                {title: "十六进制解码"},
                {title: "Unicode 中文解码"}
            ]
        },
        {
            title: "编码",
            node: [
                {title: "Base64 编码"},
                {title: "HTML 编码"},
                {title: "URL编码"},
                {title: "URL路径编码"},
                {title: "十六进制编码"},
                {title: "Unicode 中文编码"}
            ]
        },
        {
            title: "hash",
            node: [{title: "MD5"}, {title: "SM3"}, {title: "Sha1"}, {title: "Sha2"}]
        },
        {
            title: "美化",
            node: [{title: "JSON"}, {title: "HTTP数据包"}]
        },
        {
            title: "Yaklang",
            node: [{title: "Codec插件"}, {title: "热加载临时脚本"}]
        },
        {
            title: "其他",
            node: [
                {title: "解析HTTP参数"},
                {title: "从URL加载数据包"},
                {title: "数据包转Curl命令"},
                {title: "FuzzTag(模糊测试)"}
            ]
        }
    ])
    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result: DragDropContextResultProps) => {
        const {source, destination} = result
        // console.log("onDragEnd", source, destination, result)

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

    
    const onBeforeCapture = useMemoizedFn((result: DragDropContextResultProps) => {})


    const onDragStart = useMemoizedFn((result: DragDropContextResultProps) => {
        if (!result.source) return
        // console.log("onDragStart---", result)
    })
    return (
        <div className={styles["new-codec"]}>
            {!isExpand && (
                <DragDropContext
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                    onDragUpdate={onDragUpdate}
                    onBeforeCapture={onBeforeCapture}
                >
                    <NewCodecLeftDragList leftData={leftData}/>
                    <NewCodecMiddleRunList rightItems={rightItems} />
                </DragDropContext>
            )}
            <NewCodecRightEditorBox isExpand={isExpand} setExpand={setExpand} />
        </div>
    )
}
export default NewCodec
