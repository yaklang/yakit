import React, {useEffect, useMemo, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./MITMServerStartForm.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {info, yakitFailed, warn, yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Tooltip} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {MITMAdvancedFilter, MITMFilters, MITMFilterSchema, onFilterEmptyMITMAdvancedFilters} from "./MITMFilters"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {
    OutlineClockIcon,
    OutlineExportIcon,
    OutlineSaveIcon,
    OutlineStorageIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {defaultMITMAdvancedFilter, defaultMITMFilterData} from "@/defaultConstants/mitm"
import cloneDeep from "lodash/cloneDeep"
import {MITMFilterUIProps, convertLocalMITMFilterRequest, convertMITMFilterUI} from "./utils"
import {saveABSFileToOpen} from "@/utils/openWebsite"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {RemoteMitmGV} from "@/enums/mitm"

const MITMAdvancedFilters = React.lazy(() => import("./MITMFilters"))
const {ipcRenderer} = window.require("electron")

interface MITMFiltersModalProps {
    filterType: "filter" | "hijackFilter"
    isStartMITM: boolean
    visible: boolean
    setVisible: (b: boolean) => void
    onSetHijackFilterFlag?: (b: boolean) => void // 是否配置过条件劫持
}
interface SaveObjProps {
    filterName: string
    filter: any
    advancedFilters: MITMAdvancedFilter[]
}

type FilterSettingType = "base-setting" | "advanced-setting"

/**判断mitm 过滤器高级配置中是否选择了 IncludeHostname/IncludeUri */
export const getAdvancedFlag = (advancedFilters: MITMAdvancedFilter[]): boolean => {
    return !!advancedFilters.filter((ele) => ["IncludeHostnames", "IncludeUri"].includes(ele.Field || "")).length
}
// 是否配置过条件劫持
export const getMitmHijackFilter = (baseFilter: MITMFilterSchema, advancedFilters: MITMAdvancedFilter[]): boolean => {
    return (
        !!Object.keys(baseFilter).filter((key) => baseFilter[key].length > 0).length ||
        !!advancedFilters.filter((ele) =>
            ["ExcludeHostnames", "IncludeHostnames", "ExcludeUri", "IncludeUri", "ExcludeMethods"].includes(
                ele.Field || ""
            )
        ).length
    )
}
const MITMFiltersModal: React.FC<MITMFiltersModalProps> = React.memo((props) => {
    const {filterType, visible, setVisible, isStartMITM, onSetHijackFilterFlag} = props
    const filtersRef = useRef<any>()
    const [type, setType] = useState<FilterSettingType>("base-setting")
    // filter 过滤器
    const [_mitmFilter, setMITMFilter] = useState<MITMFilterSchema>()
    const [_, setFilterName, getFilterName] = useGetState<string>("")
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    const [filterData, setFilterData] = useState<MITMAdvancedFilter[]>([cloneDeep(defaultMITMAdvancedFilter)])

    const onResetFilters = useMemoizedFn(() => {
        function resetFilterOk() {
            info("MITM 过滤器重置命令已发送")
            emiter.emit("onSetFilterWhiteListEvent", false + "")
            setVisible(false)
        }
        if (isStartMITM) {
            ipcRenderer.invoke("mitm-reset-filter").then(() => {
                resetFilterOk()
            })
        } else {
            ipcRenderer.invoke("ResetMITMFilter").then(() => {
                resetFilterOk()
            })
        }
    })
    useEffect(() => {
        ipcRenderer.on("client-mitm-filter", (e, msg) => {
            const filter = msg.FilterData
            const value = convertMITMFilterUI(filter)
            setMITMFilter({
                ...value.baseFilter
            })
            setFilterData([...value.advancedFilters])
            info("更新 MITM 过滤器状态")
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-filter")
        }
    }, [])
    useEffect(() => {
        if (visible) getMITMFilter()
    }, [visible])
    const onSetFilter = useMemoizedFn(() => {
        const params = getMITMFilterData()
        const {baseFilter, advancedFilters} = params
        // baseFilter的每个字段都需要为数组，因为后端没有处理字段不存在的情况 会提示报错
        const filter = convertLocalMITMFilterRequest({...params})

        if (filterType === "filter") {
            ipcRenderer
                .invoke("mitm-set-filter", {
                    FilterData: filter
                })
                .then(() => {
                    // 是否配置过过滤器白名单文案
                    const flag =
                        !!baseFilter?.includeHostname?.length ||
                        !!baseFilter?.includeUri?.length ||
                        !!baseFilter?.includeSuffix?.length ||
                        getAdvancedFlag(advancedFilters)
                    emiter.emit("onSetFilterWhiteListEvent", flag + "")
                    setVisible(false)
                    info("更新 MITM 过滤器状态")
                })
                .catch((err) => {
                    yakitFailed("更新 MITM 过滤器失败：" + err)
                })
        } else {
            ipcRenderer
                .invoke("mitm-hijack-set-filter", {
                    FilterData: filter
                })
                .then(() => {
                    // 是否配置过 劫持 过滤器
                    if (onSetHijackFilterFlag) {
                        onSetHijackFilterFlag(getMitmHijackFilter(baseFilter, advancedFilters))
                    }
                    setVisible(false)
                    info("更新 劫持 过滤器状态")
                })
                .catch((err) => {
                    yakitFailed("更新 劫持 过滤器失败：" + err)
                })
        }
    })
    const getMITMFilter = useMemoizedFn(() => {
        if (filterType === "filter") {
            ipcRenderer
                .invoke("mitm-get-filter")
                .then((val: MITMFilterSchema) => {
                    const newValue = convertMITMFilterUI(val.FilterData || cloneDeep(defaultMITMFilterData))
                    setMITMFilter(newValue.baseFilter)
                    setFilterData(newValue.advancedFilters)
                })
                .catch((err) => {
                    yakitFailed("获取 MITM 过滤器失败：" + err)
                })
        } else {
            ipcRenderer
                .invoke("mitm-hijack-get-filter")
                .then((val: MITMFilterSchema) => {
                    const newValue = convertMITMFilterUI(val.FilterData || cloneDeep(defaultMITMFilterData))
                    setMITMFilter(newValue.baseFilter)
                    setFilterData(newValue.advancedFilters)
                })
                .catch((err) => {
                    yakitFailed("获取 劫持 过滤器失败：" + err)
                })
        }
    })
    const onClearFilters = () => {
        filtersRef.current.clearFormValue()
        setFilterData([])
    }

    const removeFilterKey = useMemo(() => {
        if (filterType === "filter") return RemoteMitmGV.MitmSaveFilter
        if (filterType === "hijackFilter") return RemoteMitmGV.MitmHijackFilter
        return ""
    }, [filterType])

    // 保存过滤器
    const onSaveFilter = useMemoizedFn(() => {
        const m = showYakitModal({
            title: filterType === "filter" ? "保存过滤器配置" : "保存条件劫持配置",
            content: (
                <div className={styles["mitm-save-filter"]}>
                    <YakitInput.TextArea
                        placeholder={`请为${filterType === "filter" ? "过滤器" : ""}配置取个名字...`}
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
                                const filter = getMITMFilterData().baseFilter
                                const saveObj: SaveObjProps = {
                                    filterName: getFilterName(),
                                    filter,
                                    advancedFilters: getMITMFilterData().advancedFilters
                                }
                                getRemoteValue(removeFilterKey).then((data) => {
                                    if (!data) {
                                        setRemoteValue(removeFilterKey, JSON.stringify([saveObj]))
                                        info("存储成功")
                                        m.destroy()
                                        return
                                    }
                                    try {
                                        const saveFilterData: SaveObjProps[] = JSON.parse(data)
                                        if (
                                            saveFilterData.filter((item) => item.filterName === getFilterName())
                                                .length > 0
                                        ) {
                                            warn("此名字重复")
                                        } else {
                                            setRemoteValue(
                                                removeFilterKey,
                                                JSON.stringify([saveObj, ...saveFilterData])
                                            )
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

    const onMenuSelect = useMemoizedFn((v: MITMFilterUIProps) => {
        filtersRef.current.setFormValue(v.baseFilter)
        setFilterData(v.advancedFilters || [])
    })

    const onSetType = useMemoizedFn((e) => {
        const {value} = e.target
        setType(value)
    })

    /**获取基础配置、高级配置去除空数据 */
    const getMITMFilterData = useMemoizedFn(() => {
        const filter: MITMFilterSchema = filtersRef.current.getFormValue()
        const noEmptyFilterData: MITMAdvancedFilter[] = onFilterEmptyMITMAdvancedFilters(filterData)
        return {
            baseFilter: filter,
            advancedFilters: noEmptyFilterData
        }
    })

    const onFilterExport = useMemoizedFn(() => {
        const baseFilter = getMITMFilterData().baseFilter
        const advancedFilters = getMITMFilterData().advancedFilters
        const encoder = new TextEncoder()
        const exportData = encoder.encode(JSON.stringify({baseFilter, advancedFilters}))
        saveABSFileToOpen("filter-config.json", exportData)
    })

    const [importVisibel, setImportVisibel] = useState<boolean>(false)
    const onFilterImport = useMemoizedFn(() => {
        setImportVisibel(true)
    })

    return (
        <YakitModal
            visible={visible}
            onCancel={() => {
                setVisible(false)
            }}
            closable={true}
            title={
                <div className={styles["mitm-filters-title"]}>
                    <span>{filterType === "hijackFilter" ? "条件劫持" : "过滤器配置"}</span>
                    <YakitRadioButtons
                        value={type}
                        onChange={onSetType}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "base-setting",
                                label: "基础配置"
                            },
                            {
                                value: "advanced-setting",
                                label: "高级配置"
                            }
                        ]}
                    />
                </div>
            }
            width={730}
            maskClosable={false}
            subTitle={
                <div className={styles["mitm-filters-subTitle"]}>
                    {filterType === "filter" && (
                        <>
                            <Tooltip title='导出配置' align={{offset: [0, 10]}}>
                                <YakitButton
                                    style={{padding: "3px 8px"}}
                                    type='text'
                                    icon={<OutlineExportIcon />}
                                    onClick={onFilterExport}
                                />
                            </Tooltip>
                            <Tooltip title='导入配置' align={{offset: [0, 10]}}>
                                <YakitButton
                                    style={{padding: "3px 8px"}}
                                    type='text'
                                    icon={<OutlineSaveIcon />}
                                    onClick={onFilterImport}
                                />
                            </Tooltip>
                            <ImportFileModal
                                visible={importVisibel}
                                title='从 JSON 中导入'
                                fileType='application/json'
                                onCancel={() => {
                                    setImportVisibel(false)
                                }}
                                onOk={(value) => {
                                    try {
                                        const importValue = JSON.parse(value)
                                        onMenuSelect(importValue)
                                        setImportVisibel(false)
                                    } catch (error) {
                                        yakitNotify("error", "导入失败")
                                    }
                                }}
                            ></ImportFileModal>
                        </>
                    )}

                    <YakitButton
                        style={{padding: "3px 8px"}}
                        icon={<OutlineStorageIcon />}
                        type='text'
                        onClick={onSaveFilter}
                    />
                    <YakitPopover
                        overlayClassName={styles["http-history-table-drop-down-popover"]}
                        content={
                            <MitmFilterHistoryStore
                                onSelect={(v) => onMenuSelect(v)}
                                popoverVisible={popoverVisible}
                                setPopoverVisible={setPopoverVisible}
                                removeFilterKey={removeFilterKey}
                            />
                        }
                        trigger='click'
                        placement='bottom'
                        onVisibleChange={setPopoverVisible}
                        visible={popoverVisible}
                    >
                        <YakitButton style={{padding: "3px 8px"}} icon={<OutlineClockIcon />} type='text' />
                    </YakitPopover>

                    <YakitButton type='text' onClick={() => onClearFilters()}>
                        清除
                    </YakitButton>
                    {filterType === "filter" && (
                        <YakitButton
                            type='text'
                            onClick={() => {
                                onResetFilters()
                            }}
                        >
                            重置过滤器
                        </YakitButton>
                    )}
                </div>
            }
            className={styles["mitm-filters-modal"]}
            onOk={() => {
                onSetFilter()
            }}
            bodyStyle={{padding: 0}}
        >
            <div className={styles.infoBox}>
                <div>提示：</div>
                {filterType === "hijackFilter" ? (
                    <>
                        <div>1、符合条件的数据会自动跳转到手动劫持查看，其余数据自动放行</div>
                        <div>
                            2、基础配置除Content-Type和文件后缀外默认都按关键字匹配，如需要正则和glob模式匹配请在高级配置中配置
                        </div>
                    </>
                ) : (
                    <div>
                        基础配置除Content-Type和文件后缀外默认都按关键字匹配，如需要正则和glob模式匹配请在高级配置中配置
                    </div>
                )}
            </div>
            <MITMFilters
                visible={type === "base-setting"}
                filter={_mitmFilter}
                onFinished={() => onSetFilter()}
                ref={filtersRef}
            />
            <React.Suspense>
                <MITMAdvancedFilters
                    filterData={filterData}
                    setFilterData={setFilterData}
                    visible={type === "advanced-setting"}
                />
            </React.Suspense>
        </YakitModal>
    )
})

export default MITMFiltersModal

interface MitmFilterHistoryStoreProps {
    removeFilterKey: string
    popoverVisible: boolean
    setPopoverVisible: (v: boolean) => void
    onSelect: (v: MITMFilterUIProps) => void
}
const MitmFilterHistoryStore: React.FC<MitmFilterHistoryStoreProps> = React.memo((props) => {
    const {removeFilterKey, popoverVisible, setPopoverVisible, onSelect} = props
    const [mitmSaveData, setMitmSaveData] = useState<SaveObjProps[]>([])
    useEffect(() => {
        onMitmSaveFilter()
    }, [popoverVisible])
    const onMitmSaveFilter = useMemoizedFn(() => {
        getRemoteValue(removeFilterKey).then((data) => {
            if (!data) {
                setMitmSaveData([])
                return
            }
            try {
                const filterData: SaveObjProps[] = JSON.parse(data)
                setMitmSaveData(filterData)
            } catch (error) {}
        })
    })

    const removeItem = useMemoizedFn((filterName: string) => {
        setMitmSaveData((mitmSaveData) => mitmSaveData.filter((item) => item.filterName !== filterName))
    })

    useUpdateEffect(() => {
        setRemoteValue(removeFilterKey, JSON.stringify(mitmSaveData))
    }, [mitmSaveData])

    const onSelectItem = useMemoizedFn((item) => {
        onSelect({
            baseFilter: item.filter,
            advancedFilters: item.advancedFilters || []
        })
        setPopoverVisible(false)
    })

    return (
        <div className={styles["mitm-filter-history-store"]}>
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
                            key={item.filterName}
                            className={classNames(styles["list-item"], {
                                [styles["list-item-border"]]: index !== mitmSaveData.length - 1,
                                [styles["list-item-border-top"]]: index === 0
                            })}
                            onClick={() => {
                                onSelectItem(item)
                            }}
                        >
                            <div className={styles["name"]}>{item.filterName}</div>
                            <div
                                className={styles["opt"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeItem(item.filterName)
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

interface ImportFileModalProps {
    title: string
    visible: boolean
    okText?: string
    fileType?: string
    onCancel: () => void
    onOk: (value: string) => void
}
const ImportFileModal: React.FC<ImportFileModalProps> = (props) => {
    const {title, visible, okText = "导入", fileType, onCancel, onOk} = props
    const [value, setValue] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (visible) {
            setValue("")
        }
    }, [visible])

    const onClickUpload = () => {
        if (fileInputRef.current) {
            // 点击自定义按钮时触发文件选择框
            fileInputRef.current.click()
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        handleReadAsText(files)
        event.target.value = ""
    }

    const handleReadAsText = (files: FileList | null) => {
        if (!files) return
        if (files.length > 0) {
            setValue("")
            const file = files[0]
            if (fileType && file.type !== fileType) {
                yakitNotify("warning", "导入文件不符合格式要求")
                return
            }
            const reader = new FileReader()
            reader.onload = (e) => {
                const content = e.target?.result
                if (typeof content === "string") {
                    setValue(content)
                }
            }
            reader.readAsText(file)
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault() // 防止默认行为以允许放置
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const files = event.dataTransfer.files // 获取拖放的文件
        handleReadAsText(files)
    }

    return (
        <YakitModal
            title={title}
            width={850}
            subTitle={
                <div className={styles["import-text"]}>
                    可将文件拖入框内，或
                    <input type='file' className={styles["fileInput"]} ref={fileInputRef} onChange={handleFileChange} />
                    <YakitButton type='text' onClick={onClickUpload} style={{fontSize: 14}}>
                        点击此处
                    </YakitButton>
                    上传，也支持直接粘贴代码
                </div>
            }
            destroyOnClose={true}
            visible={visible}
            okText={okText}
            onCancel={onCancel}
            onOk={() => onOk(value)}
        >
            <div className={styles["import-editor"]} onDragOver={handleDragOver} onDrop={handleDrop}>
                <YakitEditor value={value} setValue={setValue}></YakitEditor>
            </div>
        </YakitModal>
    )
}
