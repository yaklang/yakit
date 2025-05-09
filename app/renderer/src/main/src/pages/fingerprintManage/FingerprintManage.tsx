import React, {ForwardedRef, forwardRef, memo, useEffect, useMemo, useRef, useState} from "react"
import styles from "./FingerprintManage.module.scss"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineClouddownloadIcon,
    OutlineImportIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useDebounceFn, useMemoizedFn, useUpdateEffect, useVirtualList} from "ahooks"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import classNames from "classnames"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {SolidFolderopenIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"
import {cloneDeep} from "lodash"
import {InputRef} from "antd"

interface FingerprintManageProp {}
const FingerprintManage: React.FC<FingerprintManageProp> = (props) => {
    const downloadFingerprint = useMemoizedFn(() => {})
    const importFingerprint = useMemoizedFn(() => {})

    return (
        <div className={styles["fingerprintManage"]}>
            {false ? (
                <>
                    <div className={styles["fingerprintManage-group"]}>
                        <div className={styles["group-list"]}></div>
                    </div>
                    <div className={styles["fingerprintManage-body"]}></div>
                </>
            ) : (
                <div className={styles["fingerprintManage-init"]}>
                    <YakitEmpty
                        description='可一键获取官方默认指纹库，或导入外部指纹库'
                        className={styles["fingerprintManage-init-empty"]}
                    >
                        <div className={styles["fingerprintManage-init-btns"]}>
                            <YakitButton
                                type='outline1'
                                icon={<OutlineClouddownloadIcon />}
                                onClick={downloadFingerprint}
                            >
                                下载默认指纹库
                            </YakitButton>
                            <YakitButton type='primary' icon={<OutlineImportIcon />} onClick={importFingerprint}>
                                导入指纹
                            </YakitButton>
                        </div>
                    </YakitEmpty>
                </div>
            )}
        </div>
    )
}

export default FingerprintManage

interface LocalFingerprintGroupListPropsRefProps {
    handleReset: () => void
}
interface LocalFingerprintGroupListProps {
    ref?: ForwardedRef<LocalFingerprintGroupListPropsRefProps>
    isrefresh?: boolean
    onGroupChange: (groups: string[]) => void
}
const LocalFingerprintGroupList: React.FC<LocalFingerprintGroupListProps> = memo(
    forwardRef((props, ref) => {
        const {isrefresh, onGroupChange} = props

        const [data, setData] = useState<any[]>([])
        const groupLength = useMemo(() => {
            return data.length
        }, [data])

        const wrapperRef = useRef<HTMLDivElement>(null)
        const bodyRef = useRef<HTMLDivElement>(null)
        const [list] = useVirtualList(data, {
            containerTarget: wrapperRef,
            wrapperTarget: bodyRef,
            itemHeight: 40,
            overscan: 5
        })

        /** ---------- 获取数据 ---------- */
        const [loading, setLoading] = useState<boolean>(false)
        const fetchList = useMemoizedFn(() => {
            if (loading) return

            // const request: QuerySyntaxFlowRuleGroupRequest = {Pagination: DefaultRuleGroupFilterPageMeta, Filter: {}}
            // if (search.current) {
            //     request.Filter = {KeyWord: search.current || ""}
            // }

            setLoading(true)
            // grpcFetchLocalFingerprintGroupList(request)
            //     .then(({Group}) => {
            //         setData(Group || [])
            //     })
            //     .catch(() => {})
            //     .finally(() => {
            //         setTimeout(() => {
            //             setLoading(false)
            //         }, 200)
            //     })
        })

        useEffect(() => {
            fetchList()
        }, [isrefresh])

        // 搜索
        const search = useRef<string>("")
        const handleSearch = useDebounceFn(
            (val: string) => {
                search.current = val
                fetchList()
            },
            {wait: 200}
        ).run

        /** ---------- 多选逻辑 ---------- */
        const [select, setSelect] = useState<any[]>([])
        const selectGroups = useMemo(() => {
            return select.map((item) => item.GroupName)
        }, [select])
        useUpdateEffect(() => {
            // 这里的延时触发搜索由外层去控制
            onGroupChange(select.map((item) => item.GroupName))
        }, [select])
        const handleSelect = useMemoizedFn((info: any) => {
            const isExist = select.find((el) => el.GroupName === info.GroupName)
            if (isExist) setSelect((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            else setSelect((arr) => [...arr, info])
        })
        const handleReset = useMemoizedFn(() => {
            setSelect([])
        })

        // 更新数据
        const handleUpdateData = useMemoizedFn((type: "modify" | "delete", info: any, newInfo?: any) => {
            if (type === "modify") {
                if (!newInfo) {
                    yakitNotify("error", "修改本地规则组名称错误")
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
        })

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

            // grpcCreateLocalFingerprintGroup({GroupName: groupName})
            //     .then(() => {
            //         setData((arr) => [{GroupName: groupName, Count: 0, IsBuildIn: false}].concat([...arr]))
            //         setTimeout(() => {
            //             setActiveAdd(false)
            //             setGroupName("")
            //         }, 200)
            //     })
            //     .catch(() => {})
        })

        /** ---------- 编辑 ---------- */
        const [editGroups, setEditGroup] = useState<string[]>([])
        const editInputRef = useRef<InputRef>(null)
        const [editInfo, setEditInfo] = useState<any>()
        const [editName, setEditName] = useState<string>("")
        const initEdit = useMemoizedFn(() => {
            setEditInfo(undefined)
            setEditName("")
        })
        const handleEdit = useMemoizedFn((info: any) => {
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
            if (!editInfo || editInfo.GroupName === editName) {
                initEdit()
                return
            }

            setEditGroup((arr) => [...arr, editInfo.GroupName])
            // grpcUpdateLocalFingerprintGroup({OldGroupName: editInfo.GroupName, NewGroupName: editName})
            //     .then(() => {
            //         // 改名后自动把选中里的该条去掉
            //         setSelect((arr) => arr.filter((item) => item.GroupName !== editInfo.GroupName))
            //         handleUpdateData("modify", editInfo, {...editInfo, GroupName: editName})
            //         initEdit()
            //     })
            //     .catch(() => {})
            //     .finally(() => {
            //         setTimeout(() => {
            //             setEditGroup((arr) => arr.filter((ele) => ele !== editInfo.GroupName))
            //         }, 200)
            //     })
        })

        /** ---------- 删除 ---------- */
        const [loadingDelKeys, setLoadingDelKeys] = useState<string[]>([])
        const handleDelete = useMemoizedFn((info: any) => {
            const {GroupName, IsBuildIn} = info
            if (IsBuildIn) return
            const isExist = loadingDelKeys.includes(GroupName)
            if (isExist) return

            setLoadingDelKeys((arr) => {
                return [...arr, GroupName]
            })
            // grpcDeleteLocalFingerprintGroup({Filter: {GroupNames: [GroupName]}})
            //     .then(() => {
            //         // 删除后自动把选中里的该条去掉
            //         setSelect((arr) => arr.filter((item) => item.GroupName !== info.GroupName))
            //         handleUpdateData("delete", info)
            //     })
            //     .catch(() => {})
            //     .finally(() => {
            //         setTimeout(() => {
            //             setLoadingDelKeys((arr) => arr.filter((ele) => ele !== GroupName))
            //         }, 200)
            //     })
        })

        return (
            <div className={styles["fingerprint-group-list"]}>
                <div className={styles["list-header"]}>
                    <div className={styles["title-body"]}>
                        指纹库管理 <YakitRoundCornerTag>{groupLength}</YakitRoundCornerTag>
                    </div>
                    <div className={styles["header-extra"]}>
                        <YakitButton type='text' onClick={handleReset}>
                            重置
                        </YakitButton>
                        <YakitButton type='secondary2' icon={<OutlinePlusIcon />} onClick={handleAddGroup} />
                    </div>
                </div>

                <div className={styles["list-search-and-add"]}>
                    <YakitInput.Search
                        size='large'
                        allowClear={true}
                        placeholder='请输入组名'
                        onSearch={handleSearch}
                    />

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
                                                    allowClear={true}
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
                            </div>
                        </div>
                    </YakitSpin>
                </div>
            </div>
        )
    })
)
