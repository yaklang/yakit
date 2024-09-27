import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {OpenedFileProps, RunnerFileTreeProps} from "./RunnerFileTreeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinCompileIcon, OutlinePluscircleIcon, OutlineRefreshIcon, OutlineXIcon} from "@/assets/icon/outline"

import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"

import classNames from "classnames"
import styles from "./RunnerFileTree.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemProps, YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {grpcFetchAuditTree} from "../utils"

import emiter from "@/utils/eventBus/eventBus"
import {
    clearMapFileDetail,
    getMapAllFileKey,
    getMapFileDetail,
    removeMapFileDetail,
    setMapFileDetail
} from "../FileTreeMap/FileMap"
import {
    clearMapFolderDetail,
    getMapAllFolderKey,
    getMapFolderDetail,
    hasMapFolderDetail,
    removeMapFolderDetail,
    setMapFolderDetail
} from "../FileTreeMap/ChildMap"
import {v4 as uuidv4} from "uuid"
import cloneDeep from "lodash/cloneDeep"
import {failed, success} from "@/utils/notification"
import {FileMonitorItemProps, FileMonitorProps} from "@/utils/duplex/duplex"
import {Tooltip} from "antd"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {AuditHistoryTable} from "../AuditCode/AuditCode"
import {FileDetailInfo} from "@/pages/YakRunner/RunnerTabs/RunnerTabsType"
import {getDefaultActiveFile, removeAreaFileInfo, setAreaFileActive, updateAreaFileInfo} from "@/pages/YakRunner/utils"
import {FileTree} from "@/pages/YakRunner/FileTree/FileTree"
import {KeyToIcon} from "@/pages/YakRunner/FileTree/icon"
import {OpenFileByPathProps} from "../YakRunnerAuditCodeType"
import {CollapseList} from "@/pages/YakRunner/CollapseList/CollapseList"
import {FileNodeProps, FileTreeListProps} from "@/pages/YakRunner/FileTree/FileTreeType"

const {ipcRenderer} = window.require("electron")

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = (props) => {
    const {} = props
    const {fileTree} = useStore()
    const {handleFileLoadData} = useDispatcher()

    const [aduitList, setAduitList] = useState<{path: string; name: string}[]>([])
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
    const onRefreshFileTreeFun = useMemoizedFn(() => {
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
        emiter.on("onDefaultExpanded", onDefaultExpanded)
        return () => {
            emiter.off("onDefaultExpanded", onDefaultExpanded)
        }
    }, [])

    useEffect(() => {
        // 刷新文件树
        emiter.on("onRefreshFileTree", onRefreshFileTreeFun)
        return () => {
            emiter.off("onRefreshFileTree", onRefreshFileTreeFun)
        }
    }, [])
    console.log("fileTree77---",fileTree);
    const fileDetailTree = useMemo(() => {
        console.log("fileTree---",fileTree);
        
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

    const getAduitList = useMemoizedFn(async () => {
        try {
            const {res} = await grpcFetchAuditTree("/")
            const arr = res.Resources.map(({Path, ResourceName}) => ({
                path: Path,
                name: ResourceName
            }))
            setAduitList(arr)
        } catch (error) {}
    })

    useEffect(() => {
        getAduitList()
        // 通知最近编译发生改变
        emiter.on("onRefreshAduitHistory", getAduitList)
        return () => {
            emiter.off("onRefreshAduitHistory", getAduitList)
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
                key: "auditFolder",
                label: "编译项目"
            }
        ]

        if (aduitList.length > 0) {
            let children: any = [
                ...aduitList.slice(0, 10).map((item) => ({key: `aduit-${item.name}`, label: item.name})),
                {
                    type: "divider"
                },
                {
                    key: "aduitAllList",
                    label: "查看全部",
                    type: "text"
                }
            ]

            newMenu.push({
                key: "auditHistory",
                label: "最近编译",
                children
            })
        }

        return newMenu
    }, [aduitList, fileTree])

    // 编译项目
    const auditFolder = useMemoizedFn(() => {
        emiter.emit("onOpenAuditModal")
    })

    const openAuditHistory = useMemoizedFn((path: string) => {
        const index = path.indexOf("-")
        // 使用 substring 方法获取第一个 "-" 后的所有内容
        const rootPath = path.substring(index + 1)
        emiter.emit("onOpenAuditTree", rootPath)
    })

    const menuSelect = useMemoizedFn((key, keyPath: string[]) => {
        switch (key) {
            case "auditFolder":
                auditFolder()
                break
            default:
                if (keyPath.includes("auditHistory")) {
                    openAuditHistory(key)
                }
                break
        }
    })

    // 文件树选中
    const onSelectFileTree = useMemoizedFn(
        (selectedKeys: string[], e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}) => {
            // console.log("onSelectFileTree", selectedKeys, e)
            if (e.selected) {
                const {path, name, parent, isFolder} = e.node
                if (!isFolder) {
                    const OpenFileByPathParams: OpenFileByPathProps = {
                        params: {
                            path,
                            name,
                            parent
                        }
                    }
                    emiter.emit("onOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                }
            }
        }
    )

    return (
        <div className={styles["runner-file-tree"]}>
            <div className={styles["container"]}>
                <OpenedFile />

                <div className={styles["file-tree"]}>
                    <div className={styles["file-tree-container"]}>
                        <div className={styles["file-tree-header"]}>
                            <div className={styles["title-style"]}>文件列表</div>
                            <div className={styles["extra"]}>
                                <Tooltip title={"编译当前项目"}>
                                    <YakitButton
                                        disabled={fileTree.length === 0}
                                        type='text2'
                                        icon={<OutlinCompileIcon />}
                                        onClick={() => emiter.emit("onOpenAuditModal", "init")}
                                    />
                                </Tooltip>
                                <Tooltip title={"刷新资源管理器"}>
                                    <YakitButton
                                        type='text2'
                                        disabled={fileTree.length === 0}
                                        icon={<OutlineRefreshIcon />}
                                        onClick={() => {
                                            emiter.emit("onRefreshTree")
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
        </div>
    )
}

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
        const newActiveFile = {...(await getDefaultActiveFile(data)), isActive: true}
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
