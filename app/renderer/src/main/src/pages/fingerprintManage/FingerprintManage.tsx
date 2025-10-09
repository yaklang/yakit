import React, {ForwardedRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineClouddownloadIcon,
    OutlineExportIcon,
    OutlineFolderaddIcon,
    OutlineImportIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlinePlusIcon,
    OutlineSearchIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useDebounceEffect, useDebounceFn, useMemoizedFn, useUpdateEffect, useVirtualList} from "ahooks"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import classNames from "classnames"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {SolidFolderopenIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {cloneDeep} from "lodash"
import {Divider, Form, InputRef, Table, Tooltip} from "antd"
import {
    BatchUpdateFingerprintToGroupRequest,
    FingerprintFilter,
    FingerprintGroup,
    FingerprintRule,
    grpcCreateFingerprint,
    grpcCreateLocalFingerprintGroup,
    grpcDeleteFingerprint,
    grpcDeleteLocalFingerprintGroup,
    grpcFetchFingerprintForSameGroup,
    grpcFetchLocalFingerprintGroupList,
    grpcFetchLocalFingerprintList,
    grpcUpdateFingerprint,
    grpcUpdateFingerprintToGroup,
    grpcUpdateLocalFingerprintGroup,
    httpDownloadFingerprint,
    QueryFingerprintRequest,
    QueryFingerprintResponse
} from "./api"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {genDefaultPagination} from "../invoker/schema"
import {EditingObjProps} from "../payloadManager/PayloadLocalTable"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import ImportExportModal, {ExportImportProgress, ImportExportModalExtra} from "./ImportExportModal/ImportExportModal"
import {randomString} from "@/utils/randomUtil"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {FingerprintRuleDom} from "./FingerprintRuleDom"
import styles from "./FingerprintManage.module.scss"

const {ipcRenderer} = window.require("electron")

// #region 指纹管理入口
interface FingerprintManageProp {}
const FingerprintManage: React.FC<FingerprintManageProp> = (props) => {
    const {currentPageTabRouteKey} = usePageInfo(
        (s) => ({
            currentPageTabRouteKey: s.currentPageTabRouteKey
        }),
        shallow
    )

    // #region 本地组
    const localFingerprintGroupListRef = useRef<LocalFingerprintGroupListPropsRefProps>({
        handleReset: () => {}
    })
    const [refreshLocalGroup, setRefreshLocalGroup] = useState<boolean>(false)
    const [localGroupLen, setLocalGroupLen] = useState<number>(0)
    const onLocalGroupChange = useMemoizedFn((groups) => {
        setLocalFilter((prev) => {
            return {
                ...prev,
                GroupName: groups
            }
        })
    })
    // #endregion

    // #region 本地表
    const [localFilter, setLocalFilter] = useState<FingerprintFilter>({})
    const [localFingerprintLen, setLocalFingerprintLen] = useState<number>(0)
    const [rowSelectionKeys, setRowSelectionKeys] = useState<number[]>([])
    // #endregion

    const showEmptyInitRef = useRef<boolean>(true)
    const showEmpty = useMemo(() => {
        if (showEmptyInitRef.current === false) return false
        if (localGroupLen || localFingerprintLen) {
            showEmptyInitRef.current = false
            return false
        }
        return true
    }, [localGroupLen, localFingerprintLen, localFilter])

    // #region 下载默认指纹并自动导入
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    const [downToken, setDownToken] = useState<string>("")
    const downloadFingerprint = useMemoizedFn(async () => {
        setDownloadLoading(true)
        try {
            const savePath = await ipcRenderer.invoke("GenerateProjectsFilePath", "fingerprints.zip")
            await httpDownloadFingerprint(savePath)
            const token = randomString(40)
            setDownToken(token)
            ipcRenderer.invoke("ImportFingerprint", {InputPath: savePath}, token)
        } catch (error) {
            setDownloadLoading(false)
            yakitNotify("error", "下载失败：" + error)
        }
    })
    useEffect(() => {
        if (!downToken) {
            return
        }
        ipcRenderer.on(`${downToken}-data`, async (_, data: ExportImportProgress) => {
            if (data.Progress === 1) {
                setRefreshLocalGroup((prev) => !prev)
                setLocalFilter({...localFilter})
                yakitNotify("success", "下载成功")
            }
        })
        ipcRenderer.on(`${downToken}-error`, (_, error) => {
            yakitNotify("error", `[ImportFingerprint] error: ${error}`)
        })
        ipcRenderer.on(`${downToken}-end`, () => {
            setDownloadLoading(false)
            yakitNotify("info", `[ImportFingerprint] finished`)
        })
        return () => {
            if (downToken) {
                ipcRenderer.invoke(`cancel-ImportFingerprint`, downToken)
                ipcRenderer.removeAllListeners(`${downToken}-data`)
                ipcRenderer.removeAllListeners(`${downToken}-error`)
                ipcRenderer.removeAllListeners(`${downToken}-end`)
            }
        }
    }, [downToken])
    // #endregion

    // #region 指纹导入导出
    const importExportContainerRef = useRef<string>(currentPageTabRouteKey)
    const [importExportExtra, setImportExportExtra] = useState<ImportExportModalExtra>({
        hint: false,
        title: "导入指纹",
        type: "import",
        apiKey: "ImportFingerprint"
    })
    const includeIdRef = useRef<number[]>([])
    const handleOpenImportExportHint = useMemoizedFn((extra: Omit<ImportExportModalExtra, "hint">) => {
        if (importExportExtra.hint) return
        importExportContainerRef.current = currentPageTabRouteKey
        setImportExportExtra({...extra, hint: true})
    })
    const handleCallbackImportExportHint = useMemoizedFn((result: boolean) => {
        if (result) {
            const type = importExportExtra.type
            if (type === "export") {
                setRowSelectionKeys([])
            } else {
                setRefreshLocalGroup((prev) => !prev)
                setLocalFilter({...localFilter})
            }
        }
        setImportExportExtra((prev) => {
            return {
                ...prev,
                hint: false
            }
        })
    })
    // #endregion

    return (
        <div className={styles["fingerprintManage"]}>
            <div style={{display: !showEmpty ? "block" : "none", height: "100%"}}>
                <div style={{display: "flex", height: "100%"}}>
                    <div className={styles["fingerprintManage-group"]}>
                        <div className={styles["group-list"]}>
                            <LocalFingerprintGroupList
                                ref={localFingerprintGroupListRef}
                                isrefresh={refreshLocalGroup}
                                onGroupChange={onLocalGroupChange}
                                onSetLocalGroupLen={setLocalGroupLen}
                                onImport={() => {
                                    handleOpenImportExportHint({
                                        title: "导入指纹",
                                        type: "import",
                                        apiKey: "ImportFingerprint"
                                    })
                                }}
                                downloadLoading={downloadLoading}
                                downloadFingerprint={downloadFingerprint}
                            />
                        </div>
                    </div>
                    <div className={styles["fingerprintManage-body"]}>
                        <LocalFingerprintTable
                            filter={localFilter}
                            onSetFilter={setLocalFilter}
                            rowSelectionKeys={rowSelectionKeys}
                            onSetRowSelectionKeys={setRowSelectionKeys}
                            onSetRefreshLocalGroup={setRefreshLocalGroup}
                            onSetLocalFingerprintLen={setLocalFingerprintLen}
                            onImport={() => {
                                handleOpenImportExportHint({
                                    title: "导入指纹",
                                    type: "import",
                                    apiKey: "ImportFingerprint"
                                })
                            }}
                            onExport={(includeId) => {
                                includeIdRef.current = includeId
                                handleOpenImportExportHint({
                                    title: "导出指纹",
                                    type: "export",
                                    apiKey: "ExportFingerprint"
                                })
                            }}
                        />
                    </div>
                </div>
            </div>

            <div
                style={{display: showEmpty && showEmptyInitRef.current ? "block" : "none"}}
                className={styles["fingerprintManage-init"]}
            >
                <YakitEmpty
                    description='可一键获取官方默认指纹库，或导入外部指纹库'
                    className={styles["fingerprintManage-init-empty"]}
                >
                    <div className={styles["fingerprintManage-init-btns"]}>
                        <YakitButton
                            type='outline1'
                            icon={<OutlineClouddownloadIcon />}
                            onClick={downloadFingerprint}
                            loading={downloadLoading}
                        >
                            下载默认指纹库
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            icon={<OutlineImportIcon />}
                            onClick={() => {
                                handleOpenImportExportHint({
                                    title: "导入指纹",
                                    type: "import",
                                    apiKey: "ImportFingerprint"
                                })
                            }}
                        >
                            导入指纹
                        </YakitButton>
                    </div>
                </YakitEmpty>
            </div>
            <ImportExportModal<FingerprintFilter>
                getContainer={
                    document.getElementById(`main-operator-page-body-${importExportContainerRef.current}`) || undefined
                }
                whichUse='fingerprint'
                extra={importExportExtra}
                onCallback={handleCallbackImportExportHint}
                filterData={{
                    ...localFilter,
                    IncludeId: includeIdRef.current
                }}
                yakitFormDraggerProps={{
                    showExtraHelp: <span>，支持导入zip和json</span>,
                    fileExtensionIsExist: true,
                    accept: ".zip,.json"
                }}
            />
        </div>
    )
}
export default FingerprintManage
// #endregion

// #region 本地指纹组列表
interface LocalFingerprintGroupListPropsRefProps {
    handleReset: () => void
}
interface LocalFingerprintGroupListProps {
    ref?: ForwardedRef<LocalFingerprintGroupListPropsRefProps>
    isrefresh?: boolean
    onGroupChange: (groups: string[]) => void
    onSetLocalGroupLen: React.Dispatch<React.SetStateAction<number>>
    onImport: () => void
    downloadLoading: boolean
    downloadFingerprint: () => void
}
const LocalFingerprintGroupList: React.FC<LocalFingerprintGroupListProps> = memo(
    forwardRef((props, ref) => {
        const {isrefresh, onGroupChange, onSetLocalGroupLen, onImport, downloadLoading, downloadFingerprint} = props

        const [data, setData] = useState<FingerprintGroup[]>([])
        const groupLength = useMemo(() => {
            return data.length
        }, [data])
        useEffect(() => {
            onSetLocalGroupLen(groupLength)
        }, [groupLength])

        const wrapperRef = useRef<HTMLDivElement>(null)
        const bodyRef = useRef<HTMLDivElement>(null)
        const [list] = useVirtualList(data, {
            containerTarget: wrapperRef,
            wrapperTarget: bodyRef,
            itemHeight: 40,
            overscan: 5
        })

        useImperativeHandle(ref, () => ({
            handleReset
        }))

        /** ---------- 获取数据 ---------- */
        const [loading, setLoading] = useState<boolean>(false)
        const fetchList = useMemoizedFn(() => {
            if (loading) return

            setLoading(true)
            grpcFetchLocalFingerprintGroupList()
                .then(({Data}) => {
                    setData(Data || [])
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        })

        useEffect(() => {
            fetchList()
        }, [isrefresh])

        /** ---------- 多选逻辑 ---------- */
        const [select, setSelect] = useState<FingerprintGroup[]>([])
        const selectGroups = useMemo(() => {
            return select.map((item) => item.GroupName)
        }, [select])
        useUpdateEffect(() => {
            // 这里的延时触发搜索由外层去控制
            onGroupChange(select.map((item) => item.GroupName))
        }, [select])
        const handleSelect = useMemoizedFn((info: FingerprintGroup) => {
            const isExist = select.find((el) => el.GroupName === info.GroupName)
            if (isExist) setSelect((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            else setSelect((arr) => [...arr, info])
        })
        const handleReset = useMemoizedFn(() => {
            setSelect([])
        })

        // 更新数据
        const handleUpdateData = useMemoizedFn(
            (type: "modify" | "delete", info: FingerprintGroup, newInfo?: FingerprintGroup) => {
                if (type === "modify") {
                    if (!newInfo) {
                        yakitNotify("error", "修改本地指纹组名称错误")
                        return
                    }
                    setData((arr) => {
                        return arr.map((ele) => {
                            if (ele.GroupName === info.GroupName) return cloneDeep(newInfo)
                            return ele
                        })
                    })
                }
                if (type === "delete") {
                    setData((arr) => {
                        return arr.filter((ele) => ele.GroupName !== info.GroupName)
                    })
                }
            }
        )

        /** ---------- 新建 ---------- */
        const [activeAdd, setActiveAdd] = useState<boolean>(false)
        const [groupName, setGroupName] = useState<string>("")
        const addInputRef = useRef<InputRef>(null)
        const handleAddGroup = useMemoizedFn(() => {
            if (activeAdd) return
            setGroupName("")
            setActiveAdd(true)
            setTimeout(() => {
                // 输入框聚焦
                addInputRef.current?.focus()
            }, 10)
        })
        const handleAddGroupBlur = useMemoizedFn(() => {
            if (!groupName) {
                setActiveAdd(false)
                setGroupName("")
                return
            }

            grpcCreateLocalFingerprintGroup({GroupName: groupName, Count: 0})
                .then(() => {
                    setData((arr) => [{GroupName: groupName, Count: 0}].concat([...arr]))
                    setTimeout(() => {
                        setActiveAdd(false)
                        setGroupName("")
                    }, 200)
                })
                .catch(() => {})
        })

        /** ---------- 编辑 ---------- */
        const [editGroups, setEditGroup] = useState<string[]>([])
        const editInputRef = useRef<InputRef>(null)
        const [editInfo, setEditInfo] = useState<FingerprintGroup>()
        const [editName, setEditName] = useState<string>("")
        const initEdit = useMemoizedFn(() => {
            setEditInfo(undefined)
            setEditName("")
        })
        const handleEdit = useMemoizedFn((info: FingerprintGroup) => {
            const {GroupName} = info
            const isExist = editGroups.includes(GroupName)
            if (isExist) return

            setEditInfo(info)
            setEditName(GroupName)
            setTimeout(() => {
                // 输入框聚焦
                editInputRef.current?.focus()
            }, 10)
        })
        const handleDoubleEditBlur = useMemoizedFn(() => {
            if (!editInfo || editName === "" || editInfo.GroupName === editName) {
                initEdit()
                return
            }

            setEditGroup((arr) => [...arr, editInfo.GroupName])
            grpcUpdateLocalFingerprintGroup({GroupName: editInfo.GroupName, NewGroupName: editName})
                .then(() => {
                    // 改名后自动把选中里的该条去掉
                    setSelect((arr) => arr.filter((item) => item.GroupName !== editInfo.GroupName))
                    handleUpdateData("modify", editInfo, {...editInfo, GroupName: editName})
                    initEdit()
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setEditGroup((arr) => arr.filter((ele) => ele !== editInfo.GroupName))
                    }, 200)
                })
        })

        /** ---------- 删除 ---------- */
        const [loadingDelKeys, setLoadingDelKeys] = useState<string[]>([])
        const handleDelete = useMemoizedFn((info: FingerprintGroup) => {
            const {GroupName} = info
            const isExist = loadingDelKeys.includes(GroupName)
            if (isExist) return

            setLoadingDelKeys((arr) => {
                return [...arr, GroupName]
            })
            grpcDeleteLocalFingerprintGroup({GroupNames: [GroupName]})
                .then(() => {
                    // 删除后自动把选中里的该条去掉
                    setSelect((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
                    handleUpdateData("delete", info)
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setLoadingDelKeys((arr) => arr.filter((ele) => ele !== GroupName))
                    }, 200)
                })
        })

        return (
            <div className={styles["fingerprint-group-list"]}>
                <div className={styles["list-header"]}>
                    <div className={styles["title-body"]}>
                        指纹库管理 <YakitRoundCornerTag>{groupLength}</YakitRoundCornerTag>
                    </div>
                    <div className={styles["header-extra"]}>
                        <YakitButton
                            type='text'
                            icon={<OutlineClouddownloadIcon />}
                            loading={downloadLoading}
                            onClick={downloadFingerprint}
                        >
                            下载默认指纹
                        </YakitButton>
                        <Divider type='vertical' />
                        <YakitButton type='text' onClick={handleReset}>
                            重置
                        </YakitButton>
                        <YakitDropdownMenu
                            menu={{
                                data: [
                                    {key: "addGroup", label: "新建分组", itemIcon: <OutlineFolderaddIcon />},
                                    {key: "importFingerprint", label: "导入指纹", itemIcon: <OutlineImportIcon />}
                                ],
                                onClick: ({key}) => {
                                    switch (key) {
                                        case "addGroup":
                                            handleAddGroup()
                                            break
                                        case "importFingerprint":
                                            onImport()
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

                <div className={styles["list-search-and-add"]}>
                    {/* 新建规则组输入框 */}
                    <YakitInput
                        ref={addInputRef}
                        wrapperClassName={activeAdd ? styles["show-add-input"] : styles["hidden-add-input"]}
                        showCount
                        maxLength={50}
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onBlur={handleAddGroupBlur}
                        onPressEnter={handleAddGroupBlur}
                    />
                </div>

                <div className={styles["list-container"]}>
                    <YakitSpin spinning={loading}>
                        <div ref={wrapperRef} className={styles["list-body"]}>
                            <div ref={bodyRef}>
                                {list.length ? (
                                    <>
                                        {list.map((item) => {
                                            const {data} = item
                                            const {GroupName: name} = data

                                            const isCheck = selectGroups.includes(name)
                                            const activeEdit = editInfo?.GroupName === name
                                            const isEditLoading = editGroups.includes(name)
                                            const isDelLoading = loadingDelKeys.includes(name)

                                            return (
                                                <div
                                                    key={name}
                                                    className={classNames(styles["list-local-opt"], {
                                                        [styles["list-local-opt-active"]]: isCheck
                                                    })}
                                                    onClick={() => {
                                                        handleSelect(data)
                                                    }}
                                                >
                                                    {activeEdit ? (
                                                        <YakitInput
                                                            ref={editInputRef}
                                                            allowClear
                                                            showCount
                                                            maxLength={50}
                                                            value={editName}
                                                            onChange={(e) => {
                                                                setEditName(e.target.value)
                                                            }}
                                                            onBlur={handleDoubleEditBlur}
                                                            onPressEnter={handleDoubleEditBlur}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                            }}
                                                        />
                                                    ) : (
                                                        <>
                                                            <div className={styles["info-wrapper"]}>
                                                                <YakitCheckbox
                                                                    checked={isCheck}
                                                                    onChange={() => {
                                                                        handleSelect(data)
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <SolidFolderopenIcon />
                                                                <span
                                                                    className={classNames(
                                                                        styles["title-style"],
                                                                        "yakit-content-single-ellipsis"
                                                                    )}
                                                                    title={data.GroupName}
                                                                >
                                                                    {data.GroupName}
                                                                </span>
                                                            </div>

                                                            <div className={styles["total-style"]}>{data.Count}</div>
                                                            <div
                                                                className={styles["btns-wrapper"]}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                }}
                                                            >
                                                                <YakitButton
                                                                    type='secondary2'
                                                                    icon={<OutlinePencilaltIcon />}
                                                                    loading={isEditLoading}
                                                                    onClick={() => {
                                                                        handleEdit(data)
                                                                    }}
                                                                />
                                                                <YakitButton
                                                                    type='secondary2'
                                                                    colors='danger'
                                                                    icon={<OutlineTrashIcon />}
                                                                    loading={isDelLoading}
                                                                    onClick={() => {
                                                                        handleDelete(data)
                                                                    }}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </>
                                ) : (
                                    <YakitEmpty style={{marginTop: 8}} title='暂无分组'></YakitEmpty>
                                )}
                            </div>
                        </div>
                    </YakitSpin>
                </div>
            </div>
        )
    })
)
// #endregion

// #region 本地指纹列表
type EditableTableProps = Parameters<typeof Table>[0]
type ColumnTypes = Exclude<EditableTableProps["columns"], undefined>
interface LocalFingerprintTableProps {
    filter: FingerprintFilter
    onSetFilter: React.Dispatch<React.SetStateAction<FingerprintFilter>>
    rowSelectionKeys: number[]
    onSetRowSelectionKeys: React.Dispatch<React.SetStateAction<number[]>>
    onSetRefreshLocalGroup: React.Dispatch<React.SetStateAction<boolean>>
    onSetLocalFingerprintLen: React.Dispatch<React.SetStateAction<number>>
    onImport: () => void
    onExport: (includeId: number[]) => void
}
const LocalFingerprintTable: React.FC<LocalFingerprintTableProps> = memo((props) => {
    const {
        filter,
        onSetFilter,
        rowSelectionKeys,
        onSetRowSelectionKeys,
        onSetRefreshLocalGroup,
        onSetLocalFingerprintLen,
        onImport,
        onExport
    } = props
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<QueryFingerprintResponse>({
        Data: [],
        Pagination: {...genDefaultPagination(20), OrderBy: "created_at"},
        Total: 0
    })
    const [batchDelLoading, setBatchDelLoading] = useState<boolean>(false)

    const queyChangeUpdateData = useDebounceFn(
        () => {
            update(1, data.Pagination.Limit)
        },
        {wait: 500}
    ).run
    useEffect(() => {
        queyChangeUpdateData()
    }, [filter])

    const tableHeaderTitle = useMemo(() => {
        if (!filter.GroupName) return "全部"
        if (filter.GroupName.length === 0) return "全部"
        return filter.GroupName.join(",")
    }, [filter.GroupName])

    const update = useMemoizedFn((page: number, limit: number) => {
        if (loading) return

        setLoading(true)
        const request: QueryFingerprintRequest = {
            Filter: {...filter},
            Pagination: {
                Page: page,
                Limit: limit,
                OrderBy: "created_at",
                Order: "desc"
            }
        }
        grpcFetchLocalFingerprintList(request)
            .then((res) => {
                setData(res)

                onSetRowSelectionKeys([])
                setEditingObj(undefined)
                setSelectObj(undefined)
                callCountRef.current = 0
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 150)
            })
    })
    useDebounceEffect(
        () => {
            if (data.Data.length === 0 && data.Pagination.Page != 1) {
                update(1, data.Pagination.Limit)
            }
            onSetLocalFingerprintLen(+data.Total)
        },
        [data],
        {wait: 300}
    )

    const [groupsOptions, setGroupsOptions] = useState<{label: string; value: string}[]>([])
    const defaultColumns: (ColumnTypes[number] & {
        editable?: boolean
        editType?: "input" | "select"
        selectValLimit?: number
        options?: {label: string; value: string}[]
        dataIndex: string
    })[] = [
        {
            title: () => (
                <div className={styles["order"]}>
                    {(data.Data || []).length > 0 && (
                        <YakitCheckbox
                            indeterminate={rowSelectionKeys.length > 0 && rowSelectionKeys.length !== data.Data.length}
                            checked={rowSelectionKeys.length === data.Data.length}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    onSetRowSelectionKeys((data.Data || []).map((item) => item.Id))
                                } else {
                                    onSetRowSelectionKeys([])
                                }
                            }}
                        />
                    )}
                    序号
                </div>
            ),
            dataIndex: "index",
            width: 88,
            render: (text, record, index) => {
                const limit = data.Pagination.Limit
                const page = data.Pagination.Page - 1
                const order: number = limit * page + index + 1
                const {Id} = record as FingerprintRule
                return (
                    <div className={styles["order"]}>
                        <YakitCheckbox
                            checked={rowSelectionKeys.includes(Id)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    onSetRowSelectionKeys((prev) => [...prev, Id])
                                } else {
                                    onSetRowSelectionKeys((prev) => {
                                        return prev.filter((key) => key !== Id)
                                    })
                                }
                            }}
                        />

                        <div className={styles["basic"]}>{order < 10 ? `0${order}` : `${order}`}</div>
                    </div>
                )
            }
        },
        {
            title: "指纹名",
            dataIndex: "RuleName",
            editable: true,
            editType: "input",
            width: "10%",
            ellipsis: true,
            render: (text) => (
                <div
                    className={classNames(styles["basic"], "yakit-content-single-ellipsis")}
                    style={{overflow: "hidden"}}
                >
                    {text}
                </div>
            )
        },
        {
            title: "规则",
            dataIndex: "MatchExpression",
            editable: true,
            editType: "input",
            ellipsis: true,
            width: "60%",
            render: (text) => (
                <div
                    className={classNames(styles["basic"], "yakit-content-single-ellipsis")}
                    style={{overflow: "hidden"}}
                >
                    {text}
                </div>
            )
        },
        {
            title: "分组",
            dataIndex: "GroupName",
            editable: true,
            editType: "select",
            selectValLimit: 50,
            options: groupsOptions,
            ellipsis: true,
            width: "20%",
            render: (text) => (
                <div
                    className={classNames(styles["basic"], "yakit-content-single-ellipsis")}
                    style={{overflow: "hidden"}}
                >
                    {text + ""}
                </div>
            )
        },
        {
            title: "操作",
            dataIndex: "operation",
            width: 88,
            // @ts-ignore
            render: (_, record: FingerprintRule) => {
                return (
                    <div className={styles["table-operation"]}>
                        <OutlineTrashIcon
                            className={styles["delete"]}
                            onClick={() => {
                                grpcDeleteFingerprint({Filter: {IncludeId: [record.Id]}})
                                    .then(() => {
                                        yakitNotify("success", "删除成功")
                                        onSetRefreshLocalGroup((prev) => !prev)
                                        let page = data.Pagination.Page
                                        if (data.Data.length === 1) {
                                            page = 1
                                        }
                                        update(page, data.Pagination.Limit)
                                    })
                                    .catch(() => {})
                            }}
                        />
                        <Divider type='vertical' style={{top: 1, height: 12, margin: "0px 12px"}} />
                        <OutlinePencilaltIcon
                            className={styles["edit"]}
                            onClick={() => {
                                editInfoRef.current = record
                                setFingerprintFormVisible(true)
                            }}
                        />
                    </div>
                )
            }
        }
    ]
    // 编辑
    const [editingObj, setEditingObj] = useState<EditingObjProps>()
    const isEditing = (record: FingerprintRule, dataIndex) =>
        record.Id === editingObj?.Id && dataIndex === editingObj?.dataIndex
    // 单击边框
    const [selectObj, setSelectObj] = useState<EditingObjProps>()
    const isSelect = (record: FingerprintRule, dataIndex) =>
        record.Id === selectObj?.Id && dataIndex === selectObj?.dataIndex

    const handleSave = (row: FingerprintRule, newRow: FingerprintRule) => {
        setEditingObj(undefined)
        if (newRow.RuleName.length && newRow.MatchExpression.length) {
            // 此处默认修改成功 优化交互闪烁(因此如若修改失败则会闪回)
            if (data.Data.length) {
                setData((prev) => {
                    const newData = prev.Data.map((item) => {
                        if (item.Id === row.Id) {
                            return newRow
                        } else {
                            return item
                        }
                    })
                    return {
                        ...prev,
                        Data: newData
                    }
                })
            }

            // 真正的更改与更新数据
            const groupNameChangeFlag = JSON.stringify(row.GroupName) !== JSON.stringify(newRow.GroupName)
            if (
                row.RuleName !== newRow.RuleName ||
                row.MatchExpression !== newRow.MatchExpression ||
                groupNameChangeFlag
            ) {
                grpcUpdateFingerprint({
                    Id: row.Id,
                    Rule: {
                        ...row,
                        RuleName: newRow.RuleName,
                        MatchExpression: newRow.MatchExpression,
                        GroupName: newRow.GroupName
                    }
                })
                    .then(() => {
                        yakitNotify("success", "更新成功")
                        if (groupNameChangeFlag) {
                            onSetRefreshLocalGroup((prev) => !prev)
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        update(data.Pagination.Page, data.Pagination.Limit)
                    })
            }
        } else if (newRow.RuleName.length === 0) {
            yakitNotify("warning", "指纹名不能为空")
        } else if (newRow.MatchExpression.length === 0) {
            yakitNotify("warning", "规则不能为空")
        }
    }

    const callCountRef = useRef<number>(0)
    const handleRowClick = (record, column) => {
        if (record.Id === editingObj?.Id && column.dataIndex === editingObj?.dataIndex) {
            return
        }
        if (record.Id !== editingObj?.Id || column.dataIndex !== editingObj?.dataIndex) {
            setEditingObj(undefined)
            setSelectObj(undefined)
        }
        callCountRef.current += 1
        if (callCountRef.current >= 2) {
            callCountRef.current = 0 // 重置计数器
            setEditingObj({Id: record.Id, dataIndex: column.dataIndex})
            if (column.editType === "select" && column.dataIndex === "GroupName") {
                grpcFetchLocalFingerprintGroupList()
                    .then(({Data}) => {
                        setGroupsOptions(
                            Data.map((item) => {
                                return {label: item.GroupName, value: item.GroupName}
                            }) || []
                        )
                    })
                    .catch(() => {})
            }
        } else if (callCountRef.current === 1) {
            // 这里开启一个定时器，若在300ms内没有第二次点击，则重置计数器
            setTimeout(() => {
                callCountRef.current = 0
            }, 300)
            setSelectObj({Id: record.Id, dataIndex: column.dataIndex})
        }
    }

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return {
                ...col,
                onCell: (record: FingerprintRule) => ({
                    onClick: () => setSelectObj(undefined)
                })
            }
        }
        return {
            ...col,
            onCell: (record: FingerprintRule) => ({
                record,
                editType: col.editType,
                selectValLimit: col.selectValLimit,
                options: col.options,
                editable: col.editable,
                dataIndex: col.dataIndex,
                editing: isEditing(record, col.dataIndex),
                selected: isSelect(record, col.dataIndex),
                handleSave,
                onClick: () => handleRowClick(record, col)
            })
        }
    })

    const editInfoRef = useRef<FingerprintRule>()
    const [fingerprintFormVisible, setFingerprintFormVisible] = useState<boolean>(false)
    return (
        <div className={styles["fingerprintTable"]}>
            <div className={styles["table-header"]}>
                <div className={styles["header-body"]}>
                    <div className={styles["header-title"]}>
                        <Tooltip placement='bottom' title={tableHeaderTitle}>
                            <span className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}>
                                {tableHeaderTitle}
                            </span>
                        </Tooltip>
                    </div>

                    <div className={styles["header-extra"]}>
                        <YakitInput.Search
                            placeholder='请输入关键词搜索'
                            allowClear
                            onSearch={(val) => {
                                onSetFilter((prev) => {
                                    return {...prev, Keyword: val.trim()}
                                })
                            }}
                        />
                        <div className={styles["divider-style"]}></div>

                        <div className={styles["btns-group"]}>
                            {rowSelectionKeys.length ? (
                                <YakitButton
                                    type='outline1'
                                    colors='danger'
                                    icon={<OutlineTrashIcon />}
                                    disabled={!rowSelectionKeys.length}
                                    loading={batchDelLoading}
                                    onClick={() => {
                                        setBatchDelLoading(true)
                                        grpcDeleteFingerprint({
                                            Filter: {
                                                IncludeId: rowSelectionKeys
                                            }
                                        })
                                            .then(() => {
                                                yakitNotify("success", "删除成功")
                                                onSetRefreshLocalGroup((prev) => !prev)
                                                let page = data.Pagination.Page
                                                if (rowSelectionKeys.length === data.Data.length) {
                                                    page = 1
                                                }
                                                update(1, data.Pagination.Limit)
                                            })
                                            .catch(() => {})
                                            .finally(() => {
                                                setBatchDelLoading(false)
                                            })
                                    }}
                                />
                            ) : (
                                <YakitButton
                                    type='outline1'
                                    colors='danger'
                                    icon={<OutlineTrashIcon />}
                                    loading={batchDelLoading}
                                    onClick={() => {
                                        setBatchDelLoading(true)
                                        grpcDeleteFingerprint({
                                            Filter: {
                                                ...filter,
                                                IncludeId: []
                                            }
                                        })
                                            .then(() => {
                                                yakitNotify("success", "删除成功")
                                                onSetRefreshLocalGroup((prev) => !prev)
                                                update(1, data.Pagination.Limit)
                                            })
                                            .catch(() => {})
                                            .finally(() => {
                                                setBatchDelLoading(false)
                                            })
                                    }}
                                >
                                    清空
                                </YakitButton>
                            )}

                            <YakitButton
                                type='outline2'
                                icon={<OutlineExportIcon />}
                                onClick={() => {
                                    onExport(rowSelectionKeys.length === data.Data.length ? [] : rowSelectionKeys)
                                }}
                            >
                                导出
                            </YakitButton>

                            <YakitButton type='outline2' icon={<OutlineImportIcon />} onClick={onImport}>
                                导入
                            </YakitButton>

                            <YakitButton
                                type='outline2'
                                icon={<OutlinePlusIcon />}
                                onClick={() => {
                                    editInfoRef.current = undefined
                                    setFingerprintFormVisible(true)
                                }}
                            >
                                新建
                            </YakitButton>
                        </div>
                    </div>
                </div>

                <div className={styles["header-body"]}>
                    <div className={styles["header-title"]}>
                        <TableTotalAndSelectNumber total={data.Total} selectNum={rowSelectionKeys.length} />
                    </div>
                    <div className={styles["header-extra"]}>
                        <UpdateFingerprintToGroup
                            allCheck={rowSelectionKeys.length === data.Data.length && !!rowSelectionKeys.length}
                            rules={rowSelectionKeys}
                            filters={filter}
                            callback={() => {
                                onSetRefreshLocalGroup((prev) => !prev)
                                update(1, data.Pagination.Limit)
                            }}
                        />
                        <YakitButton
                            type='text'
                            style={{padding: 0}}
                            onClick={() => {
                                let m = showYakitModal({
                                    title: "指纹规则",
                                    width: "75%",
                                    closable: true,
                                    maskClosable: false,
                                    content: <FingerprintRuleDom />,
                                    footer: (
                                        <div style={{textAlign: "right", width: "100%", padding: 8}}>
                                            <YakitButton
                                                type='primary'
                                                onClick={() => {
                                                    m.destroy()
                                                }}
                                            >
                                                我知道了
                                            </YakitButton>
                                        </div>
                                    )
                                })
                            }}
                        >
                            指纹规则
                        </YakitButton>
                    </div>
                </div>
            </div>
            <div className={styles["table-body"]}>
                <Table
                    rowKey={(i: FingerprintRule) => i.Id}
                    components={{
                        body: {
                            cell: (props) => <EditableCell<FingerprintRule> {...props} />
                        }
                    }}
                    loading={loading}
                    bordered
                    size='small'
                    dataSource={data.Data}
                    // @ts-ignore
                    columns={columns as ColumnTypes}
                    pagination={{
                        showQuickJumper: true,
                        current: parseInt(`${data.Pagination.Page}`),
                        pageSize: parseInt(`${data.Pagination.Limit}`), // 每页显示的条目数量
                        total: data.Total,
                        pageSizeOptions: ["10", "20", "30", "40"], // 指定每页显示条目数量的选项
                        showSizeChanger: true, // 是否显示切换每页条目数量的控件
                        showTotal: (i) => <span className={styles["show-total"]}>共{i}条记录</span>,
                        onChange: (page: number, limit: number) => {
                            onSetRowSelectionKeys([])
                            update(page, limit)
                        },
                        onShowSizeChange: (old, limit) => {
                            update(1, limit)
                        },
                        size: "small"
                    }}
                />
            </div>

            {/* 新建编辑指纹 */}
            {fingerprintFormVisible && (
                <FingerprintFormModal
                    initialValues={
                        editInfoRef.current
                            ? {
                                  RuleName: editInfoRef.current.RuleName,
                                  MatchExpression: editInfoRef.current.MatchExpression,
                                  GroupName: editInfoRef.current.GroupName
                              }
                            : undefined
                    }
                    onOk={(value) => {
                        if (editInfoRef.current) {
                            grpcUpdateFingerprint({
                                Id: editInfoRef.current.Id,
                                Rule: {
                                    ...editInfoRef.current,
                                    RuleName: value.RuleName,
                                    MatchExpression: value.MatchExpression,
                                    GroupName: value.GroupName
                                }
                            })
                                .then(() => {
                                    yakitNotify("success", "更新成功")
                                    if (editInfoRef.current) {
                                        if (
                                            JSON.stringify(value.GroupName) !==
                                            JSON.stringify(editInfoRef.current.GroupName)
                                        ) {
                                            onSetRefreshLocalGroup((prev) => !prev)
                                        }
                                    }
                                    editInfoRef.current = undefined
                                    setFingerprintFormVisible(false)
                                    update(data.Pagination.Page, data.Pagination.Limit)
                                })
                                .catch(() => {})
                        } else {
                            grpcCreateFingerprint({
                                Rule: {
                                    RuleName: value.RuleName,
                                    MatchExpression: value.MatchExpression,
                                    GroupName: value.GroupName
                                }
                            })
                                .then(() => {
                                    yakitNotify("success", "创建成功")
                                    setFingerprintFormVisible(false)
                                    onSetRefreshLocalGroup((prev) => !prev)
                                    update(1, data.Pagination.Limit)
                                })
                                .catch(() => {})
                        }
                    }}
                    onCancel={() => {
                        setFingerprintFormVisible(false)
                    }}
                />
            )}
        </div>
    )
})
// #endregion

// #region 指纹创建编辑弹窗
interface FingerprintForm {
    RuleName: string
    MatchExpression: string
    GroupName: string[]
}
interface FingerprintFormModalProps {
    initialValues?: FingerprintForm
    onOk: (value: FingerprintForm) => void
    onCancel: () => void
}
const FingerprintFormModal: React.FC<FingerprintFormModalProps> = (props) => {
    const {initialValues, onOk, onCancel} = props

    const [form] = Form.useForm()

    useEffect(() => {
        handleSearchGroup()
    }, [])

    const [groups, setGroups] = useState<{label: string; value: string}[]>([])
    const handleSearchGroup = useMemoizedFn(() => {
        grpcFetchLocalFingerprintGroupList()
            .then(({Data}) => {
                setGroups(
                    Data.map((item) => {
                        return {label: item.GroupName, value: item.GroupName}
                    }) || []
                )
            })
            .catch(() => {})
    })

    const [groupSearch, setGroupSearch] = useState<string>("")
    const handleGroupSearchChange = useMemoizedFn((val: string) => {
        if (val.trim().length > 50) return
        setGroupSearch(val)
    })

    return (
        <YakitModal
            visible={true}
            title={(initialValues ? "编辑" : "创建") + "指纹"}
            width={500}
            onOk={() => {
                form.validateFields()
                    .then((value) => {
                        onOk(value)
                    })
                    .catch(() => {})
            }}
            onCancel={onCancel}
        >
            <Form
                form={form}
                layout={"horizontal"}
                labelCol={{span: 5}}
                wrapperCol={{span: 18}}
                initialValues={initialValues}
                onSubmitCapture={(e) => {
                    e.preventDefault()
                }}
            >
                <Form.Item label='指纹名' name='RuleName' rules={[{required: true, message: "请填写指纹名"}]}>
                    <YakitInput></YakitInput>
                </Form.Item>
                <Form.Item label='规则' name='MatchExpression' rules={[{required: true, message: "请填写规则"}]}>
                    <YakitInput.TextArea></YakitInput.TextArea>
                </Form.Item>
                <Form.Item label='分组' name='GroupName'>
                    <YakitSelect
                        mode='tags'
                        placeholder='请选择分组'
                        allowClear
                        options={groups}
                        searchValue={groupSearch}
                        onSearch={handleGroupSearchChange}
                        onChange={() => {
                            setGroupSearch("")
                        }}
                    />
                </Form.Item>
            </Form>
        </YakitModal>
    )
}
// #endregion

// #region 表格单元格
interface EditableCellProps<T> {
    editType: "input" | "select"
    selectValLimit: number
    options: {label: string; value: string}[]
    editing: boolean
    editable: boolean
    selected: boolean
    children: React.ReactNode
    dataIndex: keyof T
    record: T
    handleSave: (record: T, newRecord: T) => void
}
const EditableCell = <T,>({
    editType,
    selectValLimit = 100,
    options,
    editing,
    editable,
    selected,
    children,
    dataIndex,
    record,
    handleSave,
    ...restProps
}: EditableCellProps<T>) => {
    const [value, setValue] = useState<string>("")

    useEffect(() => {
        if (editable && editing) {
            setValue(record[dataIndex as string])
        }
    }, [])

    const save = async () => {
        try {
            handleSave(record, {...record, [dataIndex]: value})
        } catch (errInfo) {
            console.log("Save failed:", errInfo)
        }
    }
    const [groupSearch, setGroupSearch] = useState<string>("")
    const handleGroupSearchChange = useMemoizedFn((val: string) => {
        if (val.trim().length > selectValLimit) return
        setGroupSearch(val)
    })

    return (
        <td
            {...restProps}
            style={{position: "relative", padding: editable && editing ? 0 : 8}}
            className={classNames({
                [styles["td-active-border"]]: selected
            })}
        >
            {editable && editing ? (
                <div style={{width: "100%"}}>
                    {editType === "input" && (
                        <YakitInput.TextArea
                            style={{
                                resize: "none",
                                fontSize: "12px",
                                padding: "7px 15px",
                                lineHeight: "16px",
                                borderRadius: 0
                            }}
                            rows={1}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                            onPressEnter={save}
                            onBlur={save}
                        />
                    )}

                    {editType === "select" && (
                        <YakitSelect
                            wrapperClassName={styles["editableCell-select"]}
                            mode='tags'
                            defaultOpen
                            allowClear
                            autoFocus
                            options={options}
                            value={value}
                            searchValue={groupSearch}
                            onSearch={handleGroupSearchChange}
                            onChange={(value) => {
                                setValue(value)
                                setGroupSearch("")
                            }}
                            onBlur={save}
                        />
                    )}
                </div>
            ) : (
                <>{children}</>
            )}
        </td>
    )
}
// #endregion

// #region 更新指纹添加到组
interface UpdateFingerprintToGroupProps {
    allCheck: boolean
    rules: number[]
    filters: FingerprintFilter
    /** 完成操作后触发指纹组数据刷新 */
    callback: () => void
}
interface FrontFingerprintGroup extends FingerprintGroup {
    /** 是否为新建组 */
    isCreate: boolean
}
const UpdateFingerprintToGroup: React.FC<UpdateFingerprintToGroupProps> = memo((props) => {
    const {allCheck, rules, filters, callback} = props

    /** 添加分组按钮是否可用 */
    const isActive = useMemo(() => {
        if (allCheck) return true
        return !!rules.length
    }, [allCheck, rules])
    // 生成指纹的请求参数
    const ruleRequest = useMemoizedFn(() => {
        if (allCheck) return cloneDeep(filters)
        else return {IncludeId: rules}
    })

    // 规则所属组交集
    const [oldGroup, setOldGroup, getOldGroup] = useGetSetState<FrontFingerprintGroup[]>([])
    // 全部规则组
    const allGroup = useRef<FrontFingerprintGroup[]>([])
    // 可选规则组
    const [showGroup, setShowGroup] = useState<FrontFingerprintGroup[]>([])
    // 搜索内容
    const [search, setSearch] = useState<string>("")

    // 新加规则组
    const [addGroup, setAddGroup] = useState<FrontFingerprintGroup[]>([])
    // 移除规则组
    const [removeGroup, setRemoveGroup] = useState<FrontFingerprintGroup[]>([])

    /** ---------- 获取规则所属组交集、全部规则组-逻辑 Start ---------- */
    const getFilter = useMemoizedFn(() => {
        return cloneDeep(filters)
    })
    useDebounceEffect(
        () => {
            if (!allCheck && rules.length === 0) {
                setOldGroup([])
                return
            }

            let request: FingerprintFilter = {}
            if (allCheck) request = getFilter() || {}
            else request.IncludeId = rules

            grpcFetchFingerprintForSameGroup({Filter: request})
                .then(({Data}) => {
                    setOldGroup(
                        (Data || []).map((item) => ({
                            ...item,
                            isCreate: false
                        }))
                    )
                })
                .catch(() => {
                    setOldGroup([])
                })
        },
        [allCheck, rules],
        {wait: 300}
    )

    // 新加规则组popover
    const [addGroupVisible, setAddGroupVisible] = useState<boolean>(false)
    const handleAddGroupVisibleChange = useMemoizedFn((visible: boolean) => {
        setAddGroupVisible(visible)
    })

    const loading = useRef<boolean>(false)
    useEffect(() => {
        if (addGroupVisible) {
            setAddGroup([])
            setRemoveGroup([...getOldGroup()])
            if (loading.current) return
            loading.current = true
            grpcFetchLocalFingerprintGroupList()
                .then(({Data}) => {
                    const groups = (Data || []).map((item) => ({...item, isCreate: false}))
                    allGroup.current = groups
                    setShowGroup(allGroup.current)
                })
                .catch(() => {})
                .finally(() => {
                    loading.current = false
                })
        }
    }, [addGroupVisible])
    /** ---------- 获取规则所属组交集、全部规则组-逻辑 End ---------- */

    /** ---------- 移除旧规则组 Start ---------- */
    const delGroups = useRef<string[]>([])
    // 单个
    const handleSingleRemove = useMemoizedFn((info: FrontFingerprintGroup) => {
        if (!info) return
        const isExist = delGroups.current.includes(info.GroupName)
        if (isExist) return

        delGroups.current = [...delGroups.current, info.GroupName]
        const request: BatchUpdateFingerprintToGroupRequest = {
            Filter: ruleRequest(),
            AppendGroupName: [],
            DeleteGroupName: [info.GroupName]
        }
        grpcUpdateFingerprintToGroup(request)
            .then(() => {
                setOldGroup((groups) => groups.filter((item) => item.GroupName !== info.GroupName))
                callback()
            })
            .catch(() => {})
            .finally(() => {
                delGroups.current = delGroups.current.filter((item) => item !== info.GroupName)
            })
    })

    // 批量
    const handleAllRemove = useMemoizedFn(() => {
        const request: BatchUpdateFingerprintToGroupRequest = {
            Filter: ruleRequest(),
            AppendGroupName: [],
            DeleteGroupName: oldGroup.map((item) => item.GroupName)
        }
        grpcUpdateFingerprintToGroup(request)
            .then(() => {
                callback()
                setOldGroup([])
            })
            .catch(() => {})
    })
    /** ---------- 移除旧规则组 End ---------- */

    /** ---------- 新增规则组逻辑 Start ---------- */
    useDebounceEffect(
        () => {
            setShowGroup(allGroup.current.filter((item) => item.GroupName.indexOf(search || "") > -1))
        },
        [search],
        {wait: 300}
    )

    // 新建一条规则组
    const handleCreateGroup = useMemoizedFn((name: string) => {
        const group: FrontFingerprintGroup = {
            GroupName: name,
            Count: 0,
            isCreate: true
        }
        setAddGroup((arr) => [...arr, group])
        allGroup.current = [group, ...allGroup.current]
        setShowGroup((arr) => [group, ...arr])
    })

    const handleSearchEnter = useMemoizedFn(() => {
        if (showGroup.length > 0) return
        handleCreateGroup(search)
        setSearch("")
    })
    const handleCheckboxCreate = useMemoizedFn(() => {
        if (showGroup.length > 0) return
        handleCreateGroup(search)
        setSearch("")
    })

    const handleCheck = useMemoizedFn((checked: boolean, info: FrontFingerprintGroup) => {
        if (checked) {
            // 判断规则组是否属于已经存在于交集的规则组
            const isExist = oldGroup.findIndex((item) => item.GroupName === info.GroupName) > -1
            const setHooks = isExist ? setRemoveGroup : setAddGroup
            setHooks((arr) => [...arr, info])
            return
        } else {
            const isExistRemove = removeGroup.findIndex((item) => item.GroupName === info.GroupName) > -1
            const setHooks = isExistRemove ? setRemoveGroup : setAddGroup
            setHooks((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            if (!isExistRemove && info.isCreate) {
                // 新建的规则组在取消勾选后要从列表中移除
                allGroup.current = allGroup.current.filter((item) => item.GroupName !== info.GroupName)
                setShowGroup((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            }
        }
    })

    const [confirmVisible, setConfirmVisible] = useState<boolean>(false)
    const [submitLoading, setSubmitLoading] = useState<boolean>(false)
    const handleSubmit = useMemoizedFn(() => {
        if (submitLoading) return

        const request: BatchUpdateFingerprintToGroupRequest = {
            Filter: ruleRequest(),
            AppendGroupName: [],
            DeleteGroupName: []
        }
        request.DeleteGroupName = oldGroup
            .filter((item) => removeGroup.findIndex((i) => i.GroupName === item.GroupName) === -1)
            .map((item) => item.GroupName)
        request.AppendGroupName = addGroup.map((item) => item.GroupName)

        setSubmitLoading(true)
        grpcUpdateFingerprintToGroup(request)
            .then(() => {
                callback()
                handelCancel()
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setSubmitLoading(false)
                }, 300)
            })
    })

    const handelCancel = useMemoizedFn(() => {
        setAddGroupVisible(false)
        setConfirmVisible(false)
    })
    /** ---------- 新增规则组逻辑 End ---------- */

    return (
        <div className={styles["update-fingerprint-to-group"]}>
            {oldGroup.length > 0 && (
                <div className={styles["group-tags"]}>
                    {oldGroup.length <= 2 ? (
                        oldGroup.map((item) => {
                            return (
                                <YakitTag
                                    key={item.GroupName}
                                    color='info'
                                    closable
                                    onClose={() => {
                                        handleSingleRemove(item)
                                    }}
                                >
                                    {item.GroupName}
                                </YakitTag>
                            )
                        })
                    ) : (
                        <YakitPopover
                            overlayClassName={styles["fingerprint-group-intersection-popover"]}
                            content={
                                <div className={styles["fingerprint-group-intersection"]}>
                                    {oldGroup.map((item) => {
                                        return (
                                            <Tooltip key={item.GroupName} placement='top' title={item.GroupName}>
                                                <YakitTag
                                                    key={item.GroupName}
                                                    color='info'
                                                    closable
                                                    onClose={() => {
                                                        handleSingleRemove(item)
                                                    }}
                                                >
                                                    {item.GroupName}
                                                </YakitTag>
                                            </Tooltip>
                                        )
                                    })}
                                </div>
                            }
                            trigger='hover'
                            placement='bottom'
                        >
                            <YakitTag closable onClose={handleAllRemove}>
                                规则组{oldGroup.length}
                            </YakitTag>
                        </YakitPopover>
                    )}
                </div>
            )}

            <YakitPopover
                overlayClassName={styles["add-and-remove-group-popover"]}
                visible={addGroupVisible}
                placement='bottomRight'
                trigger='click'
                content={
                    <div className={styles["add-and-remove-group"]}>
                        <div className={styles["search-header"]}>
                            勾选表示加入组，取消勾选则表示移出组，创建新分组直接在输入框输入名称回车即可。
                        </div>
                        <div className={styles["search-input"]}>
                            <YakitInput
                                placeholder='输入关键字...'
                                maxLength={50}
                                allowClear
                                prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                                value={search}
                                onChange={(e) => {
                                    const val = e.target.value.trim()
                                    setSearch(val)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.stopPropagation()
                                        handleSearchEnter()
                                    }
                                }}
                            />
                        </div>
                        <div className={styles["group-list"]}>
                            {showGroup.length === 0 && search && (
                                <div className={styles["group-list-item"]}>
                                    <YakitCheckbox onChange={handleCheckboxCreate}>
                                        <span
                                            className={classNames(
                                                styles["title-style"],
                                                "yakit-content-single-ellipsis"
                                            )}
                                            title={search}
                                        >
                                            新增分组 "{search}"
                                        </span>
                                    </YakitCheckbox>
                                </div>
                            )}
                            {showGroup.map((item) => {
                                const {GroupName} = item
                                const isCheck =
                                    [...addGroup, ...removeGroup].findIndex((item) => item.GroupName === GroupName) > -1
                                return (
                                    <div
                                        key={item.GroupName}
                                        className={styles["group-list-item"]}
                                        onClick={() => {
                                            handleCheck(!isCheck, item)
                                        }}
                                    >
                                        <YakitCheckbox
                                            checked={isCheck}
                                            onChange={(e) => {
                                                e.stopPropagation()
                                                handleCheck(e.target.checked, item)
                                            }}
                                        />
                                        <span className={styles["title-style"]}>{item.GroupName}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className={styles["group-footer"]}>
                            <div className={styles["group-footer-btns"]}>
                                <YakitButton type='outline2' onClick={handelCancel}>
                                    取消
                                </YakitButton>
                                <YakitButton
                                    loading={submitLoading}
                                    onClick={() => {
                                        if (
                                            allCheck &&
                                            Object.values(ruleRequest()).every((val) => {
                                                if (val === "" || val === undefined || val === null) return true
                                                if (Array.isArray(val) && val.length === 0) return true
                                                if (typeof val === "object" && Object.keys(val).length === 0)
                                                    return true
                                                return false
                                            })
                                        ) {
                                            setAddGroupVisible(false)
                                            setConfirmVisible(true)
                                        } else {
                                            handleSubmit()
                                        }
                                    }}
                                >
                                    确认
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                }
                onVisibleChange={handleAddGroupVisibleChange}
            >
                <YakitButton type='text' disabled={!isActive} icon={<OutlinePluscircleIcon />}>
                    {oldGroup.length ? undefined : "添加分组"}
                </YakitButton>
            </YakitPopover>
            <YakitHint
                visible={confirmVisible}
                title='提示'
                content='确定要添加所有数据到分组吗？'
                onCancel={() => {
                    setConfirmVisible(false)
                }}
                onOk={handleSubmit}
            ></YakitHint>
        </div>
    )
})
// #endregion
