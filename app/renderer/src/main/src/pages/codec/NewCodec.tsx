import React, {useEffect, useRef, useState} from "react"
import {Divider, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useThrottleFn, useUpdateEffect, useDebounceEffect} from "ahooks"
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
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {
    DragDropContext,
    Droppable,
    Draggable,
    BeforeCapture,
    DropResult,
    ResponderProvided,
    DragStart,
    DragUpdate
} from "@hello-pangea/dnd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {v4 as uuidv4} from "uuid"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {NewCodecCheckUI, NewCodecEditor, NewCodecInputUI, NewCodecSelectUI} from "./NewCodecUIStore"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

const SaveCodecMethods = "SaveCodecMethods"

interface NewCodecRightEditorBoxProps {
    isExpand: boolean
    setExpand: (v: boolean) => void
    inputEditor: string
    setInputEditor: (v: string) => void
    outputEditor: string
    setOutputEditor: (v: string) => void
}
// codec右边编辑器
export const NewCodecRightEditorBox: React.FC<NewCodecRightEditorBoxProps> = (props) => {
    const {isExpand, setExpand, inputEditor, setInputEditor, outputEditor, setOutputEditor} = props
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

    const onClear = useMemoizedFn(() => {
        setInputEditor("")
    })

    const onReplace = useMemoizedFn(() => {
        setInputEditor(outputEditor)
    })

    const onCopy = useMemoizedFn(() => {
        ipcRenderer.invoke("set-copy-clipboard", outputEditor)
        success("复制成功")
    })
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
                                <Tooltip title={"导入"}>
                                    <div className={styles["extra-icon"]}>
                                        <OutlineImportIcon />
                                    </div>
                                </Tooltip>
                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                <div className={styles["clear"]} onClick={onClear}>
                                    清空
                                </div>
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakEditor
                                noMiniMap={true}
                                value={inputEditor}
                                setValue={(content: string) => {
                                    setInputEditor(content)
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
                                <Tooltip title={"保存"}>
                                    <div className={styles["extra-icon"]}>
                                        <OutlineStorageIcon />
                                    </div>
                                </Tooltip>
                                <Tooltip title={"将Output替换至Input"}>
                                    <div className={styles["extra-icon"]} onClick={onReplace}>
                                        <OutlineArrowBigUpIcon />
                                    </div>
                                </Tooltip>
                                <Tooltip title={"复制"}>
                                    <div className={styles["extra-icon"]} onClick={onCopy}>
                                        <OutlineDocumentduplicateIcon />
                                    </div>
                                </Tooltip>

                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                {Expand()}
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakEditor
                                readOnly={true}
                                value={outputEditor}
                                noMiniMap={true}
                                setValue={(content: string) => {
                                    setOutputEditor(content)
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
    data: RightItemsProps
    outerKey: string
    rightItems: RightItemsProps[]
    setRightItems: (v: RightItemsProps[]) => void
}

export const NewCodecMiddleTypeItem: React.FC<NewCodecMiddleTypeItemProps> = (props) => {
    const {data, outerKey, rightItems, setRightItems} = props

    const {title, node} = data
    const [itemStatus, setItemStatus] = useState<"run" | "suspend" | "shield">()

    useEffect(() => {
        const itemArr = rightItems.filter((item) => item.key === outerKey)
        if (itemArr.length > 0) {
            setItemStatus(itemArr[0].status || "run")
        }
    }, [rightItems, outerKey])
    // 屏蔽
    const onShieldFun = useMemoizedFn(() => {
        const newRightItems = rightItems.map((item) => {
            if (item.key === outerKey) {
                item.status = itemStatus === "shield" ? "run" : "shield"
                return item
            }
            return item
        })
        setRightItems(newRightItems)
    })

    // 中止
    const onSuspendFun = useMemoizedFn(() => {
        const newRightItems = rightItems.map((item) => {
            if (item.key === outerKey) {
                item.status = itemStatus === "suspend" ? "run" : "suspend"
                return item
            }
            return item
        })
        setRightItems(newRightItems)
    })

    // 删除
    const onDeleteFun = useMemoizedFn(() => {
        const newRightItems = rightItems.filter((item) => item.key !== outerKey)
        setRightItems(newRightItems)
    })

    // 更改控件值
    const setValueByUI = useMemoizedFn((val: any, index: number) => {
        console.log("setValueByUI---", val)
        const itemArr = rightItems.filter((item) => item.key === outerKey)
        const newNode = itemArr[0]?.node
        if (Array.isArray(newNode)) {
            if (newNode[index].type !== "flex") {
                const initNode = newNode as RightItemsTypeProps[]
                initNode[index].value = val
                const newRightItems = rightItems.map((item) => {
                    if (item.key === outerKey) {
                        item.node = initNode
                        return item
                    }
                    return item
                })
                setRightItems(newRightItems)
            }
        }
    })

    // 控件
    const onShowUI = useMemoizedFn((item: RightItemsTypeProps, index: number) => {
        switch (item.type) {
            case "input":
                // 输入框模块
                return (
                    <NewCodecInputUI
                        title={item.title}
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        defaultValue={item.defaultValue}
                        value={item.value}
                        onChange={(e) => setValueByUI(e.target.value, index)}
                    />
                )
            case "checkbox":
                // 多选框模块
                return (
                    <NewCodecCheckUI
                        disabled={itemStatus === "shield" || item.disabled}
                        options={item.checkArr}
                        value={item.value}
                        onChange={(checkedValues: CheckboxValueType[]) => setValueByUI(checkedValues, index)}
                    />
                )
            case "select":
                // 下拉框模块
                return (
                    <NewCodecSelectUI
                        disabled={itemStatus === "shield" || item.disabled}
                        require={item.require}
                        title={item.title}
                        showSearch={item.showSearch}
                        options={item.selectArr}
                        value={item.value}
                        isPlugin={item.isPlugin}
                        onSelect={(val) => setValueByUI(val, index)}
                    />
                )
            case "editor":
                // 编辑器模块
                return (
                    <NewCodecEditor
                        disabled={itemStatus === "shield" || item.disabled}
                        title={item.title}
                        require={item.require}
                        value={item.value}
                        onChange={(val) => setValueByUI(val, index)}
                    />
                )
            default:
                return <></>
        }
    })
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
            {node?.map((item, index) => {
                switch (item.type) {
                    case "flex":
                        // 左右布局
                        return (
                            <div style={{display: "flex", flexDirection: "row", gap: 8}}>
                                <div style={{flex: item.leftFlex || 3}}>
                                    {/* 左 */}
                                    {onShowUI(item.leftNode, index)}
                                </div>
                                <div style={{flex: item.rightFlex || 2}}>
                                    {/* 右 */}
                                    {onShowUI(item.rightNode, index)}
                                </div>
                            </div>
                        )
                    default:
                        return <>{onShowUI(item, index)}</>
                }
            })}
        </div>
    )
}

interface CodecRunListHistoryStoreProps {
    popoverVisible: boolean
    setPopoverVisible: (v: boolean) => void
    onSelect: (v: SaveObjProps) => void
}
const CodecRunListHistory = "CodecRunListHistory"
export const CodecRunListHistoryStore: React.FC<CodecRunListHistoryStoreProps> = React.memo((props) => {
    const {popoverVisible, setPopoverVisible, onSelect} = props
    const [mitmSaveData, setMitmSaveData] = useState<SaveObjProps[]>([])
    useEffect(() => {
        onMitmSaveFilter()
    }, [popoverVisible])
    const onMitmSaveFilter = useMemoizedFn(() => {
        getRemoteValue(CodecRunListHistory).then((data) => {
            if (!data) {
                setMitmSaveData([])
                return
            }
            try {
                const cacheData: SaveObjProps[] = JSON.parse(data)
                setMitmSaveData(cacheData)
            } catch (error) {}
        })
    })

    const removeItem = useMemoizedFn((historyName: string) => {
        setMitmSaveData((mitmSaveData) => mitmSaveData.filter((item) => item.historyName !== historyName))
    })

    useUpdateEffect(() => {
        setRemoteValue(CodecRunListHistory, JSON.stringify(mitmSaveData))
    }, [mitmSaveData])

    const onSelectItem = useMemoizedFn((item: SaveObjProps) => {
        onSelect(item)
        setPopoverVisible(false)
    })
    return (
        <div className={styles["codec-run-list-history-store"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>历史存储</div>
                {mitmSaveData.length !== 0 && (
                    <YakitButton
                        type='text'
                        colors='danger'
                        onClick={() => {
                            setMitmSaveData([])
                        }}
                    >
                        清空
                    </YakitButton>
                )}
            </div>

            {mitmSaveData.length > 0 ? (
                <div className={styles["list"]}>
                    {mitmSaveData.map((item, index) => (
                        <div
                            key={item.historyName}
                            className={classNames(styles["list-item"], {
                                [styles["list-item-border"]]: index !== mitmSaveData.length - 1
                            })}
                            onClick={() => {
                                onSelectItem(item)
                            }}
                        >
                            <div className={styles["name"]}>{item.historyName}</div>
                            <div
                                className={styles["opt"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeItem(item.historyName)
                                }}
                            >
                                <OutlineTrashIcon />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={classNames(styles["no-data"])}>暂无数据</div>
            )}
        </div>
    )
})

interface SaveObjProps {
    historyName: string
    rightItems: RightItemsProps[]
}

interface NewCodecMiddleRunListProps {
    rightItems: RightItemsProps[]
    setRightItems: (v: RightItemsProps[]) => void
    inputEditor:string
    setOutputEditor:(v:string)=>void
}

interface CheckFailProps {
    key: string
    index: number
    message: string
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

const CodecAutoRun = "CodecAutoRun"
// codec中间可执行列表
export const NewCodecMiddleRunList: React.FC<NewCodecMiddleRunListProps> = (props) => {
    const {rightItems, setRightItems,inputEditor,setOutputEditor} = props
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
    const [_, setFilterName, getFilterName] = useGetState<string>("")
    // 是否自动执行
    const [autoRun, setAutoRun] = useState<boolean>(false)
    useDebounceEffect(
        () => {
            if (autoRun&&rightItems.length>0) {
                console.log("自动执行----")
                runCodec()
            }
        },
        [autoRun, rightItems,inputEditor],
        {leading: true, wait: 500}
    )
    useEffect(() => {
        getRemoteValue(CodecAutoRun).then((data) => {
            if (data) {
                try {
                    const {autoRun} = JSON.parse(data)
                    setAutoRun(autoRun)
                } catch (error) {}
            }
        })
    }, [])
    useUpdateEffect(() => {
        // 缓存勾选项
        setRemoteValue(
            CodecAutoRun,
            JSON.stringify({
                autoRun
            })
        )
    }, [autoRun])

    // 历史选取项
    const onMenuSelect = useMemoizedFn((v: SaveObjProps) => {
        setRightItems(v.rightItems)
    })
    // 列表定位
    const scrollToRef = useRef<HTMLDivElement>(null)

    // 保存至历史
    const onSaveCodecRunListHistory = useMemoizedFn(() => {
        if (rightItems.length === 0) {
            warn("请从左侧列表拖入要使用的 Codec 工具")
            return
        }
        const m = showYakitModal({
            title: "保存编解码顺序",
            content: (
                <div className={styles["codec-save-modal"]}>
                    <YakitInput.TextArea
                        placeholder='请为编解码顺序取个名字...'
                        showCount
                        maxLength={50}
                        onChange={(e) => {
                            setFilterName(e.target.value)
                        }}
                    />
                    <div className={styles["btn-box"]}>
                        <YakitButton
                            type='outline2'
                            onClick={() => {
                                setFilterName("")
                                m.destroy()
                            }}
                        >
                            取消
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            onClick={() => {
                                if (getFilterName().length === 0) {
                                    warn("请输入名字")
                                    return
                                }
                                const saveObj: SaveObjProps = {
                                    historyName: getFilterName(),
                                    rightItems
                                }
                                getRemoteValue(CodecRunListHistory).then((data) => {
                                    if (!data) {
                                        setRemoteValue(CodecRunListHistory, JSON.stringify([saveObj]))
                                        info("存储成功")
                                        m.destroy()
                                        return
                                    }
                                    try {
                                        const cacheData: SaveObjProps[] = JSON.parse(data)
                                        if (
                                            cacheData.filter((item) => item.historyName === getFilterName()).length > 0
                                        ) {
                                            warn("此名字重复")
                                        } else {
                                            setRemoteValue(CodecRunListHistory, JSON.stringify([saveObj, ...cacheData]))
                                            info("存储成功")
                                            m.destroy()
                                        }
                                    } catch (error) {}
                                })
                            }}
                        >
                            保存
                        </YakitButton>
                    </div>
                </div>
            ),
            onCancel: () => {
                setFilterName("")
                m.destroy()
            },
            footer: null,
            width: 400
        })
    })

    // 执行函数
    const runCodecFun = useMemoizedFn(() => {
        // 执行完成后 更改Output值
        setOutputEditor("Output")
    })

    // 执行校验
    const runCodec = useMemoizedFn(() => {
        console.log("runCodec---", rightItems)
        // 筛选掉跳过项
        const rightItemsSkip = rightItems.filter((item) => item.status !== "shield")
        // 获取中止项及其前面内容
        const rightItemsStop: RightItemsProps[] = []
        rightItemsSkip.some((item) => {
            rightItemsStop.push(item)
            return item.status === "suspend"
        })
        // 校验不通过项
        const checkFail: CheckFailProps[] = []
        // 根据条件校验是否满足(例如：必选/正则)
        rightItemsStop.forEach((item) => {
            const {key, title} = item
            if (Array.isArray(item.node)) {
                item.node.forEach((itemIn, indexIn) => {
                    if (itemIn.type === "input") {
                        const rightItem = itemIn as RightItemsInputProps
                        const {require, value, regex} = rightItem
                        // 校验是否必填
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:为必填项`
                            })
                        }
                        // 校验正则
                        if (regex && value) {
                            const regexp = new RegExp(regex)
                            if (!regexp.test(value)) {
                                checkFail.push({
                                    key,
                                    index: indexIn,
                                    message: `${title}-${rightItem.title}:校验不通过`
                                })
                            }
                        }
                    } else if (itemIn.type === "checkbox") {
                        // checkbox无需校验 如若没有则数据转换时为false
                    } else if (itemIn.type === "select") {
                        const rightItem = itemIn as RightItemsSelectProps
                        const {require, value} = rightItem
                        // 校验是否必填
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:为必填项`
                            })
                        }
                    } else if (itemIn.type === "editor") {
                        const rightItem = itemIn as RightItemsEditorProps
                        const {require, value} = rightItem
                        // 校验是否必填
                        if (require && !value) {
                            checkFail.push({
                                key,
                                index: indexIn,
                                message: `${title}-${rightItem.title}:为必填项`
                            })
                        }
                    } else if (itemIn.type === "flex") {
                        // 此处为布局预留
                    }
                })
            }
        })
        console.log("rightItemsStop--", rightItemsStop, checkFail)
        if (checkFail.length > 0) {
            // 提示
            warn(checkFail[0].message)
            if (scrollToRef.current) {
                // 此处锚点跳转功能预留
                // scrollToRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            // 执行函数
            runCodecFun()
        }
    })

    // 清空
    const onClear = useMemoizedFn(() => {
        setRightItems([])
    })

    return (
        <div className={styles["new-codec-run-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    编解码顺序<span className={styles["count"]}>{rightItems.length}</span>
                </div>
                <div className={styles["extra"]}>
                    <Tooltip title={"保存"}>
                        <div className={styles["extra-icon"]} onClick={onSaveCodecRunListHistory}>
                            <OutlineStorageIcon />
                        </div>
                    </Tooltip>
                    <YakitPopover
                        overlayClassName={styles["http-history-table-drop-down-popover"]}
                        content={
                            <CodecRunListHistoryStore
                                onSelect={(v) => onMenuSelect(v)}
                                popoverVisible={popoverVisible}
                                setPopoverVisible={setPopoverVisible}
                            />
                        }
                        trigger='click'
                        placement='bottomRight'
                        onVisibleChange={setPopoverVisible}
                        visible={popoverVisible}
                    >
                        <div className={styles["extra-icon"]}>
                            <OutlineClockIcon />
                        </div>
                    </YakitPopover>
                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                    <div className={styles["clear"]} onClick={onClear}>
                        清空
                    </div>
                </div>
            </div>
            <div className={styles["run-list"]} ref={scrollToRef}>
                {/* 右边拖放目标 */}
                <Droppable droppableId='right' direction='vertical'>
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={rightItems.length > 0 ? {height: "100%"} : {height: "100%", overflow: "hidden"}}
                        >
                            {rightItems.length > 0 ? (
                                <>
                                    {rightItems.map((item, index) => (
                                        <Draggable
                                            key={`run-${item.key}`}
                                            draggableId={`run-${item.key}`}
                                            index={index}
                                        >
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
                                                    <NewCodecMiddleTypeItem
                                                        data={item}
                                                        outerKey={item.key}
                                                        rightItems={rightItems}
                                                        setRightItems={setRightItems}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                </>
                            ) : (
                                <div className={styles["no-data"]}>
                                    <YakitEmpty title='请从左侧列表拖入要使用的 Codec 工具' />
                                </div>
                            )}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
            <div className={styles["run-box"]}>
                <YakitCheckbox checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)}>
                    自动执行
                </YakitCheckbox>
                <YakitButton
                    disabled={rightItems.length === 0}
                    size='max'
                    className={styles["run-box-btn"]}
                    icon={<SolidPlayIcon />}
                    onClick={runCodec}
                >
                    立即执行
                </YakitButton>
            </div>
        </div>
    )
}

interface NewCodecLeftDragListItemProps {
    node: CodecMethod[]
    collectList: string[]
    getCollectData: (v: string[]) => void
    onClickToRunList: (v: CodecMethod) => void
    parentItem?: LeftDataProps
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
            if (!lastIsDragging && value1 === 0 && value2 < -200) {
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
    const {node, collectList, parentItem, getCollectData, onClickToRunList} = props

    const dragListItemDom = useMemoizedFn((item: CodecMethod) => (
        <YakitPopover
            // visible={true}
            placement='right'
            overlayClassName={styles["drag-list-item-popover"]}
            content={
                <div className={styles["popover-content"]}>
                    <div className={styles["title"]}>{item.CodecName}</div>
                    <div className={styles["content"]}>{item.Desc}</div>
                </div>
            }
        >
            <div className={styles["drag-list-item"]} onClick={() => onClickToRunList(item)}>
                <div className={styles["title"]}>{item.CodecName}</div>
                <div className={styles["extra"]}>
                    {collectList.includes(item.CodecName) ? (
                        <div
                            className={classNames(styles["star-icon"], styles["star-icon-active"])}
                            onClick={(e) => {
                                e.stopPropagation()
                                const list = collectList.filter((itemIn) => itemIn !== item.CodecName)
                                getCollectData(list)
                                setRemoteValue(SaveCodecMethods, JSON.stringify(list))
                            }}
                        >
                            <SolidStarIcon />
                        </div>
                    ) : (
                        <div
                            className={classNames(styles["star-icon"], styles["star-icon-default"])}
                            onClick={(e) => {
                                e.stopPropagation()
                                getCollectData([...collectList, item.CodecName])
                                setRemoteValue(SaveCodecMethods, JSON.stringify([...collectList, item.CodecName]))
                            }}
                        >
                            <OutlineStarIcon />
                        </div>
                    )}
                </div>
            </div>
        </YakitPopover>
    ))

    return (
        <Droppable
            droppableId='left'
            direction='vertical'
            isDropDisabled={true}
            renderClone={(provided, snapshot, rubric) => {
                const item: CodecMethod[] =
                    node.filter(
                        (item) => `${parentItem?.title || "search"}-${item.CodecName}` === rubric.draggableId
                    ) || []
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
                                    <div className={styles["title"]}>{item[0].CodecName}</div>
                                    <div className={styles["extra"]}>
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
                                key={`${parentItem?.title || "search"}-${item.CodecName}`}
                                draggableId={`${parentItem?.title || "search"}-${item.CodecName}`}
                                index={index}
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
    leftCollectData: LeftDataProps[]
    collectList: string[]
    leftSearchData: CodecMethod[]
    isShowSearchList: boolean
    getCollectData: (v: string[]) => void
    onClickToRunList: (v: CodecMethod) => void
    searchValue?: string
    setSearchValue?: (v: string) => void
}

interface LeftDataProps {
    title: string
    node: CodecMethod[]
}

// codec左边拖拽列表
export const NewCodecLeftDragList: React.FC<NewCodecLeftDragListProps> = (props) => {
    const {
        leftData,
        leftCollectData,
        collectList,
        searchValue,
        leftSearchData,
        setSearchValue,
        isShowSearchList,
        getCollectData,
        onClickToRunList
    } = props
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
                            value={searchValue}
                            onChange={(e) => {
                                setSearchValue && setSearchValue(e.target.value)
                            }}
                        />
                    </div>
                    <div className={styles["left-drag-list"]}>
                        <YakitSpin spinning={false}>
                            {/* 左边列表 */}
                            <>
                                {isShowSearchList ? (
                                    <div className={styles["left-drag-list-collapse"]}>
                                        <NewCodecLeftDragListItem
                                            node={leftSearchData}
                                            collectList={collectList}
                                            getCollectData={getCollectData}
                                            onClickToRunList={onClickToRunList}
                                        />
                                        <div className={styles["to-end"]}>已经到底啦～</div>
                                    </div>
                                ) : (
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
                                        {[...leftCollectData, ...leftData].map((item, index) => {
                                            return (
                                                <YakitPanel
                                                    header={
                                                        (activeKey || []).includes(item.title) ? (
                                                            <div className={styles["panel-active-title"]}>
                                                                {item.title}
                                                            </div>
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
                                                                    style={{color: "#FFD583"}}
                                                                    className={classNames(
                                                                        styles["star-icon"],
                                                                        styles["star-icon-active"]
                                                                    )}
                                                                    // onClick={(e) => {
                                                                    //     e.stopPropagation()
                                                                    // }}
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
                                                            parentItem={item}
                                                            collectList={collectList}
                                                            getCollectData={getCollectData}
                                                            onClickToRunList={onClickToRunList}
                                                        />
                                                    )}
                                                </YakitPanel>
                                            )
                                        })}
                                        <div className={styles["to-end"]}>已经到底啦～</div>
                                    </YakitCollapse>
                                )}
                            </>
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
// 输入框
interface RightItemsInputProps {
    // 标题
    title?: string
    // 参数名
    name?: string
    // 是否必传
    require?: boolean
    // 是否禁用
    disabled?: boolean
    // 默认值
    defaultValue?: string
    // 值
    value?: string
    // 正则校验
    regex?: string
    // 控件类型
    type: "input"
}

// 多选框
interface RightItemsCheckProps {
    // 可选值
    checkArr: {label: string; value: string}[]
    // 选中值
    value?: string[]
    // 控件类型
    type: "checkbox"
    // 是否禁用
    disabled?: boolean
    // 是否必传
    require?: boolean
}

// 下拉选择框
interface RightItemsSelectProps {
    // 标题
    title?: string
    // 参数名
    name?: string
    // 可选值
    selectArr: {label: string; value: string}[]
    // 选中值
    value?: string
    // 是否禁用
    disabled?: boolean
    // 是否必传
    require?: boolean
    // 是否可以搜索
    showSearch?: boolean
    // 控件类型
    type: "select"
    // 是否启用社区插件查询
    isPlugin?: boolean
}

// 编辑器
interface RightItemsEditorProps {
    // 标题
    title?: string
    // 参数名
    name?: string
    // 是否禁用
    disabled?: boolean
    // 是否必传
    require?: boolean
    // 编辑器值
    value?: string
    // 控件类型
    type: "editor"
}

type RightItemsTypeProps = RightItemsInputProps | RightItemsCheckProps | RightItemsSelectProps | RightItemsEditorProps

// 左右布局
interface RightItemsFlexProps {
    // 左右占据宽度的比值(默认3:2)
    leftFlex?: number
    rightFlex?: number
    // 左右内容
    leftNode: RightItemsTypeProps
    rightNode: RightItemsTypeProps
    // 控件类型
    type: "flex"
}
interface RightItemsProps {
    title: string
    key: string
    node?: (RightItemsTypeProps | RightItemsFlexProps)[]
    // 屏蔽/中止
    status?: "shield" | "suspend" | "run"
}
const initialRightItems: RightItemsProps[] = [
    // {
    //     title: "Item A",
    //     node: [
    //         {title: "校验规则", require: true, disabled: true, defaultValue: "A-Za-z0-9+/=", type: "input"},
    //         {checkArr: [{
    //             label:"严格校验",
    //             value:"严格校验"
    //         }, {label:"自动丢弃不合规片段",value:"自动丢弃不合规片段"}], type: "checkbox"},
    //         {selectArr: ["B", "K", "M"], type: "select"},
    //         {title: "Key", require: true, type: "input"},
    //         {
    //             leftNode: {type: "input", title: "IV"},
    //             rightNode: {selectArr: ["B", "K", "M"], type: "select"},
    //             type: "flex"
    //         },
    //         {selectArr: ["B", "K", "M"], showSearch: true, type: "select"},
    //         {value: "NewCodecEditor--", title: "编写临时插件", require: true, type: "editor"}
    //     ]
    // },
    // {
    //     title: "Item B",
    //     node: [
    //         {title: "校验规则", require: true, disabled: true, defaultValue: "A-Za-z0-9+/=", type: "input"},
    //         {checkArr: [{
    //             label:"严格校验",
    //             value:"严格校验"
    //         }, {label:"自动丢弃不合规片段",value:"自动丢弃不合规片段"}], type: "checkbox"},
    //         {selectArr: ["B", "K", "M"], type: "select"},
    //         {title: "Key", require: true, type: "input"},
    //         {
    //             leftNode: {type: "input", title: "IV"},
    //             rightNode: {selectArr: ["B", "K", "M"], type: "select"},
    //             type: "flex"
    //         },
    //         {selectArr: ["B", "K", "M"], showSearch: true, type: "select"},
    //         {value: "NewCodecEditor--", title: "编写临时插件", require: true, type: "editor"}
    //     ]
    // }
]
export interface CodecParam {
    Name: string
    Type: string
    Options: string[]
    Required: boolean
    Desc: string
    Regex: string
    Label: string
}
export interface CodecMethod {
    Tag: string
    CodecName: string
    CodecMethod: string
    Desc: string
    Params: CodecParam[]
}
export interface CodecMethods {
    Methods: CodecMethod[]
}
export interface NewCodecProps {}
const NewCodec: React.FC<NewCodecProps> = (props) => {
    // 是否全部展开
    const [isExpand, setExpand] = useState<boolean>(false)
    const [rightItems, setRightItems] = useState<RightItemsProps[]>(initialRightItems)
    const [leftData, setLeftData] = useState<LeftDataProps[]>([])
    // 我的收藏
    const [leftCollectData, setLeftCollectData] = useState<LeftDataProps[]>([])
    const [collectList, setCollectList] = useState<string[]>([])

    const [leftSearchData, setLeftSearchData] = useState<CodecMethod[]>([])
    const [searchValue, setSearchValue] = useState<string>()
    // 是否显示搜索列表
    const [isShowSearchList, setShowSearchList] = useState<boolean>(false)
    const cacheCodecRef = useRef<CodecMethod[]>([])
    // Input/Output编辑器内容
    const [inputEditor, setInputEditor] = useState<string>("")
    const [outputEditor, setOutputEditor] = useState<string>("")

    // 构造页面左边列表数据
    const initLeftData = useMemoizedFn((Methods: CodecMethod[]) => {
        // 分类的类名
        let tagList: string[] = []
        let data: LeftDataProps[] = []
        // 固定顺序
        const NewMethods = Methods.sort((a, b) => a.CodecName.charCodeAt(0) - b.CodecName.charCodeAt(0))
        NewMethods.forEach((item) => {
            if (tagList.includes(item.Tag)) {
                const newData = data.map((itemIn) => {
                    const {title, node} = itemIn
                    if (itemIn.title === item.Tag) {
                        return {
                            title,
                            node: [...node, item]
                        }
                    }
                    return itemIn
                })
                data = newData
            } else {
                data.push({
                    title: item.Tag,
                    node: [item]
                })
                tagList.push(item.Tag)
            }
        })

        // 找到 title 为 "其他" 的项的索引
        const index = data.findIndex((item) => item.title === "其他")
        // 如果找到了，则将该项移动到数组尾部
        if (index !== -1) {
            const otherItem = data.splice(index, 1)[0]
            data.push(otherItem)
        }
        console.log("tagList---", tagList, data)
        setLeftData(data)
    })

    // 获取codec收藏列表
    const getCollectData = useMemoizedFn((star?: string[]) => {
        const setStar = (starList: string[]) => {
            const filterCodec = cacheCodecRef.current.filter((item) => starList.includes(item.CodecName))
            /* 此处需要收藏的工具有顺序 则需要根据starList排列filterCodec */
            filterCodec.sort((a, b) => {
                const indexA = starList.indexOf(a.CodecName)
                const indexB = starList.indexOf(b.CodecName)
                return indexA - indexB
            })
            setCollectList(starList)
            if (filterCodec.length > 0) {
                setLeftCollectData([
                    {
                        title: "我收藏的工具",
                        node: filterCodec
                    }
                ])
            } else {
                setLeftCollectData([])
            }
        }
        if (star) {
            setStar(star)
        } else {
            getRemoteValue(SaveCodecMethods).then((res) => {
                // 如果存在收藏
                if (res) {
                    try {
                        const cacheList: string[] = JSON.parse(res)
                        setStar(cacheList)
                    } catch (error) {}
                } else {
                    setLeftCollectData([])
                    setCollectList([])
                }
            })
        }
    })

    // 获取codec列表
    const getLeftData = useMemoizedFn(() => {
        ipcRenderer.invoke("GetAllCodecMethods").then((res: CodecMethods) => {
            console.log("GetAllCodecMethods---", res)
            const {Methods} = res
            cacheCodecRef.current = Methods
            getCollectData()
            initLeftData(Methods)
        })
    })

    useDebounceEffect(
        () => {
            if (searchValue && searchValue.length) {
                const filterCodec = cacheCodecRef.current.filter((item) => item.CodecName.includes(searchValue))
                setLeftSearchData(filterCodec)
                setShowSearchList(true)
            } else {
                setShowSearchList(false)
                getLeftData()
            }
        },
        [searchValue],
        {leading: true, wait: 500}
    )

    const initNode = useMemoizedFn((codecItem: CodecMethod) => {
        return codecItem.Params.map((item) => {
            const {Type, Options, Label, Name, Required, Regex, Desc} = item
            switch (Type) {
                case "select":
                    return {
                        type: "select",
                        selectArr: Options.map((item) => ({label: item, value: item})),
                        title: Label,
                        name: Name,
                        require: Required
                    } as RightItemsSelectProps
                case "input":
                    return {
                        type: "input",
                        title: Label,
                        name: Name,
                        require: Required,
                        regex: Regex
                    } as RightItemsInputProps
                case "checkbox":
                    let checkArr = [{label: Label, value: Name}]
                    return {
                        type: "checkbox",
                        checkArr,
                        require: Required
                    } as RightItemsCheckProps
                case "monaco":
                    return {
                        type: "editor",
                        title: Label,
                        name: Name,
                        require: Required
                    } as RightItemsEditorProps
                case "search":
                    // search控件的selectArr来源于接口请求
                    return {
                        type: "select",
                        selectArr: [],
                        title: Label,
                        name: Name,
                        require: Required,
                        isPlugin: true,
                        showSearch: true
                    } as RightItemsSelectProps
                default:
                    return {
                        title: "未识别数据",
                        require: false,
                        type: "input"
                    } as RightItemsInputProps
            }
        })
    })

    /**
     * @description: 点击后添加至运行列表
     */
    const onClickToRunList = useMemoizedFn((item: CodecMethod) => {
        console.log("onClickToRunList", item)
        const node = initNode(item)
        const newRightItems = JSON.parse(JSON.stringify(rightItems))
        newRightItems.push({title: item.CodecName, key: uuidv4(), node})
        setRightItems(newRightItems)
    })

    /**
     * @description: 拖拽结束后的计算
     */
    const onDragEnd = useMemoizedFn((result: DropResult, provided: ResponderProvided) => {
        const {source, destination, draggableId} = result
        console.log("onDragEnd", result)

        // 左边向右边拖拽
        if (source.droppableId === "left" && destination && destination.droppableId === "right") {
            const firstDashIndex = draggableId.indexOf("-")
            // 组来源或者搜索来源
            const sourceType = draggableId.substring(0, firstDashIndex)
            // 获取拖拽项
            const CodecName = draggableId.substring(firstDashIndex + 1)
            const codecArr = cacheCodecRef.current.filter((item) => item.CodecName === CodecName)
            console.log("item--", codecArr)
            if (codecArr.length > 0) {
                const codecItem = codecArr[0]
                const node = initNode(codecItem)
                const newRightItems = JSON.parse(JSON.stringify(rightItems))
                newRightItems.splice(destination.index, 0, {title: codecItem.CodecName, key: uuidv4(), node})
                console.log("newRightItems", newRightItems, node)
                setRightItems(newRightItems)
            }
        }

        // 右边内部排序
        if (source.droppableId === "right" && destination && destination.droppableId === "right") {
            const newRightItems = JSON.parse(JSON.stringify(rightItems))
            const [removed] = newRightItems.splice(source.index, 1)
            console.log("removed--", removed)
            newRightItems.splice(destination.index, 0, removed)
            setRightItems([...newRightItems])
        }
    })

    /**
     * @description: 计算移动的范围是否在目标范围类
     */
    const onDragUpdate = useThrottleFn(
        (result: DragUpdate, provided: ResponderProvided) => {
            const {index, droppableId} = result.source
            const {combine, destination, draggableId} = result
        },
        {wait: 200}
    ).run

    const onBeforeCapture = useMemoizedFn((result: BeforeCapture) => {})

    const onDragStart = useMemoizedFn((result: DragStart) => {
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
                    <NewCodecLeftDragList
                        leftData={leftData}
                        leftCollectData={leftCollectData}
                        collectList={collectList}
                        leftSearchData={leftSearchData}
                        isShowSearchList={isShowSearchList}
                        searchValue={searchValue}
                        setSearchValue={setSearchValue}
                        getCollectData={getCollectData}
                        onClickToRunList={onClickToRunList}
                    />
                    <NewCodecMiddleRunList 
                    rightItems={rightItems} 
                    setRightItems={setRightItems} 
                    inputEditor={inputEditor}
                    setOutputEditor={setOutputEditor}
                    />
                </DragDropContext>
            )}
            <NewCodecRightEditorBox
                isExpand={isExpand}
                setExpand={setExpand}
                inputEditor={inputEditor}
                setInputEditor={setInputEditor}
                outputEditor={outputEditor}
                setOutputEditor={setOutputEditor}
            />
        </div>
    )
}
export default NewCodec
