import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {OpenedFileProps, RunnerFileTreeProps} from "./RunnerFileTreeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePluscircleIcon, OutlineRefreshIcon, OutlineXIcon} from "@/assets/icon/outline"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import classNames from "classnames"
import styles from "./RunnerFileTree.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {downloadAsZip, getYakRunnerHistory, removeAreaFileInfo, setAreaFileActive, updateAreaFileInfo} from "../utils"
import emiter from "@/utils/eventBus/eventBus"
import {getMapFileDetail} from "../FileTreeMap/FileMap"
import {getMapFolderDetail} from "../FileTreeMap/ChildMap"
import {Tooltip} from "antd"
import {KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {OpenFileByPathProps, YakJavaDecompilerHistoryProps} from "../YakJavaDecompilerType"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {FileTree} from "../FileTree/FileTree"
import {FileDetailInfo} from "../RunnerTabs/RunnerTabsType"
import {FileNodeProps, FileTreeListProps} from "../FileTree/FileTreeType"
import {failed, yakitNotify} from "@/utils/notification"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {AuditModalFormModal} from "@/pages/yakRunnerAuditCode/AuditCode/AuditCode"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import { YakitRoute } from "@/enums/yakitRoute"

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = memo((props) => {
    const {boxHeight} = props
    const {fileTree, activeFile, projectName} = useStore()
    const {handleFileLoadData} = useDispatcher()
    // 选中的文件或文件夹
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")
    // 将文件详情注入文件树结构中 并 根据foldersMap修正其子项
    const initFileTree = useMemoizedFn((data: FileTreeListProps[], depth: number) => {
        return data.map((item) => {
            const itemDetail = getMapFileDetail(item.path)
            let obj: FileNodeProps = {...itemDetail, depth}

            const childArr = getMapFolderDetail(item.path)
            if (itemDetail.isFolder) {
                const newChild = childArr.map((item) => ({path: item}))
                obj.children = initFileTree(newChild, depth + 1)
            }
            return obj
        })
    })

    const [refreshTree, setRefreshTree] = useState<boolean>(false)
    const onDecompilerRefreshFileTreeFun = useMemoizedFn(() => {
        setRefreshTree(!refreshTree)
    })

    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])

    // 默认展开项
    const onDefaultExpanded = useMemoizedFn(async (data: string) => {
        try {
            const defaultExpanded: string[] = JSON.parse(data)
            setExpandedKeys(defaultExpanded)
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onCodeAuditDefaultExpanded", onDefaultExpanded)
        return () => {
            emiter.off("onCodeAuditDefaultExpanded", onDefaultExpanded)
        }
    }, [])

    useEffect(() => {
        // 刷新文件树
        emiter.on("onDecompilerRefreshFileTree", onDecompilerRefreshFileTreeFun)
        return () => {
            emiter.off("onDecompilerRefreshFileTree", onDecompilerRefreshFileTreeFun)
        }
    }, [])

    const fileDetailTree = useMemo(() => {
        const initTree = initFileTree(fileTree, 1)
        if (initTree.length > 0) {
            initTree.push({
                parent: null,
                name: "已经到底啦~",
                path: "",
                isFolder: false,
                icon: "",
                depth: 1,
                isBottom: true
            })
        }

        return initTree
    }, [fileTree, refreshTree])

    const [historyList, setHistoryList] = useState<YakJavaDecompilerHistoryProps[]>([])
    const getHistoryList = useMemoizedFn(async (data?: string) => {
        try {
            if (data) {
                const historyData: YakJavaDecompilerHistoryProps[] = JSON.parse(data)
                setHistoryList(historyData)
            } else {
                const list = await getYakRunnerHistory()
                setHistoryList(list)
            }
        } catch (error) {}
    })

    useEffect(() => {
        getHistoryList()
        // 通知历史记录发生改变
        emiter.on("onRefreshRunnerHistory", getHistoryList)
        return () => {
            emiter.off("onRefreshRunnerHistory", getHistoryList)
        }
    }, [])

    const onLoadData = useMemoizedFn((node: FileNodeProps) => {
        // 删除最外层文件夹时无需加载
        if (node.parent === null) return Promise.reject()
        if (handleFileLoadData) return handleFileLoadData(node.path)
        return Promise.reject()
    })

    const menuData: YakitMenuItemType[] = useMemo(() => {
        let newMenu: YakitMenuItemType[] = [
            {
                key: "close",
                label: "关闭 JAR",
                disabled: !projectName
            },
            // {
            //     key: "downloadZip",
            //     label: "下载为 ZIP",
            //     disabled: !projectName
            // },
            {
                key: "importPorjectAndCompile",
                label: "导入并编译",
                disabled: !projectName
            }
        ]
        if (historyList.length > 0) {
            newMenu.push({
                key: "history",
                label: "最近打开",
                children: [
                    ...historyList.map((item) => {
                        return {key: item.path, label: item.name}
                    })
                ]
            })
        }
        return newMenu
    }, [historyList, projectName])

    const downloadAsZipFun = useMemoizedFn(async () => {
        if (!projectName) {
            failed("没有选择 JAR 文件")
            return
        }
        try {
            const exportURL = `javadec:///export?jar=${projectName}`
            await downloadAsZip(exportURL, projectName)
        } catch (error) {}
    })

    const tokenRef = useRef<string>(randomString(40))
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
        },
        onError: () => {},
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            // setRuntimeId(rId)
        }
    })

    const importProjectAndCompile = useMemoizedFn(() => {
        setShowCompileModal(true)
    })

    // 打开历史
    const openHistory = useMemoizedFn((key: string) => {
        const filterArr = historyList.filter((item) => item.path === key)

        if (filterArr.length > 0) {
            const item = filterArr[0]
            emiter.emit("onOpenDecompilerTree", item.path)
        }
    })

    const menuSelect = useMemoizedFn((key, keyPath: string[]) => {
        switch (key) {
            case "close":
                emiter.emit("onCloseDecompilerTree")
                break
            case "downloadZip":
                downloadAsZipFun()
                break
            case "importPorjectAndCompile":
                importProjectAndCompile()
                break
            default:
                if (keyPath.includes("history")) {
                    openHistory(key)
                }
                break
        }
    })

    // 文件树选中
    const onSelectFileTree = useMemoizedFn(
        (selectedKeys: string[], e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}) => {
            // console.log("onSelectFileTree", selectedKeys, e)
            if (e.selected) {
                const {path, name, parent, isFolder, data} = e.node
                if (!isFolder) {
                    const OpenFileByPathParams: OpenFileByPathProps = {
                        params: {
                            path,
                            name,
                            parent,
                            data
                        }
                    }
                    emiter.emit("onOpenDecompilerFileByPath", JSON.stringify(OpenFileByPathParams))
                }
            }
        }
    )

    const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)
    const [isShowHint, setShowHint] = useState<boolean>(false)

    const onCloseCompileModal = useMemoizedFn(() => {
        setShowCompileModal(false)
    })

    const onSuccee = () => {
        onCloseCompileModal()
        setShowHint(true)
    }
    return (
        <div className={styles["runner-file-tree"]}>
            <div className={styles["container"]}>
                <OpenedFile />

                <div className={styles["file-tree"]}>
                    <div className={styles["file-tree-container"]}>
                        <div className={styles["file-tree-header"]}>
                            <div className={styles["title-box"]}>
                                <div className={styles["title-style"]}>文件列表</div>
                            </div>
                            <div className={styles["extra"]}>
                                <Tooltip title={"刷新资源管理器"}>
                                    <YakitButton
                                        type='text2'
                                        disabled={fileTree.length === 0}
                                        icon={<OutlineRefreshIcon />}
                                        onClick={() => {
                                            emiter.emit("onRefreshDecompilerTree")
                                        }}
                                    />
                                </Tooltip>
                                <YakitDropdownMenu
                                    menu={{
                                        data: menuData,
                                        onClick: ({key, keyPath}) => menuSelect(key, keyPath)
                                    }}
                                    dropdown={{
                                        trigger: ["click"],
                                        placement: "bottomLeft"
                                    }}
                                >
                                    <YakitButton type='text2' icon={<OutlinePluscircleIcon />} />
                                </YakitDropdownMenu>
                            </div>
                        </div>

                        <div className={styles["file-tree-tree"]}>
                            <div className={styles["tree-body"]}>
                                <FileTree
                                    folderPath={fileTree.length > 0 ? fileTree[0].path : ""}
                                    data={fileDetailTree}
                                    onLoadData={onLoadData}
                                    onSelect={onSelectFileTree}
                                    foucsedKey={foucsedKey}
                                    setFoucsedKey={setFoucsedKey}
                                    expandedKeys={expandedKeys}
                                    setExpandedKeys={setExpandedKeys}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isShowCompileModal && (
                <AuditModalFormModal
                    onCancel={onCloseCompileModal}
                    onSuccee={onSuccee}
                    warrpId={document.getElementById("yakit-decompiler-main-box-id")}
                    initForm={{
                        target: projectName || ""
                    }}
                />
            )}
            <YakitHint
                visible={isShowHint}
                title='编译完成'
                content='当前项目编译完成，点击查看跳转查看编译项目'
                onOk={() => {
                    setShowHint(false)
                    emiter.emit(
                        "openPage",
                        JSON.stringify({
                            route: YakitRoute.YakRunner_Project_Manager,
                        })
                    )
                }}
                onCancel={() => {
                    setShowHint(false)
                }}
                okButtonText={"查看"}
            />
        </div>
    )
})

export const OpenedFile: React.FC<OpenedFileProps> = memo((props) => {
    const {} = props
    const {areaInfo, activeFile} = useStore()
    const {setAreaInfo, setActiveFile} = useDispatcher()
    const titleRender = () => {
        return <div className={styles["opened-file-header"]}>打开的编辑器</div>
    }

    const removeItem = useMemoizedFn((e, data: FileDetailInfo) => {
        e.stopPropagation()
        // 如若删除项为当前焦点聚集项
        if (activeFile?.path === data.path) {
            setActiveFile && setActiveFile(undefined)
        }
        const newAreaInfo = removeAreaFileInfo(areaInfo, data)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    const openItem = useMemoizedFn(async (data: FileDetailInfo) => {
        // 注入语法检测 由于点击项必为激活项默认给true
        const newActiveFile = {...data, isActive: true}
        // 更改当前tabs active
        const activeAreaInfo = setAreaFileActive(areaInfo, data.path)
        // 将新的语法检测注入areaInfo
        const newAreaInfo = updateAreaFileInfo(activeAreaInfo, newActiveFile, newActiveFile.path)
        setAreaInfo && setAreaInfo(newAreaInfo)
        setActiveFile && setActiveFile(newActiveFile)
    })

    const renderItem = (info: FileDetailInfo[]) => {
        return (
            <div className={styles["opened-file-body"]}>
                {info.map((item) => {
                    return (
                        <div
                            key={item.path}
                            className={classNames(styles["file-item"], {
                                [styles["file-item-no-active"]]: activeFile?.path !== item.path,
                                [styles["file-item-active"]]: activeFile?.path === item.path
                            })}
                            onClick={() => openItem(item)}
                        >
                            <div className={styles["del-btn"]} onClick={(e) => removeItem(e, item)}>
                                <OutlineXIcon />
                            </div>
                            <img src={KeyToIcon[item.icon].iconPath} />
                            <div
                                className={classNames(styles["file-name"], "yakit-content-single-ellipsis")}
                                title={item.name}
                            >
                                {item.name}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const getOpenFileList = useMemo(() => {
        let list: FileDetailInfo[] = []
        areaInfo.forEach((item) => {
            item.elements.forEach((itemIn) => {
                list = [...list, ...itemIn.files]
            })
        })
        list.sort((a, b) => {
            const nameA = a.openTimestamp
            const nameB = b.openTimestamp

            if (nameA < nameB) {
                return -1 // 如果 a 在 b 前面，返回负数
            }
            if (nameA > nameB) {
                return 1 // 如果 a 在 b 后面，返回正数
            }
            return 0 // 如果名称相同，返回 0
        })
        return list
    }, [areaInfo])

    return (
        <>
            {getOpenFileList.length !== 0 ? (
                <div className={styles["open-file"]}>
                    <CollapseList
                        onlyKey='key'
                        list={[[...getOpenFileList]]}
                        titleRender={titleRender}
                        renderItem={renderItem}
                        collapseProps={{
                            defaultActiveKey: ["collapse-list-0"]
                        }}
                    />
                </div>
            ) : (
                <></>
            )}
        </>
    )
})
