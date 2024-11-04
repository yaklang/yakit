import React, {useEffect, useRef, useState} from "react"
import classNames from "classnames"
import styles from "./MITMServerStartForm.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {info, yakitFailed, warn} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Modal} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {RemoveIcon} from "@/assets/newIcon"
import {MITMAdvancedFilter, MITMFilters, MITMFilterSchema, onFilterEmptyMITMAdvancedFilters} from "./MITMFilters"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {OutlineClockIcon, OutlineStorageIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {defaultMITMAdvancedFilter, defaultMITMFilterData} from "@/defaultConstants/mitm"
import cloneDeep from "lodash/cloneDeep"
import {MITMFilterUIProps, convertLocalMITMFilterRequest, convertMITMFilterUI} from "./utils"

const MITMAdvancedFilters = React.lazy(() => import("./MITMFilters"))
const {ipcRenderer} = window.require("electron")

interface MITMFiltersModalProps {
    isStartMITM: boolean
    visible: boolean
    setVisible: (b: boolean) => void
}
interface SaveObjProps {
    filterName: string
    filter: any
    advancedFilters: MITMAdvancedFilter[]
}

type FilterSettingType = "base-setting" | "advanced-setting"
const MitmSaveFilter = "MitmSaveFilter"

const MITMFiltersModal: React.FC<MITMFiltersModalProps> = React.memo((props) => {
    const {visible, setVisible, isStartMITM} = props
    const filtersRef = useRef<any>()
    const [type, setType] = useState<FilterSettingType>("base-setting")
    // filter 过滤器
    const [_mitmFilter, setMITMFilter] = useState<MITMFilterSchema>()
    const [_, setFilterName, getFilterName] = useGetState<string>("")
    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    const [filterData, setFilterData] = useState<MITMAdvancedFilter[]>([cloneDeep(defaultMITMAdvancedFilter)])

    const onResetFilters = useMemoizedFn(() => {
        ipcRenderer.invoke("mitm-reset-filter").then(() => {
            info("MITM 过滤器重置命令已发送")
            emiter.emit("onSetFilterWhiteListEvent", false + "")
            setVisible(false)
        })
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
        const {baseFilter} = params
        // baseFilter的每个字段都需要为数组，因为后端没有处理字段不存在的情况 会提示报错
        const filter = convertLocalMITMFilterRequest({...params})
        ipcRenderer
            .invoke("mitm-set-filter", {
                FilterData: filter
            })
            .then(() => {
                // 是否配置过过滤器白名单文案
                const flag =
                    !!baseFilter?.includeHostname?.length ||
                    !!baseFilter?.includeUri?.length ||
                    !!baseFilter?.includeSuffix?.length
                emiter.emit("onSetFilterWhiteListEvent", flag + "")
                setVisible(false)
                info("更新 MITM 过滤器状态")
            })
            .catch((err) => {
                yakitFailed("更新 MITM 过滤器失败:" + err)
            })
    })
    const getMITMFilter = useMemoizedFn(() => {
        ipcRenderer
            .invoke("mitm-get-filter")
            .then((val: MITMFilterSchema) => {
                const newValue = convertMITMFilterUI(val.FilterData || cloneDeep(defaultMITMFilterData))
                setMITMFilter(newValue.baseFilter)
                setFilterData(newValue.advancedFilters)
            })
            .catch((err) => {
                yakitFailed("获取 MITM 过滤器失败:" + err)
            })
    })
    const onClearFilters = () => {
        filtersRef.current.clearFormValue()
        setFilterData([cloneDeep(defaultMITMAdvancedFilter)])
    }

    // 判断对象内的属性是否为空
    const areObjectPropertiesEmpty = useMemoizedFn((obj) => {
        try {
            for (const key in obj) {
                if (obj[key] !== null && obj[key] !== undefined && Array.isArray(obj[key]) && obj[key].length > 0) {
                    return false
                }
            }
            return true
        } catch (error) {
            return true
        }
    })

    // 保存过滤器
    const onSaveFilter = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "保存过滤器配置",
            content: (
                <div className={styles["mitm-save-filter"]}>
                    <YakitInput.TextArea
                        placeholder='请为过滤器配置取个名字...'
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
                                getRemoteValue(MitmSaveFilter).then((data) => {
                                    if (!data) {
                                        setRemoteValue(MitmSaveFilter, JSON.stringify([saveObj]))
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
                                            setRemoteValue(MitmSaveFilter, JSON.stringify([saveObj, ...saveFilterData]))
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

    return (
        <YakitModal
            visible={visible}
            onCancel={() => {
                setVisible(false)
            }}
            closable={true}
            title={
                <div className={styles["mitm-filters-title"]}>
                    <span>过滤器配置</span>
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
            width={720}
            maskClosable={false}
            subTitle={
                <div className={styles["mitm-filters-subTitle"]}>
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
                    {isStartMITM && (
                        <YakitButton type='text' onClick={() => onResetFilters()}>
                            重置过滤器
                        </YakitButton>
                    )}
                </div>
            }
            className={styles["mitm-filters-modal"]}
            onOk={() => {
                const filter = getMITMFilterData().baseFilter
                const advancedFilters = getMITMFilterData().advancedFilters
                if (!advancedFilters.length && areObjectPropertiesEmpty(filter)) {
                    Modal.confirm({
                        title: "温馨提示",
                        icon: <ExclamationCircleOutlined />,
                        content: "过滤器为空时将重置为默认配置，确认重置吗？",
                        okText: "确认",
                        cancelText: "取消",
                        closable: true,
                        closeIcon: (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation()
                                    Modal.destroyAll()
                                }}
                                className='modal-remove-icon'
                            >
                                <RemoveIcon />
                            </div>
                        ),
                        onOk: () => {
                            onSetFilter()
                        },
                        onCancel: () => {},
                        cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                        okButtonProps: {size: "small", className: "modal-ok-button"}
                    })
                } else {
                    onSetFilter()
                }
            }}
            bodyStyle={{padding: 0}}
        >
            <div className={styles.infoBox}>
                <div>提示：</div>
                <div>
                    基础配置除Content-Type和文件后缀外默认都按关键字匹配，如需要正则和glob模式匹配请在高级配置中配置
                </div>
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
    popoverVisible: boolean
    setPopoverVisible: (v: boolean) => void
    onSelect: (v: MITMFilterUIProps) => void
}
const MitmFilterHistoryStore: React.FC<MitmFilterHistoryStoreProps> = React.memo((props) => {
    const {popoverVisible, setPopoverVisible, onSelect} = props
    const [mitmSaveData, setMitmSaveData] = useState<SaveObjProps[]>([])
    useEffect(() => {
        onMitmSaveFilter()
    }, [popoverVisible])
    const onMitmSaveFilter = useMemoizedFn(() => {
        getRemoteValue(MitmSaveFilter).then((data) => {
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
        setRemoteValue(MitmSaveFilter, JSON.stringify(mitmSaveData))
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
