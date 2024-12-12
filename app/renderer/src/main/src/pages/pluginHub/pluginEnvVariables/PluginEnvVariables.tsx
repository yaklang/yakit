import React, {memo, useEffect, useRef, useState} from "react"
import {useDebounceFn, useInViewport, useMemoizedFn, useVirtualList} from "ahooks"
import {InputRef} from "antd"
import {OutlinePencilaltIcon, OutlinePluscircleIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {PluginEnvInfo, PluginEnvVariablesProps} from "./PluginEnvVariablesType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    grpcCreatePluginEnvVariables,
    grpcDeletePluginEnvVariables,
    grpcFetchAllPluginEnvVariables,
    grpcFetchPluginEnvVariables,
    grpcSetPluginEnvVariables
} from "../utils/grpc"
import {KVPair} from "@/models/kv"
import {failed, yakitNotify} from "@/utils/notification"

import classNames from "classnames"
import styles from "./PluginEnvVariables.module.scss"

const DefaultEnvInfo: PluginEnvInfo = {
    Key: "",
    Value: "",
    isLocal: false
}

/** @name 插件全局变量 */
export const PluginEnvVariables: React.FC<PluginEnvVariablesProps> = memo((props, ref) => {
    const {isPlugin, keys} = props

    const pluginEnvVarRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(pluginEnvVarRef)

    const [showScroll, setShowScroll] = useState<boolean>(false)

    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<PluginEnvInfo[]>([])

    const wrapperRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const [list] = useVirtualList(data, {
        containerTarget: wrapperRef,
        wrapperTarget: bodyRef,
        itemHeight: 40,
        overscan: 5
    })

    useEffect(() => {
        if (inViewPort) {
            fetchList()
            return () => {
                setData([])
            }
        }
    }, [inViewPort, keys])

    useEffect(() => {
        if (!wrapperRef.current) {
            return
        }
        // 判断表头是否根据显示滚动条而左移
        const height = wrapperRef.current.getBoundingClientRect().height
        const dataHeight = data.length * 40
        setShowScroll(dataHeight > height)
    }, [data])

    /** ---------- 搜索 Start ---------- */
    // 将插件里，并且不在本地全局环境变量的数据合并到整个表里
    const handleIntegrateData = useMemoizedFn((envs: PluginEnvInfo[]) => {
        if (!keys || keys.length === 0) return envs
        else {
            const envKeys = envs.map((item) => item.Key)
            const filters = keys.filter((item) => !envKeys.includes(item))
            if (filters.length === 0) return envs
            const newEnv = filters.map((item) => {
                return {Key: item, Value: "", isLocal: false} as PluginEnvInfo
            })
            return newEnv.concat(envs)
        }
    })

    // 查询列表
    const fetchList = useMemoizedFn(() => {
        if (loading) return

        setLoading(true)
        if (isPlugin) {
            if (!keys || keys.length === 0) {
                setData([])
                setTimeout(() => {
                    setLoading(false)
                }, 200)
                return
            }
            grpcFetchPluginEnvVariables({Key: [...(keys || [])]})
                .then((res) => {
                    const envs = res.Env.map((item) => {
                        return {...item, isLocal: true} as PluginEnvInfo
                    })
                    const arr = handleIntegrateData(envs)
                    setData(arr.filter((item) => item.Key.includes(search.current)))
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        } else {
            grpcFetchAllPluginEnvVariables()
                .then((res) => {
                    const envs = res.Env.map((item) => {
                        return {...item, isLocal: true} as PluginEnvInfo
                    })
                    setData(envs.filter((item) => item.Key.includes(search.current)))
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        }
    })

    const search = useRef<string>("")
    const handleSearch = useMemoizedFn(
        useDebounceFn(
            (val: string) => {
                search.current = val
                fetchList()
            },
            {wait: 200}
        ).run
    )
    /** ---------- 搜索 End ---------- */

    // 更新数据
    const updateData = useMemoizedFn((type: "delete" | "modify" | "add", info: PluginEnvInfo) => {
        if (type === "delete") {
            setData((data) => data.filter((item) => item.Key !== info.Key))
        }
        if (type === "modify") {
            setData((data) => {
                return data.map((item) => {
                    if (item.Key === info.Key) return {...info}
                    return item
                })
            })
        }
        if (type === "add") {
            handleSearch(search.current)
        }
    })

    /** ---------- 新建&编辑 Start ---------- */
    // 环境变量处于保存状态的 key 集合
    const [editingKeys, setEditingKeys] = useState<string[]>([])
    const isEditLoading = useMemoizedFn((key: string) => {
        return editingKeys.includes(key)
    })
    // 旧环境变量信息
    const oldEnvInfo = useRef<PluginEnvInfo>()

    // 双击编辑
    const inputRef = useRef<InputRef>(null)
    const [activeEditKey, setActiveEditKey] = useState<string>()
    const [envValue, setEnvValue] = useState<string>("")
    const handleInitDouble = useMemoizedFn(() => {
        oldEnvInfo.current = undefined
        setActiveEditKey(undefined)
        setEnvValue("")
    })
    const handleDoubleEdit = useMemoizedFn((info: PluginEnvInfo) => {
        if (isEditLoading(info.Key)) return

        oldEnvInfo.current = {...info}
        setActiveEditKey(info.Key)
        setEnvValue(info.Value || "")
        setTimeout(() => {
            // 输入框聚焦
            inputRef.current?.focus()
        }, 10)
    })
    const handleDoubleEditBlur = useMemoizedFn(() => {
        const request: KVPair = {Key: activeEditKey || "", Value: envValue}

        if (!activeEditKey || (oldEnvInfo.current?.isLocal && oldEnvInfo.current?.Value === envValue)) {
            handleInitDouble()
            return
        }

        setEditingKeys((arr) => [...arr, request.Key])
        grpcSetPluginEnvVariables({Env: [{...request}]})
            .then(() => {
                updateData("modify", {...request, isLocal: true})
                handleInitDouble()
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setEditingKeys((arr) => arr.filter((ele) => ele !== request.Key))
                }, 200)
            })
    })

    // 弹框编辑
    const isNew = useRef<boolean>(true)
    const [showEdit, setShowEdit] = useState<boolean>(false)
    const [editInfo, setEditInfo] = useState<PluginEnvInfo>()

    const [modalLoading, setModalLoading] = useState<boolean>(false)

    const handleOpenEdit = useMemoizedFn((isEdit: boolean, info?: PluginEnvInfo) => {
        if (showEdit) return
        if (isEdit && (!info || isEditLoading(info.Key))) return

        if (isEdit) oldEnvInfo.current = info
        isNew.current = !isEdit
        setEditInfo(info ? {...info} : undefined)
        setShowEdit(true)
    })
    const handleOKEdit = useMemoizedFn(() => {
        if (modalLoading) return
        if (!editInfo || !editInfo.Key) {
            failed("请填写变量名")
            return
        }
        if (!isNew.current && oldEnvInfo.current?.isLocal && oldEnvInfo.current?.Value === editInfo.Value) {
            yakitNotify("error", "请修改内容后再次操作")
            return
        }

        const kv: KVPair = {Key: editInfo.Key, Value: editInfo.Value}
        const apiFunc = isNew.current ? grpcCreatePluginEnvVariables : grpcSetPluginEnvVariables
        setModalLoading(true)
        apiFunc({Env: [{...kv}]})
            .then(() => {
                updateData(isNew.current ? "add" : "modify", {...editInfo, isLocal: true})
            })
            .catch(() => {})
            .finally(() => {
                handleCancelEdit()
                setTimeout(() => {
                    setModalLoading(false)
                }, 300)
            })
    })
    const handleCancelEdit = useMemoizedFn(() => {
        oldEnvInfo.current = undefined
        isNew.current = true
        setShowEdit(false)
        setEditInfo(undefined)
    })
    /** ---------- 新建&编辑 End ---------- */

    /** ----------  删除 Start ---------- */
    const [deleteKeys, setDeleteKeys] = useState<string[]>([])
    const handleDelete = useMemoizedFn((info: PluginEnvInfo) => {
        const isExist = deleteKeys.includes(info.Key)
        if (isExist) return

        setDeleteKeys((arr) => {
            return [...arr, info.Key]
        })
        grpcDeletePluginEnvVariables({Key: info.Key})
            .then(() => {
                updateData("delete", info)
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setDeleteKeys((arr) => arr.filter((ele) => ele !== info.Key))
                }, 200)
            })
    })
    /** ----------  删除 End ---------- */

    return (
        <div
            ref={pluginEnvVarRef}
            className={classNames(styles["plugin-env-variables"], {[styles["plugin-env-to-plugin"]]: isPlugin})}
        >
            <div className={styles["plugin-env-variables-header"]}>
                <div className={styles["header-title"]}>
                    <div className={styles["title-style"]}>插件全局变量</div>
                    <div className={styles["subtitle-style"]}>
                        {isPlugin
                            ? "仅展示本插件使用到的变量，编辑后会同步到全局"
                            : "存放所有插件全局变量，可双击变量值修改，但未配置的变量不会在此显示"}
                    </div>
                </div>

                <div className={styles["header-extra"]}>
                    <YakitInput.Search
                        size='large'
                        allowClear={true}
                        placeholder='请输入变量名关键词'
                        onSearch={handleSearch}
                    />

                    {!isPlugin && (
                        <YakitButton
                            type='outline2'
                            size='large'
                            icon={<OutlinePluscircleIcon />}
                            onClick={() => {
                                handleOpenEdit(false)
                            }}
                        >
                            新建
                        </YakitButton>
                    )}
                </div>
            </div>

            <div className={styles["plugin-env-variables-table"]}>
                <div
                    className={classNames(styles["table-header"], {[styles["table-header-active-scroll"]]: showScroll})}
                >
                    <div className={styles["table-cell"]}>变量名</div>
                    <div className={styles["table-cell"]}>变量值</div>
                    <div style={{maxWidth: 120}} className={styles["table-cell"]}>
                        操作
                    </div>
                </div>

                <div className={styles["table-body-wrapper"]}>
                    <YakitSpin spinning={loading}>
                        <div ref={wrapperRef} className={styles["table-body-container"]}>
                            <div ref={bodyRef}>
                                {list.map((ele) => {
                                    const {data} = ele
                                    const {Key: infoKey, Value: infoValue, isLocal} = data
                                    return (
                                        <div key={infoKey} style={{height: 40}} className={styles["table-tr"]}>
                                            <YakitSpin spinning={editingKeys.includes(infoKey)}>
                                                <div className={styles["tr-wrapper"]}>
                                                    <div className={styles["table-cell"]}>{infoKey}</div>
                                                    <div
                                                        tabIndex={0}
                                                        className={styles["table-cell"]}
                                                        onDoubleClick={() => {
                                                            handleDoubleEdit(data)
                                                        }}
                                                    >
                                                        {activeEditKey === infoKey ? (
                                                            <YakitInput
                                                                ref={inputRef}
                                                                allowClear={true}
                                                                value={envValue}
                                                                onChange={(e) => {
                                                                    setEnvValue(e.target.value)
                                                                }}
                                                                onBlur={handleDoubleEditBlur}
                                                                onPressEnter={handleDoubleEditBlur}
                                                            />
                                                        ) : isLocal ? (
                                                            infoValue
                                                        ) : (
                                                            <span className={styles["plugin-env-value-noexist"]}>
                                                                未配置
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{maxWidth: 120}} className={styles["table-cell"]}>
                                                        <div className={styles["plugin-env-variables-operate"]}>
                                                            {!isPlugin && (
                                                                <>
                                                                    <YakitButton
                                                                        type='text'
                                                                        colors='danger'
                                                                        icon={<OutlineTrashIcon />}
                                                                        loading={deleteKeys.includes(infoKey)}
                                                                        onClick={() => {
                                                                            handleDelete(data)
                                                                        }}
                                                                    />
                                                                    <div className={styles["divider-style"]}></div>
                                                                </>
                                                            )}
                                                            <YakitButton
                                                                type='text2'
                                                                icon={<OutlinePencilaltIcon />}
                                                                onClick={() => {
                                                                    handleOpenEdit(true, data)
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </YakitSpin>
                                        </div>
                                    )
                                })}
                            </div>
                            {data.length === 0 && !loading && (
                                <div className={styles["table-footer-empty"]}>暂无数据</div>
                            )}
                        </div>
                    </YakitSpin>
                </div>
            </div>

            <YakitModal
                type='white'
                title={`${isNew.current ? "新建" : "编辑"}变量值`}
                centered={true}
                maskClosable={false}
                closable={true}
                visible={showEdit}
                okButtonProps={{loading: modalLoading}}
                onCancel={handleCancelEdit}
                onOk={handleOKEdit}
            >
                <div className={styles["edit-info-modal-body"]}>
                    <div className={styles["edit-info-item"]}>
                        <div className={styles["item-title"]}>变量名: </div>
                        <YakitInput
                            value={editInfo?.Key}
                            disabled={!isNew.current}
                            onChange={(e) => {
                                setEditInfo({...(editInfo || DefaultEnvInfo), Key: e.target.value})
                            }}
                        />
                    </div>

                    <div className={styles["edit-info-item"]}>
                        <div className={styles["item-title"]}>变量值: </div>
                        <YakitInput
                            allowClear={true}
                            value={editInfo?.Value}
                            onChange={(e) => {
                                setEditInfo({...(editInfo || DefaultEnvInfo), Value: e.target.value})
                            }}
                        />
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})
