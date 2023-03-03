import React, {memo, ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useMemoizedFn, useVirtualList} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QueryGeneralRequest} from "../invoker/schema"
import {failed, info} from "@/utils/notification"
import {
    ChevronDownIcon,
    ChevronUpIcon,
    DocumentDuplicateSvgIcon,
    DotsVerticalSvgIcon,
    ExportIcon,
    ImportSvgIcon,
    PencilAltIcon,
    PlusBoldSvgIcon,
    PlusIcon,
    TrashIcon
} from "@/assets/newIcon"
import {
    DocumentAddSvgIcon,
    DocumentDownloadSvgIcon,
    DocumentTextSvgIcon,
    FolderOpenSvgIcon,
    ProjectDocumentTextSvgIcon,
    ProjectExportSvgIcon,
    ProjectFolderOpenSvgIcon,
    ProjectImportSvgIcon,
    ProjectViewGridSvgIcon
} from "./icon"
import ReactResizeDetector from "react-resize-detector"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {formatTimestamp} from "@/utils/timeUtil"
import {Dropdown, DropdownProps, Form, Popconfirm, Progress, Upload} from "antd"
import {YakitMenu, YakitMenuProp} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {randomString} from "@/utils/randomUtil"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YaklangEngineMode} from "@/yakitGVDefine"

import classnames from "classnames"
import styles from "./ProjectManage.module.scss"

const {ipcRenderer} = window.require("electron")

export interface ProjectManageProp {
    engineMode: YaklangEngineMode
    onEngineModeChange: (mode: YaklangEngineMode, keepalive?: boolean) => any
    onFinish: () => any
}

interface ProjectParamsProp extends QueryGeneralRequest {
    ProjectName?: string
    Description?: string
    ProjectType?: string
}
/** 单条项目数据 */
interface ProjectDescription {
    Id: number
    ProjectName: string
    Description: string
    CreatedAt: number
    DatabasePath: string
    isFolder?: boolean
}
interface ProjectsResponse {
    Pagination: {Page: number; Limit: number}
    Projects: ProjectDescription[]
    Total: number
}
/** 表头描述数据对象 */
interface HeaderProp<T> {
    key: string
    name: string
    width: string
    headerRender?: (index: number) => ReactNode
    render?: (data: T, index: number) => ReactNode
}

/** 过滤项数据 */
interface FilterInfoProps {
    key: string
    label: string
    itemIcon?: ReactNode
}

/** 项目名过滤项 */
const typeFilter: FilterInfoProps[] = [
    {key: "all", label: "全部文件", itemIcon: <ProjectViewGridSvgIcon className={styles["type-filter-icon-style"]} />},
    {
        key: "project",
        label: "项目",
        itemIcon: <ProjectDocumentTextSvgIcon className={styles["type-filter-icon-style"]} />
    },
    {
        key: "folder",
        label: "文件夹",
        itemIcon: <ProjectFolderOpenSvgIcon className={styles["type-filter-icon-style"]} />
    }
]
/** 项目名过滤项对应展示内容 */
const typeToName: {[key: string]: string} = {}
for (let item of typeFilter) typeToName[item.key] = item.label

/** 时间过滤项 */
const timeFilter: FilterInfoProps[] = [
    {key: "created_at", label: "创建时间"},
    {key: "updated_at", label: "最近操作时间"}
]
/** 时间过滤项对应展示内容 */
const timeToName: {[key: string]: string} = {}
for (let item of timeFilter) timeToName[item.key] = item.label

const ProjectManage: React.FC<ProjectManageProp> = memo((props) => {
    const {engineMode, onFinish} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams] = useState<ProjectParamsProp>({
        ProjectType: "all",
        Pagination: {Page: 1, Limit: 10, Order: "desc", OrderBy: "created_at"}
    })
    const [__data, setData, getData] = useGetState<ProjectsResponse>({
        Pagination: {Page: 1, Limit: 10},
        Projects: [],
        Total: 0
    })
    const [__lists, setLists, getLists] = useGetState<ProjectDescription[]>([])
    const [latestProject, setLatestProject] = useState<ProjectDescription>()

    const [vlistHeigth, setVListHeight] = useState(600)
    const containerRef = useRef()
    const wrapperRef = useRef()
    const [list] = useVirtualList(getLists(), {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 48 + 1,
        overscan: 5
    })

    const [headerShow, setHeaderShow] = useState<boolean>(false)

    const [typeShow, setTypeShow] = useState<boolean>(false)
    const [timeShow, setTimeShow] = useState<boolean>(false)

    const projectHeader: HeaderProp<ProjectDescription>[] = useMemo(() => {
        return [
            {
                key: "ProjectName",
                name: typeToName["all"],
                width: "20%",
                headerRender: (index) => {
                    return (
                        <DropdownMenu
                            dropdown={{
                                trigger: ["click"],
                                overlayClassName: styles["dropdown-menu-filter-wrapper"],
                                onVisibleChange: (open) => setTypeShow(open)
                            }}
                            menu={{
                                data: typeFilter,
                                className: styles["dropdown-menu-body"],
                                onClick: ({key}) => {
                                    setTypeShow(false)
                                    if (params.ProjectType !== key) setParams({...params, ProjectType: key})
                                }
                            }}
                        >
                            <div
                                className={classnames(styles["project-table-filter"], {
                                    [styles["project-table-filter-dropdown"]]: typeShow
                                })}
                            >
                                {typeToName[params.ProjectType || "all"]}
                                {typeShow ? (
                                    <ChevronUpIcon className={styles["icon-style"]} />
                                ) : (
                                    <ChevronDownIcon className={styles["icon-style"]} />
                                )}
                            </div>
                        </DropdownMenu>
                    )
                },
                render: (data, index) => {
                    return (
                        <div
                            className={classnames(styles["project-table-body-wrapper"], styles["project-name-wrapper"])}
                        >
                            <ProjectDocumentTextSvgIcon />
                            <div className={styles["project-style"]} title={data.ProjectName}>
                                {data.ProjectName === "[default]" ? "[默认项目]" : data.ProjectName}
                            </div>
                        </div>
                    )
                }
            },
            {key: "Description", name: "备注", width: "30%"},
            {
                key: "DatabasePath",
                name: "存储路径",
                width: "30%",
                render: (data, index) => {
                    return (
                        <div
                            className={classnames(
                                styles["project-table-body-wrapper"],
                                styles["database-path-wrapper"]
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles["project-style"]} title={data.DatabasePath}>
                                {data.DatabasePath}
                            </div>
                            <CopyComponents copyText={data.DatabasePath} onAfterCopy={() => {}} />
                        </div>
                    )
                }
            },
            {
                key: "CreatedAt",
                name: timeToName["updated_at"],
                width: "20%",
                headerRender: (index) => {
                    return (
                        <DropdownMenu
                            dropdown={{
                                trigger: ["click"],
                                overlayClassName: styles["dropdown-menu-filter-wrapper"],
                                onVisibleChange: (open) => setTimeShow(open)
                            }}
                            menu={{
                                data: timeFilter,
                                className: styles["dropdown-menu-body"],
                                onClick: ({key}) => {
                                    setTimeShow(false)
                                    if (params.Pagination.OrderBy !== key)
                                        setParams({...params, Pagination: {...params.Pagination, OrderBy: key}})
                                }
                            }}
                        >
                            <div
                                className={classnames(styles["project-table-filter"], {
                                    [styles["project-table-filter-dropdown"]]: timeShow
                                })}
                            >
                                {timeToName[params.Pagination.OrderBy || "created_at"]}
                                {timeShow ? (
                                    <ChevronUpIcon className={styles["icon-style"]} />
                                ) : (
                                    <ChevronDownIcon className={styles["icon-style"]} />
                                )}
                            </div>
                        </DropdownMenu>
                    )
                },
                render: (data, index) => {
                    return formatTimestamp(data.CreatedAt)
                }
            }
        ]
    }, [params, typeShow, timeShow])

    const [operateShow, setOperateShow] = useState<number>(-1)
    const projectOperate = useMemoizedFn((info: ProjectDescription) => {
        const {Id, isFolder} = info

        return (
            <div className={styles["project-operate-wrapper"]} onClick={(e) => e.stopPropagation()}>
                {isFolder ? (
                    <DropdownMenu
                        dropdown={{
                            trigger: ["click"],
                            placement: "bottomRight",
                            overlayClassName: styles["dropdown-menu-filter-wrapper"],
                            onVisibleChange: (open) => setOperateShow(open ? +Id : -1)
                        }}
                        menu={{
                            data: [
                                {
                                    key: "newProject",
                                    label: "新建子项目",
                                    itemIcon: (
                                        <ProjectDocumentTextSvgIcon className={styles["type-filter-icon-style"]} />
                                    )
                                },
                                {
                                    key: "newFolder",
                                    label: "新建子文件夹",
                                    itemIcon: <ProjectFolderOpenSvgIcon className={styles["type-filter-icon-style"]} />
                                }
                            ],
                            className: styles["dropdown-menu-body"],
                            onClick: ({key}) => {
                                setOperateShow(-1)
                                operateFunc(key, info)
                            }
                        }}
                    >
                        <div
                            className={classnames(styles["btn-wrapper"], {
                                [styles["btn-focus-style"]]: operateShow >= 0 && operateShow === +Id
                            })}
                        >
                            <PlusIcon className={styles["btn-style"]} />
                        </div>
                    </DropdownMenu>
                ) : (
                    <DropdownMenu
                        dropdown={{
                            trigger: ["click"],
                            placement: "bottomRight",
                            overlayClassName: styles["dropdown-menu-filter-wrapper"],
                            onVisibleChange: (open) => setOperateShow(open ? +Id : -1)
                        }}
                        menu={{
                            data: [
                                {key: "encryption", label: "加密导出"},
                                {key: "plaintext", label: "明文导出"}
                            ],
                            className: styles["dropdown-menu-body"],
                            onClick: ({key}) => {
                                setOperateShow(-1)
                                operateFunc(key, info)
                            }
                        }}
                    >
                        <div
                            className={classnames(styles["btn-wrapper"], {
                                [styles["btn-focus-style"]]: operateShow >= 0 && operateShow === +Id
                            })}
                        >
                            <ExportIcon className={styles["btn-style"]} />
                        </div>
                    </DropdownMenu>
                )}

                <div className={styles["divider-style"]}></div>
                <div className={styles["btn-wrapper"]} onClick={() => operateFunc("edit", info)}>
                    <PencilAltIcon className={styles["btn-style"]} />
                </div>

                {info.ProjectName !== "[default]" && (
                    <>
                        <div className={styles["divider-style"]}></div>
                        <Popconfirm
                            title={<div style={{width: 140}}>确定要删除该项目？</div>}
                            onConfirm={() => operateFunc("delete", info)}
                        >
                            <div className={styles["btn-wrapper"]}>
                                <TrashIcon className={styles["del-style"]} />
                            </div>
                        </Popconfirm>
                    </>
                )}
            </div>
        )
    })

    useEffect(() => {
        ipcRenderer.invoke("GetCurrentProject").then((rsp: ProjectDescription) => setLatestProject(rsp || undefined))

        update()
    }, [])

    const update = useMemoizedFn((page?: number, limit?: number) => {
        const param: ProjectParamsProp = {
            ...params,
            Pagination: {
                ...params.Pagination,
                Page: page || params.Pagination.Page,
                Limit: limit || params.Pagination.Limit
            }
        }

        setLoading(true)
        ipcRenderer
            .invoke("GetProjects", param)
            .then((rsp: ProjectsResponse) => {
                try {
                    setData(rsp)
                    setLists(rsp.Projects)
                } catch (e) {
                    failed("处理项目数据失败: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`查询 Projects 失败：${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    const operateFunc = useMemoizedFn((type: string, data?: ProjectDescription) => {
        switch (type) {
            case "openRecent":
                return
            case "newProject":
                setModalInfo({show: true})
                return
            case "newFolder":
                setModalInfo({show: true, isFolder: true})
                return
            case "import":
                setModalInfo({show: true, isNew: false, isImport: true})
                return
            case "encryption":
                if (!data || !data.Id) {
                    failed("该条项目无数据或无关键信息，无法导出!")
                    return
                }
                setModalProject(data)
                setTimeout(() => {
                    setModalInfo({show: true, isNew: false, isExport: true})
                }, 100)
                return
            case "plaintext":
                if (!data || !data.Id) {
                    failed("该条项目无数据或无关键信息，无法导出!")
                    return
                }
                setTransferShow({
                    visible: true,
                    isExport: true,
                    data: {
                        id: data.Id,
                        name: data.ProjectName,
                        password: ""
                    }
                })
                return
            case "edit":
                return
            case "delete":
                if (!data || !data.ProjectName) {
                    failed("该条项目无数据或无关键信息，无法删除!")
                    return
                }
                ipcRenderer
                    .invoke("RemoveProject", {ProjectName: data?.ProjectName})
                    .then((e) => {
                        info("删除成功")
                        setLists(getLists().filter((item) => item.Id !== data.Id))
                    })
                    .catch((e) => {
                        failed(`删除失败: ${e}`)
                    })
                return
            case "copyPath":
                if (!data || !data.DatabasePath) {
                    failed("该条项目无数据或无关键信息，无法删除!")
                    return
                }
                ipcRenderer.invoke("set-copy-clipboard", data.DatabasePath)
                info("复制成功")
                return
            case "setCurrent":
                if (!data || !data.ProjectName) return
                setLoading(true)
                ipcRenderer
                    .invoke("SetCurrentProject", {
                        ProjectName: data?.ProjectName
                    })
                    .then((e) => {
                        info("已切换数据库")
                        setRemoteValue(RemoteGV.LinkDatabase, `${data.Id}`)
                        onFinish()
                    })
                    .catch((e) => {
                        failed("切换数据库失败：" + `${e}`)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 500)
                    })
                return

            default:
                return
        }
    })

    const [modalInfo, setModalInfo] = useState<{
        show: boolean
        isNew?: boolean
        isFolder?: boolean
        isExport?: boolean
        isImport?: boolean
    }>({show: false})
    const [modalLoading, setModalLoading] = useState<boolean>(false)
    const [modalProject, setModalProject] = useState<ProjectDescription>()

    /** 弹窗确认事件的回调 */
    const onModalSubmit = useMemoizedFn(
        (type: string, value: ProjectFolderInfoProps | ExportProjectProps | ImportProjectProps) => {
            switch (type) {
                case "isNewProject":
                    const newProject: ProjectFolderInfoProps = value as any
                    ipcRenderer
                        .invoke("IsProjectNameValid", {
                            ProjectName: newProject.name
                        })
                        .then((e) => {
                            ipcRenderer
                                .invoke("NewProject", {
                                    ProjectName: newProject.name,
                                    Description: newProject.notes
                                })
                                .then(() => {
                                    info("创建新项目成功")
                                    setModalInfo({show: false})
                                    update(1)
                                })
                                .catch((e) => {
                                    info(`创建新项目失败：${e}`)
                                })
                                .finally(() => {
                                    setTimeout(() => {
                                        setModalLoading(false)
                                    }, 300)
                                })
                        })
                        .catch((e) => {
                            info("创建新项目失败，项目名校验不通过：" + `${e}`)
                            setTimeout(() => {
                                setModalLoading(false)
                            }, 300)
                        })
                    return
                case "isNewFolder":
                    const newFolder: ProjectFolderInfoProps = value as any
                    return
                case "isImport":
                    setModalInfo({show: false})
                    update(1)
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                    return
                case "isExport":
                    setModalInfo({show: false})
                    setTimeout(() => {
                        setLoading(false)
                    }, 300)
                    return
                default:
                    return
            }
        }
    )

    const [transferShow, setTransferShow] = useState<{
        isExport?: boolean
        isImport?: boolean
        visible: boolean
        data?: ExportProjectProps
    }>({
        visible: false
    })
    const onTransferProjectHint = useMemoizedFn((type: string) => {
        if (!transferShow.visible) return
        setTimeout(() => setTransferShow({visible: false}), 300)
    })

    return (
        <div className={styles["project-manage-wrapper"]}>
            <div className={styles["project-manage-container"]}>
                <div className={styles["project-header"]}>
                    <div className={styles["header-title"]}>
                        <div className={styles["title-style"]}>项目管理</div>
                        <div className={styles["total-style"]}>
                            Total <span className={styles["total-number"]}>{__data.Total}</span>
                        </div>
                    </div>
                    <YakitInput.Search
                        size='large'
                        placeholder='请输入项目名称'
                        value={params.ProjectName}
                        onChange={(e) => setParams({...params, ProjectName: e.target.value})}
                        style={{width: 288}}
                        onSearch={() => update(1)}
                    />
                </div>

                <div className={styles["project-operate"]}>
                    <div
                        className={classnames(styles["open-recent-wrapper"], {
                            [styles["open-recent-focus-wrapper"]]: headerShow
                        })}
                        onClick={() => operateFunc("openRecent", latestProject)}
                    >
                        <div
                            className={styles["open-recent-body"]}
                            onClick={() => operateFunc("setCurrent", latestProject)}
                        >
                            <div className={styles["body-title"]}>
                                <DocumentTextSvgIcon />
                                <div>
                                    <div className={styles["title-style"]}>
                                        {latestProject?.ProjectName || "[default]"}
                                    </div>
                                    <div className={styles["subtitle-style"]}>{`最近打开时间：${
                                        latestProject ? formatTimestamp(latestProject?.CreatedAt) : "- -"
                                    }`}</div>
                                </div>
                            </div>

                            {engineMode !== "remote" && (
                                <div className={styles["icon-wrapper"]} onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu
                                        dropdown={{
                                            trigger: ["click"],
                                            placement: "bottomRight",
                                            overlayClassName: styles["dropdown-menu-filter-wrapper"],
                                            onVisibleChange: (open) => setHeaderShow(open)
                                        }}
                                        menu={{
                                            data: [
                                                {
                                                    key: "export",
                                                    label: "加密导出",
                                                    itemIcon: (
                                                        <ExportIcon className={styles["type-filter-icon-style"]} />
                                                    ),
                                                    children: [
                                                        {key: "encryption", label: "加密导出"},
                                                        {key: "plaintext", label: "明文导出"}
                                                    ]
                                                },
                                                {
                                                    key: "edit",
                                                    label: "编辑",
                                                    itemIcon: (
                                                        <PencilAltIcon className={styles["type-filter-icon-style"]} />
                                                    )
                                                },
                                                {
                                                    key: "copyPath",
                                                    label: "复制路径",
                                                    itemIcon: (
                                                        <DocumentDuplicateSvgIcon
                                                            className={styles["type-filter-icon-style"]}
                                                        />
                                                    )
                                                },
                                                {type: "divider"},
                                                {
                                                    key: "delete",
                                                    label: "删除",
                                                    itemIcon: <TrashIcon className={styles["type-filter-icon-style"]} />
                                                }
                                            ],
                                            className: styles["dropdown-menu-body"],
                                            popupClassName: styles["dropdown-menu-filter-wrapper"],
                                            onClick: ({key}) => {
                                                setHeaderShow(false)
                                                operateFunc(key, latestProject)
                                            }
                                        }}
                                    >
                                        <div
                                            className={classnames(styles["icon-body"], {
                                                [styles["icon-focus-body"]]: headerShow
                                            })}
                                        >
                                            <DotsVerticalSvgIcon />
                                        </div>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className={classnames(styles["btn-wrapper"], styles["new-project-wrapper"])}
                        onClick={() => operateFunc("newProject")}
                    >
                        <div className={styles["btn-body"]}>
                            <div className={styles["body-title"]}>
                                <DocumentAddSvgIcon />
                                新建项目
                            </div>
                            <div className={styles["icon-style"]}>
                                <PlusBoldSvgIcon />
                            </div>
                        </div>
                    </div>

                    <div
                        className={classnames(styles["btn-wrapper"], styles["new-folder-wrapper"])}
                        onClick={() => operateFunc("newFolder")}
                    >
                        <div className={styles["btn-body"]}>
                            <div className={styles["body-title"]}>
                                <FolderOpenSvgIcon />
                                新建文件夹
                            </div>
                            <div className={styles["icon-style"]}>
                                <PlusBoldSvgIcon />
                            </div>
                        </div>
                    </div>

                    {engineMode !== "remote" && (
                        <div
                            className={classnames(styles["btn-wrapper"], styles["import-wrapper"])}
                            onClick={() => operateFunc("import")}
                        >
                            <div className={styles["btn-body"]}>
                                <div className={styles["body-title"]}>
                                    <DocumentDownloadSvgIcon />
                                    导入
                                </div>
                                <div className={styles["icon-style"]}>
                                    <ImportSvgIcon />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles["project-table-wrapper"]}>
                    <YakitSpin tip='Loading...' spinning={loading}>
                        <div className={styles["project-table-body"]}>
                            <div className={styles["table-header-wrapper"]}>
                                <div className={styles["header-titles"]}>
                                    <div className={styles["titls-body"]}>
                                        {projectHeader.map((item, index) => {
                                            return (
                                                <div
                                                    key={item.key}
                                                    style={{
                                                        flex: `0 0 ${item.width}`,
                                                        width: item.width
                                                    }}
                                                    className={styles["title-opt"]}
                                                >
                                                    <div>
                                                        {item.headerRender ? item.headerRender(index) : item.name}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                {engineMode !== "remote" && <div style={{width: 112}}>操作</div>}
                            </div>

                            <div className={styles["table-content-wrapper"]}>
                                <ReactResizeDetector
                                    onResize={(width, height) => {
                                        if (!width || !height) {
                                            return
                                        }
                                        setVListHeight(height)
                                    }}
                                    handleWidth={true}
                                    handleHeight={true}
                                    refreshMode={"debounce"}
                                    refreshRate={50}
                                />
                                <div ref={containerRef as any} style={{height: vlistHeigth, overflow: "auto"}}>
                                    <div ref={wrapperRef as any}>
                                        {list.map((i) => {
                                            return (
                                                <div
                                                    key={i.index}
                                                    style={{height: 48 + 1}}
                                                    className={classnames(styles["table-opt"], {
                                                        [styles["table-opt-selected"]]:
                                                            operateShow >= 0 && operateShow === +i.data.Id
                                                    })}
                                                    onClick={(e) => operateFunc("setCurrent", i.data)}
                                                >
                                                    <div className={styles["opt-content"]}>
                                                        <div className={styles["content-body"]}>
                                                            {projectHeader.map((item) => {
                                                                return (
                                                                    <div
                                                                        key={`${i.index}-${item.key}`}
                                                                        style={{
                                                                            flex: `0 0 ${item.width}`,
                                                                            width: item.width
                                                                        }}
                                                                        className={styles["content-opt"]}
                                                                    >
                                                                        {item.render ? (
                                                                            item.render(i.data, i.index)
                                                                        ) : (
                                                                            <div
                                                                                className={styles["content-style"]}
                                                                                title={i.data[item.key] || ""}
                                                                            >
                                                                                {i.data[item.key] || "-"}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    {engineMode !== "remote" && (
                                                        <div style={{width: 112}} className={styles["opt-operate"]}>
                                                            {projectOperate(i.data)}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </YakitSpin>
                </div>
            </div>

            <NewProjectAndFolder
                isNew={modalInfo.isNew}
                isFolder={modalInfo.isFolder}
                isExport={modalInfo.isExport}
                isImport={modalInfo.isImport}
                project={modalProject}
                visible={modalInfo.show}
                setVisible={(open: boolean) => {
                    setModalProject(undefined)
                    setModalInfo({...modalInfo, show: open})
                }}
                loading={modalLoading}
                setLoading={setModalLoading}
                onModalSubmit={onModalSubmit}
            />

            <TransferProject
                {...transferShow}
                onSuccess={onTransferProjectHint}
                setVisible={(open: boolean) => setTransferShow({...transferShow, visible: open})}
            />
        </div>
    )
})

export default ProjectManage

/** 可能准备写成基础组件 */
interface DropdownMenuProps {
    dropdown?: Omit<DropdownProps, "overlay">
    menu: YakitMenuProp
    children?: ReactNode
}
/** 可能准备写成基础组件 */
const DropdownMenu: React.FC<DropdownMenuProps> = memo((props) => {
    const {dropdown = {}, menu, children} = props

    const overlay = useMemo(() => {
        return <YakitMenu {...menu} />
    }, [menu])

    return (
        <Dropdown {...dropdown} overlay={overlay}>
            {children}
        </Dropdown>
    )
})

interface NewProjectAndFolderProps {
    isNew?: boolean
    isFolder?: boolean
    isExport?: boolean
    isImport?: boolean
    project?: ProjectDescription
    visible: boolean
    setVisible: (open: boolean) => any
    loading: boolean
    setLoading: (flag: boolean) => any
    onModalSubmit: (type: string, value: ProjectFolderInfoProps | ExportProjectProps | ImportProjectProps) => any
}
interface ProjectFolderInfoProps {
    name: string
    folder?: string
    notes?: string
}
interface ExportProjectProps {
    id: number
    name: string
    password: string
}
interface ImportProjectProps {
    path: string
    name?: string
    password?: string
}

const NewProjectAndFolder: React.FC<NewProjectAndFolderProps> = memo((props) => {
    const {
        isNew = true,
        isFolder,
        isExport,
        isImport,
        project,
        visible,
        setVisible,
        loading,
        setLoading,
        onModalSubmit
    } = props

    const [info, setInfo] = useState<ProjectFolderInfoProps>({
        name: ""
    })
    const [exportInfo, setExportInfo] = useState<ExportProjectProps>({
        id: 0,
        name: "",
        password: ""
    })
    const [importInfo, setImportInfo] = useState<ImportProjectProps>({
        path: ""
    })

    useEffect(() => {
        if (isExport && project) setExportInfo({id: project.Id, name: project.ProjectName, password: ""})
    }, [isExport, project])

    const [isCheck, setIsCheck] = useState<boolean>(false)

    const headerTitle = useMemo(() => {
        if (isNew && isFolder) return "新建文件夹"
        if (isNew && !isFolder) return "新建项目"
        if (isExport) return "导出项目"
        if (isImport) return "导入项目"
        return "未知情况"
    }, [isNew, isFolder, isExport, isImport])

    const submitTitle = useMemo(() => {
        if (isNew) return "创建"
        if (isExport) return "导出"
        if (isImport) return "导入"
        return "确定"
    }, [isNew, isExport, isImport])

    const [transferShow, setTransferShow] = useState<{
        isExport?: boolean
        isImport?: boolean
        visible: boolean
        data?: ExportProjectProps | ImportProjectProps
    }>({
        visible: false
    })

    const onSubmit = useMemoizedFn(() => {
        if (!isCheck) setIsCheck(true)
        setLoading(true)
        if (isNew) {
            if (!info.name) {
                setTimeout(() => setLoading(false), 300)
                return
            }
            onModalSubmit(isFolder ? "isNewFolder" : "isNewProject", {...info})
        }
        if (isExport) {
            if (!exportInfo.id) {
                failed("数据获取错误，请关闭弹窗后重试!")
                setTimeout(() => setLoading(false), 300)
                return
            }
            if (exportInfo.password.length > 15) {
                failed("密码最多15位")
                setTimeout(() => setLoading(false), 300)
                return
            }
            setTransferShow({
                isExport: true,
                visible: true,
                data: {...exportInfo}
            })
        }
        if (isImport) {
            if (!importInfo.path) {
                setTimeout(() => setLoading(false), 300)
                return
            }
            ipcRenderer.invoke("fetch-path-file-name", importInfo.path).then((fileName: string) => {
                setTransferShow({
                    isImport: true,
                    visible: true,
                    data: {...importInfo, name: importInfo.name || fileName}
                })
            })
        }
    })

    const onClose = useMemoizedFn(() => {
        setIsCheck(false)
        setInfo({name: ""})
        setExportInfo({
            id: 0,
            name: "",
            password: ""
        })
        setImportInfo({
            path: ""
        })
        setVisible(false)
    })

    return (
        <YakitModal
            title={headerTitle}
            maskClosable={true}
            closable={true}
            centered={true}
            footer={null}
            width={448}
            destroyOnClose={true}
            visible={visible}
            onCancel={onClose}
        >
            <Form
                style={transferShow.visible ? {display: "none"} : {}}
                className={styles["new-project-and-folder-wrapper"]}
                layout='vertical'
                onSubmitCapture={(e) => {
                    e.preventDefault()
                    onSubmit()
                }}
            >
                {isNew && (
                    <>
                        <Form.Item
                            label={
                                <div>
                                    {`${isFolder ? "文件夹名称" : "项目名称"}`}{" "}
                                    <span className={styles["required-style"]}>*</span> :
                                </div>
                            }
                        >
                            <YakitInput
                                size='large'
                                placeholder='未命名'
                                className={classnames({[styles["required-form-item-wrapper"]]: isCheck && !info.name})}
                                value={info.name}
                                onChange={(e) => setInfo({...info, name: e.target.value})}
                            />
                        </Form.Item>
                        {!isFolder && (
                            <Form.Item label={"所属文件夹 :"}>
                                <YakitInput />
                            </Form.Item>
                        )}
                        <Form.Item label={"备注 :"}>
                            <YakitInput.TextArea
                                autoSize={{minRows: 3, maxRows: 5}}
                                showCount
                                maxLength={100}
                                placeholder='请输入描述与备注'
                            />
                        </Form.Item>
                    </>
                )}
                {isExport && (
                    <>
                        <Form.Item label={"项目名称 :"}>
                            <YakitInput disabled={true} size='large' value={exportInfo.name} />
                        </Form.Item>
                        <Form.Item
                            label={
                                <div>
                                    密码 <span className={styles["required-style"]}>*</span> :
                                </div>
                            }
                            className={styles["export-form-item-password-wrapper"]}
                        >
                            <YakitInput.Password
                                className={classnames({
                                    [styles["required-form-item-wrapper"]]: isCheck && !exportInfo.password
                                })}
                                placeholder='为项目设置打开密码'
                                value={exportInfo.password}
                                onChange={(e) => setExportInfo({...exportInfo, password: e.target.value})}
                            />
                        </Form.Item>
                    </>
                )}
                {isImport && (
                    <>
                        <Form.Item
                            label={
                                <div>
                                    选择项目文件 <span className={styles["required-style"]}>*</span> :
                                </div>
                            }
                            help={
                                <div className={styles["import-form-item-help-wrapper"]}>
                                    可将文件拖入框内或点击此处
                                    <Upload
                                        multiple={false}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(f: any) => {
                                            setImportInfo({...importInfo, path: f?.path || ""})
                                            return false
                                        }}
                                    >
                                        <a className={styles["upload-btn"]} onClick={(e) => e.preventDefault()}>
                                            上传文件
                                        </a>
                                    </Upload>
                                </div>
                            }
                        >
                            <YakitInput
                                className={classnames({
                                    [styles["required-form-item-wrapper"]]: isCheck && !importInfo.path
                                })}
                                size='large'
                                placeholder='请输入绝对路径'
                                value={importInfo.path}
                                onChange={(e) => setImportInfo({...importInfo, path: e.target.value})}
                            />
                        </Form.Item>
                        <Form.Item
                            label={"项目名称 :"}
                            help={
                                <div className={styles["import-form-item-help-wrapper"]}>
                                    项目名如果为空，则集成项目文件中的名字
                                </div>
                            }
                        >
                            <YakitInput
                                size='large'
                                placeholder='请输入项目名'
                                value={importInfo.name}
                                onChange={(e) => setImportInfo({...importInfo, name: e.target.value})}
                            />
                        </Form.Item>
                        <Form.Item label={"项目名称 :"} className={styles["export-form-item-password-wrapper"]}>
                            <YakitInput.Password
                                placeholder='如无密码则不填'
                                value={importInfo.password}
                                onChange={(e) => setImportInfo({...importInfo, password: e.target.value})}
                            />
                        </Form.Item>
                    </>
                )}
                <Form.Item label={""}>
                    <div className={styles["form-btn-wrapper"]}>
                        <YakitButton loading={loading} size='large' type='outline2' onClick={onClose}>
                            取消
                        </YakitButton>
                        <YakitButton loading={loading} size='large' htmlType='submit'>
                            {submitTitle}
                        </YakitButton>
                    </div>
                </Form.Item>
            </Form>

            <TransferProject
                {...transferShow}
                onSuccess={(type) => {
                    onModalSubmit(type, {} as any)
                    setTimeout(() => {
                        setTransferShow({visible: false})
                    }, 500)
                }}
                setVisible={(open: boolean) => setTransferShow({...transferShow, visible: open})}
            />
        </YakitModal>
    )
})

interface TransferProjectProps {
    isExport?: boolean
    isImport?: boolean
    data?: ExportProjectProps | ImportProjectProps
    visible: boolean
    setVisible: (open: boolean) => any
    onSuccess: (type: string) => any
}
interface ProjectIOProgress {
    TargetPath: string
    Percent: number
    Verbose: string
}
const TransferProject: React.FC<TransferProjectProps> = memo((props) => {
    const {isExport, isImport, data, visible, setVisible, onSuccess} = props

    const [token, setToken] = useState(randomString(40))
    const [percent, setPercent] = useState<number>(0.0)
    const [infos, setInfos] = useState<string[]>([])
    /** 导出功能时获取导出文件路径 */
    const pathRef = useRef<string>("")

    useEffect(() => {
        const infos: string[] = []
        if (!visible) return
        if ((!isExport && !isImport) || !data) {
            failed("数据出错，请点击取消后再次尝试!")
            return
        }

        const hintTitle = isImport ? "[ImportProject]" : isExport ? "[ExportProject]" : ""

        if (isExport) {
            const exportData: ExportProjectProps = {...(data as any)}
            ipcRenderer.invoke(
                "ExportProject",
                {
                    ProjectName: exportData.name,
                    Password: exportData.password || ""
                },
                token
            )
        }
        if (isImport) {
            const importData: ImportProjectProps = {...(data as any)}
            ipcRenderer.invoke(
                `ImportProject`,
                {
                    LocalProjectName: importData.name,
                    ProjectFilePath: importData.path,
                    Password: importData?.password || ""
                },
                token
            )
        }

        ipcRenderer.on(`${token}-data`, async (e, data: ProjectIOProgress) => {
            if (!!data.Verbose) {
                infos.push(data.Verbose)
            }
            if (data.Percent > 0) {
                setPercent(data.Percent * 100)
            }
            if (!!data.TargetPath) {
                pathRef.current = data.TargetPath
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`${hintTitle} error:  ${error}`)
            infos.push(`${hintTitle} error: ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e) => {
            info(`${hintTitle} finished`)
            if (isImport) onSuccess("isImport")
            if (isExport) {
                onSuccess("isExport")
                setTimeout(() => {
                    if (pathRef.current) openABSFileLocated(pathRef.current)
                }, 500)
            }
        })

        const id = setInterval(() => {
            setInfos([...infos])
        }, 1000)

        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-ImportProject", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [visible])

    const onClose = useMemoizedFn(() => {
        setToken(randomString(40))
        setPercent(0)
        setInfos([])
        pathRef.current = ""
        setVisible(false)
    })

    return (
        <div className={visible ? styles["transfer-project-mask"] : styles["transfer-project-hidden-mask"]}>
            <div className={styles["transfer-project-mask-body"]}>
                <div
                    className={classnames(
                        {
                            [styles["project-export-modal"]]: isExport,
                            [styles["project-import-modal"]]: isImport
                        },
                        styles["modal-transfer-project"]
                    )}
                >
                    <div className={styles["transfer-project-wrapper"]}>
                        <div className={styles["modal-left-wrapper"]}>
                            <div className={styles["modal-icon"]}>
                                {isExport && <ProjectExportSvgIcon />}
                                {isImport && <ProjectImportSvgIcon />}
                            </div>
                        </div>

                        <div className={styles["modal-right-wrapper"]}>
                            <div className={styles["modal-right-title"]}>
                                {isExport && "项目导出中..."}
                                {isImport && "项目导入中..."}
                            </div>
                            <div className={styles["download-progress"]}>
                                <Progress
                                    strokeColor='#F28B44'
                                    trailColor='#F0F2F5'
                                    percent={+percent.toFixed(2)}
                                    format={(p, sp) => {
                                        return <div className={styles["progress-content-style"]}>{`进度 ${p}%`}</div>
                                    }}
                                />
                            </div>
                            <div className={styles["modal-right-content"]}>
                                {infos.map((item) => {
                                    return (
                                        <div
                                            key={item}
                                            className={classnames({
                                                [styles["error-style"]]: item.indexOf("error") > -1
                                            })}
                                        >
                                            {item}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className={styles["modal-right-btn"]}>
                                <YakitButton size='max' type='outline2' onClick={onClose}>
                                    取消
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
