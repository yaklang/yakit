import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useDebounce, useDebounceFn, useMap, useMemoizedFn, useUpdateEffect} from "ahooks"
import {ActiveProps, OpenedFileProps, RiskTreeProps, RuleTreeProps, RunnerFileTreeProps} from "./RunnerFileTreeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlinePluscircleIcon,
    OutlinePositionIcon,
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineXIcon
} from "@/assets/icon/outline"

import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"

import classNames from "classnames"
import styles from "./RunnerFileTree.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {
    grpcFetchAuditTree,
    grpcFetchAuditCodeRiskOrRuleList,
    grpcFetchRiskOrRuleTree,
    removeAuditCodeAreaFileInfo,
    setAuditCodeAreaFileActive,
    updateAuditCodeAreaFileInfo
} from "../utils"
import {Selection} from "../RunnerTabs/RunnerTabsType"
import emiter from "@/utils/eventBus/eventBus"
import {getMapFail, getMapFileDetail} from "../FileTreeMap/FileMap"
import {getMapFolderDetail} from "../FileTreeMap/ChildMap"
import {Tooltip} from "antd"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {AfreshAuditModal, AuditHistoryTable} from "../AuditCode/AuditCode"
import {KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {AuditEmiterYakUrlProps, OpenFileByPathProps} from "../YakRunnerAuditCodeType"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {FileTree} from "../FileTree/FileTree"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {FileDetailInfo} from "../RunnerTabs/RunnerTabsType"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps} from "../FileTree/FileTreeType"
import {AuditSearchModal} from "../AuditSearchModal/AuditSearch"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"
import {JumpToAuditEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {YakURLResource} from "@/pages/yakURLTree/data"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {SelectOptionsProps} from "@/demoComponents/itemSelect/ItemSelectType"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import moment from "moment"

const GlobalFilterFunction = React.lazy(() => import("../GlobalFilterFunction/GlobalFilterFunction"))

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = memo((props) => {
    const {fileTreeLoad, boxHeight} = props
    const {fileTree, activeFile, projectName, pageInfo} = useStore()
    const {handleFileLoadData, setRuntimeID} = useDispatcher()
    const [afreshName, setAfreshName] = useState<string>()
    const [visible, setVisible] = useState<boolean>(false)
    const [searchVisible, setSearchVisible] = useState<boolean>(false)
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

    const [fileRefresh, setFileRefresh] = useState<boolean>(false)
    const [ruleRefresh, setRuleRefresh] = useState<boolean>(false)

    // 打开已有项目
    const onCodeAuditHistoryExpandedFun = useMemoizedFn(() => {
        setVisible(true)
    })

    const onRefreshFileOrRuleTreeFun = useMemoizedFn(() => {
        if (active === "file") {
            setFileRefresh(!fileRefresh)
        } else if (active === "rule") {
            setRuleRefresh(!ruleRefresh)
        }
    })

    useEffect(() => {
        emiter.on("onCodeAuditDefaultExpanded", onDefaultExpanded)
        emiter.on("onCodeAuditHistoryExpanded", onCodeAuditHistoryExpandedFun)
        emiter.on("onRefreshFileOrRuleTree", onRefreshFileOrRuleTreeFun)
        return () => {
            emiter.off("onCodeAuditDefaultExpanded", onDefaultExpanded)
            emiter.off("onCodeAuditHistoryExpanded", onCodeAuditHistoryExpandedFun)
            emiter.off("onRefreshFileOrRuleTree", onRefreshFileOrRuleTreeFun)
        }
    }, [])

    useEffect(() => {
        // 刷新文件树
        emiter.on("onCodeAuditRefreshFileTree", onRefreshFileTreeFun)
        return () => {
            emiter.off("onCodeAuditRefreshFileTree", onRefreshFileTreeFun)
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

    const onOpenSearchModalFun = useMemoizedFn(() => {
        if (fileTree.length === 0) return
        setSearchVisible(true)
    })

    useEffect(() => {
        getAduitList()
        // 通知最近编译发生改变
        emiter.on("onCodeAuditRefreshAduitHistory", getAduitList)
        emiter.on("onOpenSearchModal", onOpenSearchModalFun)
        return () => {
            emiter.off("onCodeAuditRefreshAduitHistory", getAduitList)
            emiter.off("onOpenSearchModal", onOpenSearchModalFun)
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
                key: "codeScan",
                label: "代码扫描"
            },
            {
                key: "auditCode",
                label: "编译项目"
            },
            {
                key: "auditAgain",
                label: "重新编译",
                disabled: fileTree.length === 0
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
    const auditCode = useMemoizedFn(() => {
        emiter.emit("onExecuteAuditModal")
    })

    const openAuditHistory = useMemoizedFn((path: string) => {
        const index = path.indexOf("-")
        // 使用 substring 方法获取第一个 "-" 后的所有内容
        const rootPath = path.substring(index + 1)
        emiter.emit("onCodeAuditOpenAuditTree", rootPath)
    })

    const menuSelect = useMemoizedFn((key, keyPath: string[]) => {
        switch (key) {
            case "codeScan":
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route: YakitRoute.YakRunner_Code_Scan,
                        params: {
                            projectName: [projectName]
                        }
                    })
                )
                break
            case "auditCode":
                auditCode()
                break
            case "auditAgain":
                setAfreshName(projectName)
                break
            case "aduitAllList":
                setVisible(true)
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
                    emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                }
            }
        }
    )

    // 定位
    const onActiveFileScrollToFileTree = useMemoizedFn(() => {
        if (activeFile && (activeFile.parent || activeFile.fileSourceType === "audit")) {
            emiter.emit("onCodeAuditScrollToFileTree", activeFile.path)
        }
    })

    // 关闭抽屉
    const onCloseDrawer = useMemoizedFn(() => {
        setVisible(false)
    })

    const [active, setActive] = useState<ActiveProps>("all")
    // 控制初始渲染的变量，存在该变量里的类型则代表组件已经被渲染
    const rendered = useRef<Set<ActiveProps>>(new Set(["all"]))
    const onSetActive = useMemoizedFn((type: ActiveProps) => {
        if (!rendered.current.has(type)) {
            rendered.current.add(type)
        }
        setActive(type)
    })
    useEffect(() => {
        const activeKey = pageInfo?.leftTabActive || "all"
        onSetActive(activeKey as ActiveProps)
    }, [pageInfo?.leftTabActive])

    const getActiveName = useMemoizedFn((type: ActiveProps) => {
        switch (type) {
            case "file":
                return "漏洞文件"
            case "rule":
                return "规则汇总"
            case "global-filtering-function":
                return "全局过滤函数"
            default:
                return "文件列表"
        }
    })

    const [options, setOptions] = useState<SelectOptionsProps[]>([{label: "全部", value: ""}])
    const [checkItem, setCheckItem] = useState<string>("")
    const [isShowCompare, setShowCompare] = useState<boolean>(false)

    const getRiskSelectList = useDebounceFn(
        useMemoizedFn(async () => {
            try {
                if (projectName) {
                    // 经与后端协商 由于跳转后需选中此Select 因此不采用分页，更改为一次性拉取100条
                    const res = await grpcFetchAuditCodeRiskOrRuleList(projectName)
                    const newOptions = res.Data.map((item) => {
                        return {
                            label: (
                                <span>
                                    {formatTimestamp(item.CreatedAt)}
                                    <YakitTag style={{marginLeft: 4}} size='small' color='info'>
                                        {item.RiskCount}
                                    </YakitTag>
                                </span>
                            ),
                            value: item.TaskId,
                            CreatedAt: item.CreatedAt
                        }
                    })
                    setOptions([{label: "全部", value: ""}, ...newOptions])
                    setTimeout(() => {
                        if (pageInfo && pageInfo.isShowCompare) {
                            setShowCompare(true)
                        }
                    }, 200)
                }
            } catch (error) {}
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        setShowCompare(false)
        getRiskSelectList()
    }, [projectName])

    useEffect(() => {
        if (pageInfo) {
            if (pageInfo.runtimeId) {
                setCheckItem(pageInfo.runtimeId)
            }
            if (pageInfo.refreshRiskOrRuleList) {
                getRiskSelectList()
            }
        }
    }, [pageInfo])

    useUpdateEffect(() => {
        setRuntimeID && setRuntimeID(checkItem)
        if (checkItem === "") {
            setShowCompare(false)
        }
    }, [checkItem])

    const getSelectDom = useMemoizedFn(() => {
        return (
            <>
                <YakitSelect
                    value={checkItem}
                    options={options}
                    onChange={(value) => {
                        setCheckItem(value)
                    }}
                    style={{margin: "0px 12px 4px"}}
                    size='small'
                />
                {options.length > 1 && (
                    <div className={styles["compare-select-box"]}>
                        <YakitCheckbox
                            checked={isShowCompare}
                            onChange={(e) => {
                                setShowCompare(e.target.checked)
                            }}
                        >
                            <span style={{fontSize: 12, whiteSpace: "nowrap"}}>
                                {checkItem === "" ? "查看未处置" : "只看新增"}
                            </span>
                        </YakitCheckbox>
                    </div>
                )}
            </>
        )
    })

    return (
        <div className={styles["runner-file-tree"]}>
            {/* 左侧边栏 */}
            <div className={styles["left-side-bar-list"]}>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "all"
                    })}
                    onClick={() => {
                        onSetActive("all")
                    }}
                >
                    <span className={styles["item-text"]}>全部</span>
                </div>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "file"
                    })}
                    onClick={() => {
                        onSetActive("file")
                    }}
                >
                    <span className={styles["item-text"]}>漏洞文件</span>
                </div>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "rule"
                    })}
                    onClick={() => {
                        onSetActive("rule")
                    }}
                >
                    <span className={styles["item-text"]}>规则汇总</span>
                </div>
                <div
                    className={classNames(styles["left-side-bar-item"], {
                        [styles["left-side-bar-item-active"]]: active === "global-filtering-function"
                    })}
                    onClick={() => {
                        onSetActive("global-filtering-function")
                    }}
                >
                    <span className={styles["item-text"]}>全局过滤函数</span>
                </div>
            </div>

            <div className={styles["container"]}>
                <div className={styles["file-tree"]}>
                    <div className={styles["file-tree-container"]}>
                        <div className={styles["file-tree-header"]}>
                            <div className={styles["title-box"]}>
                                <div className={styles["title-style"]}>{getActiveName(active)}</div>
                                {fileTreeLoad && active === "all" && <YakitSpin size='small' />}
                            </div>
                            <div className={styles["extra"]}>
                                {active === "all" && (
                                    <Tooltip title={"定位"}>
                                        <YakitButton
                                            disabled={fileTreeLoad || fileTree.length === 0}
                                            type='text2'
                                            icon={<OutlinePositionIcon />}
                                            onClick={onActiveFileScrollToFileTree}
                                        />
                                    </Tooltip>
                                )}
                                <Tooltip title={"搜索"}>
                                    <YakitButton
                                        disabled={fileTree.length === 0}
                                        type='text2'
                                        icon={<OutlineSearchIcon />}
                                        onClick={() => {
                                            setSearchVisible(true)
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip title={"刷新资源管理器"}>
                                    <YakitButton
                                        type='text2'
                                        disabled={fileTree.length === 0}
                                        icon={<OutlineRefreshIcon />}
                                        onClick={() => {
                                            if (active === "all") {
                                                emiter.emit("onCodeAuditRefreshTree")
                                            } else if (active === "file") {
                                                setFileRefresh(!fileRefresh)
                                            } else if (active === "rule") {
                                                setRuleRefresh(!ruleRefresh)
                                            }
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
                            {rendered.current.has("all") && (
                                <div
                                    className={classNames(styles["tree-body"], {
                                        [styles["hidden-tree-body"]]: active !== "all"
                                    })}
                                >
                                    <FileTree
                                        data={fileDetailTree}
                                        onLoadData={onLoadData}
                                        onSelect={onSelectFileTree}
                                        foucsedKey={foucsedKey}
                                        setFoucsedKey={setFoucsedKey}
                                        expandedKeys={expandedKeys}
                                        setExpandedKeys={setExpandedKeys}
                                    />
                                </div>
                            )}
                            {rendered.current.has("file") && (
                                <div
                                    className={classNames(styles["tree-body"], {
                                        [styles["hidden-tree-body"]]: active !== "file"
                                    })}
                                >
                                    {getSelectDom()}
                                    <RiskTree
                                        type='file'
                                        projectName={projectName}
                                        init={fileRefresh}
                                        task_id={checkItem}
                                        increment={isShowCompare}
                                    />
                                </div>
                            )}
                            {rendered.current.has("rule") && (
                                <div
                                    className={classNames(styles["tree-body"], {
                                        [styles["hidden-tree-body"]]: active !== "rule"
                                    })}
                                >
                                    {getSelectDom()}
                                    <RiskTree
                                        type='rule'
                                        projectName={projectName}
                                        init={ruleRefresh}
                                        task_id={checkItem}
                                        increment={isShowCompare}
                                    />
                                </div>
                            )}
                            {rendered.current.has("global-filtering-function") && (
                                <div
                                    className={classNames(styles["tree-body"], {
                                        [styles["hidden-tree-body"]]: active !== "global-filtering-function"
                                    })}
                                >
                                    <GlobalFilterFunction projectName={projectName} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <OpenedFile />
            </div>

            <YakitDrawer
                getContainer={document.getElementById("audit-code") || document.body}
                placement='bottom'
                mask={false}
                closable={false}
                keyboard={false}
                height={boxHeight + 26}
                visible={visible}
                bodyStyle={{padding: 0}}
                className={classNames(styles["audit-history-drawer"])}
                onClose={onCloseDrawer}
            >
                <AuditHistoryTable
                    pageType='aucitCode'
                    onClose={() => setVisible(false)}
                    warrpId={document.getElementById("audit-code")}
                />
            </YakitDrawer>

            <AfreshAuditModal
                afreshName={afreshName}
                setAfreshName={setAfreshName}
                onSuccee={() => {
                    emiter.emit("onCodeAuditRefreshTree")
                }}
            />

            <AuditSearchModal
                visible={searchVisible}
                onClose={() => {
                    setSearchVisible(false)
                    const auditCodeElement = document.getElementById("audit-code")
                    if (auditCodeElement) {
                        auditCodeElement.focus() // 确保元素获得焦点
                        auditCodeElement.click() // 模拟点击
                    }
                }}
                projectName={projectName || ""}
            />
        </div>
    )
})

// 目前已打开的文件列表
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
        const {newAreaInfo} = removeAuditCodeAreaFileInfo(areaInfo, data)
        setAreaInfo && setAreaInfo(newAreaInfo)
    })

    const openItem = useMemoizedFn(async (data: FileDetailInfo) => {
        // 注入漏洞汇总 由于点击项必为激活项默认给true
        const newActiveFile = {...data, isActive: true}
        // 更改当前tabs active
        const activeAreaInfo = setAuditCodeAreaFileActive(areaInfo, data.path)
        // 将新的语法检测注入areaInfo
        const newAreaInfo = updateAuditCodeAreaFileInfo(activeAreaInfo, newActiveFile, newActiveFile.path)
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

// 漏洞/规则 树
export const RiskTree: React.FC<RiskTreeProps> = memo((props) => {
    const {type, projectName, onSelectedNodes, init, search, task_id, result_id, increment} = props
    /** ---------- 文件树 ---------- */
    const [riskTree, setRiskTree] = useState<FileTreeListProps[]>([])
    const [refreshRiskTree, setRefreshRiskTree] = useState<boolean>(false)
    // 漏洞树Map
    const [riskMap, {set: setRiskMap, get: getRiskMap, reset: resetRiskMap}] = useMap<string, FileNodeMapProps>()
    const [riskChildMap, {set: setRiskChildMap, get: getRiskChildMap, reset: resetRiskChildMap}] = useMap<
        string,
        string[]
    >()
    // 选中的文件或文件夹
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")
    // 展开项控制
    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])

    useEffect(() => {
        projectName && onInitRiskTreeFun(projectName)
    }, [projectName, init, task_id, increment])

    // 将文件详情注入文件树结构中 并 根据foldersMap修正其子项
    const initRiskFileTree = useMemoizedFn((data: FileTreeListProps[], depth: number) => {
        return data.map((item) => {
            const itemDetail = getRiskMap(item.path) || getMapFail
            let obj: FileNodeProps = {...itemDetail, depth}
            const childArr = getRiskChildMap(item.path) || []
            if (itemDetail.isFolder) {
                const newChild = childArr.map((item) => ({path: item}))
                obj.children = initRiskFileTree(newChild, depth + 1)
            }
            return obj
        })
    })

    const fileDetailRiskTree = useMemo(() => {
        const initTree = initRiskFileTree(riskTree, 1)
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
    }, [riskTree, refreshRiskTree])

    const clearMap = useMemoizedFn(() => {
        resetRiskMap()
        resetRiskChildMap()
    })

    // 重置Map与轮询
    const resetMap = useMemoizedFn(() => {
        clearMap()
    })

    const onInitRiskTreeFun = useMemoizedFn(async (program: string) => {
        try {
            resetMap()
            setFoucsedKey("")
            setExpandedKeys([])
            if (program.length > 0) {
                const {res, data} = await grpcFetchRiskOrRuleTree("/", {
                    program,
                    type,
                    search,
                    task_id,
                    result_id,
                    increment
                })
                const children: FileTreeListProps[] = []
                let childArr: string[] = []
                data.forEach((item) => {
                    // 注入文件结构Map
                    childArr.push(item.path)
                    // 文件Map
                    setRiskMap(item.path, item)
                    // 注入tree结构
                    children.push({path: item.path})
                })

                const newRoot = childArr.map((item) => ({path: item}))
                if (data) setRiskTree(newRoot)
            }
        } catch (error) {}
    })

    const onLoadRiskTree = useMemoizedFn((path: string, program: string) => {
        return new Promise((resolve, reject) => {
            // 校验其子项是否存在
            const childArr = getRiskChildMap(path) || []
            if (childArr.length > 0) {
                setRefreshRiskTree(!refreshRiskTree)
                resolve("")
            } else {
                grpcFetchRiskOrRuleTree(path, {program, type, search, task_id, result_id, increment}).then(({data}) => {
                    if (data.length > 0) {
                        let childArr: string[] = []
                        data.forEach((item) => {
                            // 注入文件结构Map
                            childArr.push(item.path)
                            // 文件Map
                            setRiskMap(item.path, item)
                        })
                        setRiskChildMap(path, childArr)
                        setTimeout(() => {
                            setRefreshRiskTree(!refreshRiskTree)
                            resolve("")
                        }, 300)
                    } else {
                        reject()
                    }
                })
            }
        })
    })

    const onLoadData = useMemoizedFn((node: FileNodeProps) => {
        // 删除最外层文件夹时无需加载
        if (node.parent === null || !projectName) return Promise.reject()
        return onLoadRiskTree(node.path, projectName)
    })

    // 跳转至审计结果
    const onJump = useMemoizedFn((data: YakURLResource) => {
        const variable = data.Extra.find((item) => item.Key === "variable")?.Value
        const index = data.Extra.find((item) => item.Key === "index")?.Value
        const result_id = data.Extra.find((item) => item.Key === "result_id")?.Value
        let rightParams: AuditEmiterYakUrlProps = {
            Schema: "syntaxflow",
            Location: projectName || "",
            Path: `/${variable}/${index}`,
            Body: ""
        }
        if (result_id) {
            rightParams.Query = [{Key: "result_id", Value: result_id}]
        }
        emiter.emit("onCodeAuditOpenRightDetail", JSON.stringify(rightParams))
    })

    // 文件树选中
    const onSelectFileTree = useMemoizedFn(
        (selectedKeys: string[], e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}) => {
            if (onSelectedNodes) {
                onSelectedNodes(e.node)
                return
            }
            try {
                if (e.selected) {
                    const {path, name, parent, isFolder, data} = e.node
                    if (!isFolder && data) {
                        onJump(data)
                        const arr = data.Extra.filter((item) => item.Key === "code_range")
                        const hash = data.Extra.find((item) => item.Key === "hash")?.Value
                        if (arr.length > 0) {
                            const item: CodeRangeProps = JSON.parse(arr[0].Value)
                            const {url, start_line, start_column, end_line, end_column} = item
                            const lastSlashIndex = url.lastIndexOf("/")
                            const fileName = url.substring(lastSlashIndex + 1)
                            const highLightRange: Selection = {
                                startLineNumber: start_line,
                                startColumn: start_column,
                                endLineNumber: end_line,
                                endColumn: end_column
                            }
                            const OpenFileByPathParams: OpenFileByPathProps = {
                                params: {
                                    path: url,
                                    name: fileName,
                                    highLightRange
                                }
                            }

                            emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                            // 纯跳转行号
                            setTimeout(() => {
                                const obj: JumpToAuditEditorProps = {
                                    selections: highLightRange,
                                    path: url,
                                    isSelect: false
                                }
                                emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
                            }, 100)
                            if (hash) {
                                emiter.emit("onCodeAuditOpenBottomDetail", JSON.stringify({type: "holeDetail"}))
                                setTimeout(() => {
                                    emiter.emit("onCodeAuditOpenBugDetail", hash)
                                }, 100)
                            }
                        }
                    }
                }
            } catch (error) {}
        }
    )
    return (
        <>
            {fileDetailRiskTree.length !== 0 ? (
                <FileTree
                    data={fileDetailRiskTree}
                    onLoadData={onLoadData}
                    onSelect={onSelectFileTree}
                    foucsedKey={foucsedKey}
                    setFoucsedKey={setFoucsedKey}
                    expandedKeys={expandedKeys}
                    setExpandedKeys={setExpandedKeys}
                />
            ) : (
                <div style={{marginTop: 20}}>
                    <YakitEmpty title='暂无漏洞' />
                </div>
            )}
        </>
    )
})
