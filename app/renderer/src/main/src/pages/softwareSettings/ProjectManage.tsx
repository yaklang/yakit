import React, {memo, ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {useDebounceEffect, useGetState, useMemoizedFn, useScroll, useVirtualList} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QueryGeneralRequest} from "../invoker/schema"
import {failed, info, yakitFailed, warn, success} from "@/utils/notification"
import {
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    DotsVerticalSvgIcon,
    ImportSvgIcon,
    OutlinePlusIcon,
    PlusBoldSvgIcon,
    PlusIcon,
    ResizerIcon,
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
    ProjectViewGridSvgIcon,
    TemporaryProjectSvgIcon
} from "./icon"
import ReactResizeDetector from "react-resize-detector"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {formatTimestamp} from "@/utils/timeUtil"
import {Cascader, Divider, Dropdown, DropdownProps, Form, Progress, Upload} from "antd"
import {YakitMenu, YakitMenuProp} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {randomString} from "@/utils/randomUtil"
import {openABSFileLocated} from "@/utils/openWebsite"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YaklangEngineMode} from "@/yakitGVDefine"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {
    OutlineDocumentduplicateIcon,
    OutlineExportIcon,
    OutlinePencilaltIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"

import classNames from "classnames"
import styles from "./ProjectManage.module.scss"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import emiter from "@/utils/eventBus/eventBus"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {AutoTextarea} from "../fuzzer/components/AutoTextarea/AutoTextarea"
import {isCommunityEdition} from "@/utils/envfile"
import {setClipboardText} from "@/utils/clipboard"

const {ipcRenderer} = window.require("electron")
const {YakitPanel} = YakitCollapse

export interface ProjectManageProp {
    engineMode: YaklangEngineMode
    onEngineModeChange: (mode: YaklangEngineMode, keepalive?: boolean) => any
    onFinish: () => any
}
/** (新建|编辑)项目|文件夹参数 */
export interface ProjectParamsProps {
    Id?: number
    ProjectName: string
    Description?: string
    Type: string
    FolderId?: number
    ChildFolderId?: number
}
/** 项目列表查询条件 */
interface ProjectParamsProp extends QueryGeneralRequest {
    ProjectName?: string
    Description?: string
    Type: string
    FolderId?: number
    ChildFolderId?: number
}
/** 单条项目数据 */
export interface ProjectDescription {
    Id: number
    ProjectName: string
    Description: string
    DatabasePath: string
    CreatedAt: number
    UpdateAt: number
    FolderId: number
    FolderName: string
    ChildFolderId: number
    ChildFolderName: string
    Type: string
    FileSize: string
}
export interface ProjectsResponse {
    Pagination: {Page: number; Limit: number}
    Projects: ProjectDescription[]
    Total: number
    TotalPage: number
    ProjectToTal: number
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
    {key: "all", label: "全部文件", itemIcon: <ProjectViewGridSvgIcon className={styles["all-icon"]} />},
    {
        key: "project",
        label: "项目",
        itemIcon: <ProjectDocumentTextSvgIcon className={styles["project-icon"]} />
    },
    {
        key: "file",
        label: "文件夹",
        itemIcon: <ProjectFolderOpenSvgIcon className={styles["floder-icon"]} />
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
export const timeToName: {[key: string]: string} = {}
for (let item of timeFilter) timeToName[item.key] = item.label

const DefaultProjectInfo: ProjectDescription = {
    Id: 0,
    ProjectName: "",
    Description: "",
    DatabasePath: "",
    CreatedAt: 0,
    UpdateAt: 0,
    FolderId: 0,
    FolderName: "",
    ChildFolderId: 0,
    ChildFolderName: "",
    Type: "",
    FileSize: ""
}

const ProjectManage: React.FC<ProjectManageProp> = memo((props) => {
    const {engineMode, onFinish} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<ProjectParamsProp>({
        Type: "all",
        Pagination: {Page: 1, Limit: 20, Order: "desc", OrderBy: "updated_at"}
    })
    const [__data, setData, getData] = useGetState<ProjectsResponse>({
        Pagination: {Page: 1, Limit: 20},
        Projects: [],
        Total: 0,
        TotalPage: 0,
        ProjectToTal: 0
    })

    const [files, setFiles] = useState<ProjectDescription[]>([])
    const [search, setSearch] = useState<{name: string; total: number}>({name: "", total: 0})

    const [latestProject, setLatestProject] = useState<ProjectDescription>()

    const [vlistHeigth, setVListHeight] = useState(600)
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    const [list] = useVirtualList(getData().Projects, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 48 + 1,
        overscan: 5
    })

    const [loadMore, setLoadMore] = useState<boolean>(false)
    const position = useScroll(containerRef, ({top}) => {
        if (containerRef.current) {
            const clientHeight = containerRef.current?.clientHeight
            const scrollHeight = containerRef.current?.scrollHeight

            if (loadMore) return false
            if (top + clientHeight > scrollHeight - 10) {
                if (getData().Projects.length === +getData().Total) return false
                setLoadMore(true)
                update(getParams().Pagination.Page + 1)
            }
        }

        return false
    })

    const [headerShow, setHeaderShow] = useState<boolean>(false)

    const [stopUpdate, setStopUpdate] = useState<boolean>(false)

    useDebounceEffect(
        () => {
            if (stopUpdate) {
                setStopUpdate(false)
                return
            }
            if (!containerRef || !wrapperRef) return
            // wrapperRef 中的数据没有铺满 containerRef,那么就要请求更多的数据
            const containerHeight = containerRef.current?.clientHeight
            const wrapperHeight = wrapperRef.current?.clientHeight

            if (wrapperHeight && wrapperHeight <= containerHeight) {
                if (getData().Projects.length < +getData().Total) {
                    setParams({
                        ...getParams(),
                        Pagination: {...getParams().Pagination, Page: getParams().Pagination.Page + 1}
                    })
                    setTimeout(() => update(), 300)
                }
            }
        },
        [wrapperRef.current?.clientHeight],
        {wait: 500}
    )

    const [typeShow, setTypeShow] = useState<boolean>(false)
    const [timeShow, setTimeShow] = useState<boolean>(false)

    const projectHeader: HeaderProp<ProjectDescription>[] = useMemo(() => {
        return [
            {
                key: "ProjectName",
                name: typeToName["all"],
                width: "15%",
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
                                    if (params.Type !== key)
                                        setParams({...params, Pagination: {...params.Pagination, Page: 1}, Type: key})
                                    setTimeout(() => update(), 300)
                                }
                            }}
                        >
                            <div
                                className={classNames(styles["project-table-filter"], {
                                    [styles["project-table-filter-dropdown"]]: typeShow
                                })}
                            >
                                {typeToName[params.Type || "all"]}
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
                            className={classNames(styles["project-table-body-wrapper"], styles["project-name-wrapper"])}
                        >
                            {!data.Type || data.Type === "project" ? (
                                <ProjectDocumentTextSvgIcon className={styles["opt-project-icon"]} />
                            ) : (
                                <ProjectFolderOpenSvgIcon className={styles["opt-floder-icon"]} />
                            )}
                            <div className={styles["project-style"]} title={data.ProjectName}>
                                {data.ProjectName}
                            </div>
                        </div>
                    )
                }
            },
            {
                key: "Description",
                name: "备注",
                width: "30%",
                render: (data) => {
                    try {
                        const arr: {Key: string; Value: string}[] = JSON.parse(data.Description)
                        let str = ""
                        arr.forEach((item) => {
                            str += `${item.Key}：${item.Value}; `
                        })
                        return str
                    } catch (error) {
                        return data.Description
                    }
                }
            },
            {
                key: "DatabasePath",
                name: "存储路径",
                width: "30%",
                render: (data, index) => {
                    return (
                        <div
                            className={classNames(
                                styles["project-table-body-wrapper"],
                                styles["database-path-wrapper"]
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                className={styles["project-style"]}
                                title={data.DatabasePath}
                                onClick={() => {
                                    if (data.DatabasePath) {
                                        ipcRenderer
                                            .invoke("is-file-exists", data.DatabasePath)
                                            .then((flag: boolean) => {
                                                if (flag) {
                                                    openABSFileLocated(data.DatabasePath)
                                                } else {
                                                    failed("目标文件已不存在!")
                                                }
                                            })
                                            .catch(() => {})
                                    }
                                }}
                            >
                                {data.DatabasePath || "-"}
                            </div>
                            {data.DatabasePath && (
                                <CopyComponents copyText={data.DatabasePath} onAfterCopy={() => {}} />
                            )}
                        </div>
                    )
                }
            },
            {
                key: "FileSize",
                name: "大小",
                width: "10%",
                render: (data) => {
                    return <>{!data.Type || data.Type === "project" ? data.FileSize : "-"}</>
                }
            },
            {
                key: "CreatedAt",
                name: timeToName["updated_at"],
                width: "15%",
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
                                        setParams({
                                            ...params,
                                            Pagination: {...params.Pagination, Page: 1, OrderBy: key}
                                        })
                                    setTimeout(() => update(), 300)
                                }
                            }}
                        >
                            <div
                                className={classNames(styles["project-table-filter"], {
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
                    return params.Pagination.OrderBy === "created_at"
                        ? formatTimestamp(data.CreatedAt)
                        : formatTimestamp(data.UpdateAt)
                }
            }
        ]
    }, [params, typeShow, timeShow])

    const [operateShow, setOperateShow] = useState<number>(-1)
    const projectOperate = useMemoizedFn((info: ProjectDescription) => {
        const {Id, Type} = info

        return (
            <div className={styles["project-operate-wrapper"]} onClick={(e) => e.stopPropagation()}>
                {Type === "file" ? (
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
                                    itemIcon: <ProjectDocumentTextSvgIcon className={styles["project-icon"]} />
                                },
                                {
                                    key: "newFolder",
                                    label: "新建子文件夹",
                                    itemIcon: <ProjectFolderOpenSvgIcon className={styles["floder-icon"]} />
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
                            className={classNames(styles["btn-wrapper"], {
                                [styles["btn-focus-style"]]: operateShow >= 0 && operateShow === +Id
                            })}
                        >
                            <OutlinePlusIcon className={styles["btn-style"]} />
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
                            className={classNames(styles["btn-wrapper"], {
                                [styles["btn-focus-style"]]: operateShow >= 0 && operateShow === +Id
                            })}
                        >
                            <OutlineExportIcon className={styles["btn-style"]} />
                        </div>
                    </DropdownMenu>
                )}

                {info.ProjectName !== "[default]" && (
                    <>
                        <div className={styles["divider-style"]}>
                            <div className={styles["boder-style"]}></div>
                        </div>
                        <div className={styles["btn-wrapper"]} onClick={() => operateFunc("edit", info)}>
                            <OutlinePencilaltIcon className={styles["btn-style"]} />
                        </div>
                    </>
                )}

                {info.ProjectName !== "[default]" && (
                    <>
                        <div className={styles["divider-style"]}>
                            <div className={styles["boder-style"]}></div>
                        </div>

                        <div
                            className={styles["btn-wrapper"]}
                            onClick={() => {
                                setDelId({Id: +info.Id, Type: info.Type})
                                setDelShow(true)
                            }}
                        >
                            <OutlineTrashIcon className={styles["del-style"]} />
                        </div>
                    </>
                )}
            </div>
        )
    })

    useEffect(() => {
        emiter.on("onGetProjectInfo", getProjectInfo)
        return () => {
            emiter.off("onGetProjectInfo", getProjectInfo)
        }
    }, [])

    const getProjectInfo = async () => {
        try {
            await delTemporaryProject()
            const res2: ProjectDescription = await ipcRenderer.invoke("GetCurrentProject")
            setLatestProject(res2 || undefined)
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    useEffect(() => {
        if (!isExportTemporaryProjectFlag) {
            getProjectInfo()
        }
        update()
    }, [])

    const update = useMemoizedFn((page?: number) => {
        const param: ProjectParamsProp = {
            ...getParams(),
            Pagination: {
                ...getParams().Pagination,
                Page: page || getParams().Pagination.Page,
                Limit: getParams().Pagination.Limit
            }
        }
        if (page) setParams({...param, Pagination: {...param.Pagination, Page: page}})

        // @ts-ignore
        if (param.Type === "all") delete param.Type
        if (param.ProjectName) param.Type = "project"
        setLoading(true)
        ipcRenderer
            .invoke("GetProjects", param)
            .then((rsp: ProjectsResponse) => {
                try {
                    if (param.Pagination.Page > 1) {
                        const newData = {
                            ...rsp,
                            Projects: getData().Projects.concat(rsp.Projects)
                        }
                        setData(newData)
                    } else {
                        setData({...rsp})
                    }
                    setSearch({name: param.ProjectName || "", total: +rsp.Total})
                } catch (e) {
                    failed("处理项目数据失败: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`查询 Projects 失败：${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setLoadMore(false)
                }, 300)
            })
    })

    const [delShow, setDelShow] = useState<boolean>(false)
    const [delId, setDelId] = useState<{Id: number; Type: string}>({Id: -1, Type: "project"})
    const delProjectFolder = useMemoizedFn((isDel: boolean) => {
        if (delId.Id === -1) {
            failed("该条项目无数据或无关键信息，无法删除!")
            return
        }

        setLoading(true)
        ipcRenderer
            .invoke("DeleteProject", {Id: +delId.Id, IsDeleteLocal: isDel})
            .then((e) => {
                setStopUpdate(true)
                info("删除成功")
                const projects = getData().Projects.filter((item) => +item.Id !== delId.Id)
                const newData = {
                    ...getData(),
                    Projects: projects
                }
                setData(newData)
                ipcRenderer
                    .invoke("GetCurrentProject")
                    .then((rsp: ProjectDescription) => setLatestProject(rsp || undefined))
            })
            .catch((e) => {
                failed(`删除失败: ${e}`)
            })
            .finally(() => {
                setDelId({Id: -1, Type: "project"})
                setDelShow(false)
                setTimeout(() => setLoading(false), 300)
            })
    })

    const operateFunc = useMemoizedFn((type: string, data?: ProjectDescription) => {
        switch (type) {
            case "newProject":
                setModalInfo(data ? {visible: true, parentNode: data} : {visible: true})
                return
            case "newFolder":
                setModalInfo(data ? {visible: true, isFolder: true, parentNode: data} : {visible: true, isFolder: true})
                return
            case "import":
                setModalInfo({visible: true, isNew: false, isImport: true, parentNode: data || undefined})
                return
            case "encryption":
                if (!data || !data.Id) {
                    failed("该条项目无关键信息，无法导出!")
                    return
                }

                setModalInfo({visible: true, isNew: false, isExport: true, project: data})
                return
            case "plaintext":
                if (!data || !data.Id) {
                    failed("该条项目无关键信息，无法导出!")
                    return
                }
                setTransferShow({
                    visible: true,
                    isExport: true,
                    data: {
                        Id: data.Id,
                        ProjectName: data.ProjectName,
                        Password: ""
                    }
                })
                return
            case "edit":
                if (!data || !data.Id) {
                    failed("该条项目无关键信息，请刷新列表后重试!")
                    return
                }
                setModalInfo({visible: true, isFolder: data?.Type === "file", project: data})
                return
            case "copyPath":
                if (!data || !data.DatabasePath) {
                    failed("该条项目无数据或无关键信息，复制失败!")
                    return
                }
                setClipboardText(data.DatabasePath)
                return
            case "setCurrent":
                if (!data || !data.Id) {
                    failed("该条项目无数据或无关键信息，无法连接!")
                    return
                }
                setLoading(true)
                ipcRenderer
                    .invoke("SetCurrentProject", {Id: data.Id})
                    .then((e) => {
                        info("已切换数据库")
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
            case "openFile":
                if (!data || !data?.Id || !data?.ProjectName) {
                    failed("该条文件夹无数据或无关键信息，无法打开!")
                    return
                }
                if (files.length === 2) return
                setLoading(true)
                setFiles(files.concat([{...data}]))
                if (files.length > 0) {
                    setParams({
                        Type: params.Type,
                        Pagination: {...params.Pagination, Page: 1},
                        FolderId: +files[0].Id,
                        ChildFolderId: +data.Id
                    })
                } else {
                    setParams({Type: params.Type, Pagination: {...params.Pagination, Page: 1}, FolderId: +data.Id})
                }
                setTimeout(() => {
                    update()
                }, 300)
                return
            default:
                return
        }
    })

    const [modalInfo, setModalInfo] = useState<{
        visible: boolean
        isNew?: boolean
        isFolder?: boolean
        isExport?: boolean
        isImport?: boolean
        project?: ProjectDescription
        parentNode?: ProjectDescription
    }>({visible: false})
    const [modalLoading, setModalLoading] = useState<boolean>(false)

    const {isExportTemporaryProjectFlag, setTemporaryProjectId, delTemporaryProject} = useTemporaryProjectStore()

    const [detectionTemporaryProjectVisible, setDetectionTemporaryProjectVisible] = useState<boolean>(false)

    const getTemporaryProjectId = async () => {
        let id = ""
        try {
            const res = await ipcRenderer.invoke("GetTemporaryProject")
            if (res) {
                id = res.Id
            }
        } catch (error) {}

        setTemporaryProjectId(id)
        return id
    }

    // 创建临时项目
    const creatTemporaryProject = useMemoizedFn(async () => {
        try {
            const res = await ipcRenderer.invoke("NewProject", {
                Type: "project",
                ProjectName: "[temporary]"
            })
            const newTemporaryId = res.Id + ""
            setTemporaryProjectId(newTemporaryId)
            await ipcRenderer.invoke("SetCurrentProject", {Id: newTemporaryId})
            info("切换临时项目成功")
            onFinish()
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const [inquireIntoProjectVisible, setInquireIntoProjectVisible] = useState<boolean>(false)
    const [newProjectInfo, setNewProjectInfo] = useState<{Id: string; ProjectName: string}>({Id: "", ProjectName: ""})

    /** 弹窗确认事件的回调 */
    const onModalSubmit = useMemoizedFn(
        (type: string, value: ProjectFolderInfoProps | ExportProjectProps | ImportProjectProps) => {
            switch (type) {
                case "isNewProject":
                    let projectInfo: ProjectFolderInfoProps = {...(value as any)}
                    const newProject: ProjectParamsProps = {
                        ProjectName: projectInfo.ProjectName,
                        Description: projectInfo.Description || "",
                        FolderId: projectInfo.FolderId ? +projectInfo.FolderId : 0,
                        ChildFolderId: projectInfo.ChildFolderId ? +projectInfo.ChildFolderId : 0,
                        Type: "project"
                    }
                    if (projectInfo.Id) {
                        newProject.Id = +projectInfo.Id
                        ipcRenderer
                            .invoke("UpdateProject", newProject)
                            .then((res) => {
                                success("编辑项目成功")
                                setModalInfo({visible: false})
                                setNewProjectInfo(res)
                                setTimeout(() => {
                                    update()
                                }, 300)
                            })
                            .catch((e) => {
                                failed(`编辑项目失败：${e}`)
                            })
                            .finally(() => {
                                setTimeout(() => {
                                    setModalLoading(false)
                                }, 300)
                            })
                    } else {
                        ipcRenderer
                            .invoke("NewProject", newProject)
                            .then((res) => {
                                success("创建新项目成功")
                                setModalInfo({visible: false})
                                setParams({...params, Pagination: {...params.Pagination, Page: 1}})
                                setNewProjectInfo(res)
                                setTimeout(() => {
                                    setInquireIntoProjectVisible(true)
                                    update()
                                }, 300)
                            })
                            .catch((e) => {
                                failed(`创建新项目失败：${e}`)
                            })
                            .finally(() => {
                                setTimeout(() => {
                                    setModalLoading(false)
                                }, 300)
                            })
                    }
                    return
                case "isNewFolder":
                    let folderInfo: ProjectFolderInfoProps = {...(value as any)}
                    const newFolder: ProjectParamsProps = {
                        ProjectName: folderInfo.ProjectName,
                        Description: folderInfo.Description || "",
                        FolderId: folderInfo.FolderId ? +folderInfo.FolderId : 0,
                        ChildFolderId: folderInfo.ChildFolderId ? +folderInfo.ChildFolderId : 0,
                        Type: "file"
                    }
                    if (newFolder.ProjectName === folderInfo.oldName) {
                        if (folderInfo.Id) {
                            newFolder.Id = +folderInfo.Id
                            ipcRenderer
                                .invoke("UpdateProject", newFolder)
                                .then((res) => {
                                    success("编辑文件夹成功")
                                    setModalInfo({visible: false})
                                    setParams({...params, Pagination: {...params.Pagination, Page: 1}})
                                    setTimeout(() => update(), 300)
                                })
                                .catch((e) => {
                                    failed(`编辑文件夹失败：${e}`)
                                })
                                .finally(() => {
                                    setTimeout(() => {
                                        setModalLoading(false)
                                    }, 300)
                                })
                        } else {
                            ipcRenderer
                                .invoke("NewProject", newFolder)
                                .then(() => {
                                    success("创建新文件夹成功")
                                    setModalInfo({visible: false})
                                    setParams({...params, Pagination: {...params.Pagination, Page: 1}})
                                    setTimeout(() => update(), 300)
                                })
                                .catch((e) => {
                                    failed(`创建新文件夹失败：${e}`)
                                })
                                .finally(() => {
                                    setTimeout(() => {
                                        setModalLoading(false)
                                    }, 300)
                                })
                        }
                    } else {
                        ipcRenderer
                            .invoke("IsProjectNameValid", newFolder)
                            .then((e) => {
                                if (folderInfo.Id) {
                                    newFolder.Id = +folderInfo.Id
                                    ipcRenderer
                                        .invoke("UpdateProject", newFolder)
                                        .then((res) => {
                                            success("编辑文件夹成功")
                                            setModalInfo({visible: false})
                                            setParams({...params, Pagination: {...params.Pagination, Page: 1}})
                                            setTimeout(() => update(), 300)
                                        })
                                        .catch((e) => {
                                            failed(`编辑文件夹失败：${e}`)
                                        })
                                        .finally(() => {
                                            setTimeout(() => {
                                                setModalLoading(false)
                                            }, 300)
                                        })
                                } else {
                                    ipcRenderer
                                        .invoke("NewProject", newFolder)
                                        .then(({Id, ProjectName}: {Id: number; ProjectName: string}) => {
                                            success("创建新文件夹成功")
                                            setModalInfo({visible: false})
                                            if (folderInfo.parent) {
                                                setFiles([
                                                    {...folderInfo.parent},
                                                    {...DefaultProjectInfo, Id: +Id, ProjectName: ProjectName}
                                                ])
                                                setParams({
                                                    Type: "all",
                                                    FolderId: +folderInfo.parent.Id,
                                                    ChildFolderId: +Id,
                                                    Pagination: {...params.Pagination, Page: 1}
                                                })
                                            } else {
                                                setFiles([
                                                    {...DefaultProjectInfo, Id: +Id, ProjectName: ProjectName}
                                                ])
                                                setParams({
                                                    Type: "all",
                                                    FolderId: +Id,
                                                    Pagination: {...params.Pagination, Page: 1}
                                                })
                                            }
                                            setTimeout(() => update(), 300)
                                        })
                                        .catch((e) => {
                                            failed(`创建新文件夹失败：${e}`)
                                        })
                                        .finally(() => {
                                            setTimeout(() => {
                                                setModalLoading(false)
                                            }, 300)
                                        })
                                }
                            })
                            .catch((e) => {
                                failed(`${folderInfo.Id ? "编辑" : "创建新"}文件夹失败，文件夹名校验不通过：${e}`)
                                setTimeout(() => {
                                    setModalLoading(false)
                                }, 300)
                            })
                    }

                    return
                case "isImport":
                    setModalInfo({visible: false})
                    setParams({...params, Pagination: {...params.Pagination, Page: 1}})
                    setTimeout(() => {
                        update()
                        setModalLoading(false)
                    }, 300)
                    return
                case "isExport":
                    setModalInfo({visible: false})
                    setTimeout(() => {
                        setModalLoading(false)
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

    const projectContextMenu = useMemoizedFn((project: ProjectDescription) => {
        showByRightContext({
            data: [
                {
                    key: "setCurrent",
                    label: "打开项目"
                },
                {
                    key: "export",
                    label: "导出",
                    children: [
                        {
                            key: "encryption",
                            label: "加密导出"
                        },
                        {
                            key: "plaintext",
                            label: "明文导出"
                        }
                    ]
                },
                {
                    key: "edit",
                    label: "编辑",
                    disabled: project?.ProjectName === "[default]"
                },
                {
                    key: "copyPath",
                    label: "复制路径"
                },
                {type: "divider"},
                {
                    key: "delete",
                    label: "删除",
                    type: "danger",
                    disabled: project?.ProjectName === "[default]"
                }
            ],
            onClick: ({key}) => {
                if (key === "delete") {
                    setDelId({Id: +project.Id, Type: project.Type})
                    setDelShow(true)
                } else operateFunc(key, project)
            }
        })
    })

    const onRefreshProjectList = useMemoizedFn(() => {
        update(1)
    })
    useEffect(() => {
        emiter.on("onRefreshProjectList", onRefreshProjectList)
        return () => {
            emiter.off("onRefreshProjectList", onRefreshProjectList)
        }
    }, [])

    return (
        <div className={styles["project-manage-wrapper"]}>
            <div className={styles["project-manage-container"]}>
                <div className={styles["project-header"]}>
                    <div className={styles["header-title"]}>
                        <div className={styles["title-style"]}>项目管理</div>
                        <div className={styles["total-style"]}>
                            Total <span className={styles["total-number"]}>{__data.ProjectToTal}</span>
                        </div>
                    </div>
                    <YakitInput.Search
                        size='large'
                        placeholder='请输入项目名称'
                        value={params.ProjectName}
                        onChange={(e) =>
                            setParams({
                                Type: "all",
                                Pagination: {...params.Pagination, Page: 1},
                                ProjectName: e.target.value
                            })
                        }
                        style={{width: 288}}
                        onSearch={() => {
                            if (getParams().ProjectName) {
                                setFiles([])
                                setParams({
                                    Type: "all",
                                    Pagination: {...getParams().Pagination, Page: 1},
                                    ProjectName: getParams().ProjectName
                                })
                            }

                            setTimeout(() => update(1), 300)
                        }}
                    />
                </div>

                <div className={styles["project-operate"]}>
                    <div
                        className={classNames(styles["open-recent-wrapper"], {
                            [styles["open-recent-focus-wrapper"]]: headerShow
                        })}
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
                                    <div className={styles["subtitle-style"]}>{`最近操作时间：${
                                        latestProject ? formatTimestamp(latestProject?.UpdateAt) : "- -"
                                    }`}</div>
                                </div>
                            </div>

                            {/* { engineMode !== "remote" && ( */}
                            <div className={styles["icon-wrapper"]} onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu
                                    dropdown={{
                                        placement: "bottomRight",
                                        overlayClassName: styles["dropdown-menu-filter-wrapper"],
                                        onVisibleChange: (open) => setHeaderShow(open)
                                    }}
                                    menu={{
                                        data: [
                                            {
                                                key: "export",
                                                label: "导出",
                                                itemIcon: <OutlineExportIcon />,
                                                children: [
                                                    {key: "encryption", label: "加密导出"},
                                                    {key: "plaintext", label: "明文导出"}
                                                ]
                                            },
                                            {
                                                key: "edit",
                                                label: "编辑",
                                                disabled: latestProject?.ProjectName === "[default]",
                                                itemIcon: <OutlinePencilaltIcon />
                                            },
                                            {
                                                key: "copyPath",
                                                label: "复制路径",
                                                itemIcon: <OutlineDocumentduplicateIcon />
                                            },
                                            {type: "divider"},
                                            {
                                                key: "delete",
                                                label: "删除",
                                                type: "danger",
                                                disabled: latestProject?.ProjectName === "[default]",
                                                itemIcon: <OutlineTrashIcon />
                                            }
                                        ],
                                        className: styles["dropdown-menu-body"],
                                        popupClassName: styles["dropdown-menu-filter-wrapper"],
                                        onClick: ({key}) => {
                                            setHeaderShow(false)
                                            if (key === "delete") {
                                                if (latestProject) {
                                                    setDelId({Id: +latestProject.Id, Type: latestProject.Type})
                                                    setDelShow(true)
                                                }
                                            } else operateFunc(key, latestProject)
                                        }
                                    }}
                                >
                                    <div
                                        className={classNames(styles["icon-body"], {
                                            [styles["icon-focus-body"]]: headerShow
                                        })}
                                    >
                                        <DotsVerticalSvgIcon />
                                    </div>
                                </DropdownMenu>
                            </div>
                            {/* )} */}
                        </div>
                    </div>

                    <div
                        className={classNames(styles["btn-wrapper"], styles["new-temporary-project-wrapper"])}
                        onClick={async () => {
                            if (await getTemporaryProjectId()) {
                                setDetectionTemporaryProjectVisible(true)
                            } else {
                                await creatTemporaryProject()
                            }
                        }}
                    >
                        <div className={styles["btn-body"]}>
                            <div className={styles["body-title"]}>
                                <TemporaryProjectSvgIcon className={styles["temporary-project-icon"]} />
                                临时项目
                            </div>
                            <div className={styles["icon-style"]}>
                                <PlusBoldSvgIcon />
                            </div>
                        </div>
                    </div>

                    <div
                        className={classNames(styles["btn-wrapper"], styles["new-project-wrapper"])}
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
                        className={classNames(styles["btn-wrapper"], styles["new-folder-wrapper"])}
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

                    {/* { engineMode !== "remote" && ( */}
                    <div
                        className={classNames(styles["btn-wrapper"], styles["import-wrapper"])}
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
                    {/* )} */}
                </div>

                {search.name && (
                    <div className={styles["project-search"]}>
                        搜索到 <span className={styles["total-style"]}>{search.total}</span> 条“{search.name}”相关内容
                    </div>
                )}

                {files.length > 0 && (
                    <div className={styles["project-path-wrapper"]}>
                        <div
                            className={styles["path-style"]}
                            onClick={() => {
                                setParams({
                                    Type: "all",
                                    Pagination: {Page: 1, Limit: 20, Order: "desc", OrderBy: "updated_at"}
                                })

                                setTimeout(() => {
                                    setFiles([])
                                    update()
                                }, 500)
                            }}
                        >
                            本地文件
                        </div>
                        <ChevronRightIcon className={styles["icon-style"]} />
                        <div
                            className={styles["path-style"]}
                            onClick={() => {
                                if (files.length > 1) {
                                    setLoading(true)
                                    setParams({
                                        Type: params.Type,
                                        Pagination: {...params.Pagination, Page: 1},
                                        FolderId: +files[0].Id
                                    })
                                    setTimeout(() => {
                                        setFiles([files[0]])
                                        update()
                                    }, 500)
                                }
                            }}
                        >
                            {files[0].ProjectName}
                        </div>
                        {files.length > 1 && (
                            <>
                                <ChevronRightIcon className={styles["icon-style"]} />
                                <div className={styles["path-style"]}>{files[1].ProjectName}</div>
                            </>
                        )}
                    </div>
                )}

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
                                {/* { engineMode !== "remote" &&  */}
                                <div style={{width: 120}}>操作</div>
                                {/* } */}
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
                                <div
                                    ref={containerRef as any}
                                    style={{height: vlistHeigth, overflow: "auto overlay", overflowAnchor: "none"}}
                                >
                                    <div ref={wrapperRef as any}>
                                        {__data.Projects.length === 0 ? (
                                            <>
                                                {files.length > 0 && (
                                                    <div className={styles["table-empty-wrapper"]}>
                                                        <YakitEmpty
                                                            descriptionReactNode={
                                                                <>
                                                                    <div className={styles["title-style"]}>
                                                                        <span className={styles["file-style"]}>
                                                                            {files[files.length - 1].ProjectName}
                                                                        </span>{" "}
                                                                        内暂无项目内容
                                                                    </div>
                                                                    <div className={styles["operate-btn"]}>
                                                                        <YakitButton
                                                                            size='max'
                                                                            onClick={() =>
                                                                                operateFunc(
                                                                                    "newProject",
                                                                                    files[files.length - 1]
                                                                                )
                                                                            }
                                                                        >
                                                                            新建项目
                                                                        </YakitButton>
                                                                        <YakitButton
                                                                            size='max'
                                                                            type='outline2'
                                                                            onClick={() =>
                                                                                operateFunc(
                                                                                    "import",
                                                                                    files[files.length - 1]
                                                                                )
                                                                            }
                                                                        >
                                                                            导入项目
                                                                        </YakitButton>
                                                                    </div>
                                                                </>
                                                            }
                                                        />
                                                    </div>
                                                )}
                                                {params.ProjectName && (
                                                    <div className={styles["table-empty-wrapper"]}>
                                                        <YakitEmpty
                                                            descriptionReactNode={
                                                                <div className={styles["title-style"]}>
                                                                    搜索结果“空”
                                                                </div>
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            list.map((i) => {
                                                return (
                                                    <div
                                                        key={i.index}
                                                        style={{height: 48 + 1}}
                                                        className={classNames(styles["table-opt"], {
                                                            [styles["table-opt-selected"]]:
                                                                operateShow >= 0 && operateShow === +i.data.Id
                                                        })}
                                                        onClick={(e) => {
                                                            if (!i.data.Type || i.data.Type === "project") {
                                                                operateFunc("setCurrent", i.data)
                                                            }
                                                            if (i.data.Type === "file") {
                                                                operateFunc("openFile", i.data)
                                                            }
                                                        }}
                                                        onContextMenu={() => {
                                                            if (!i.data.Type || i.data.Type === "project") {
                                                                projectContextMenu(i.data)
                                                            }
                                                        }}
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
                                                        {/* { engineMode !== "remote" && ( */}
                                                        <div style={{width: 120}} className={styles["opt-operate"]}>
                                                            {projectOperate(i.data)}
                                                        </div>
                                                        {/* )} */}
                                                    </div>
                                                )
                                            })
                                        )}
                                        {loadMore && <div className={styles["table-loading-more"]}>正在加载中...</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </YakitSpin>
                </div>
            </div>

            <NewProjectAndFolder
                {...modalInfo}
                setVisible={(open: boolean) => setModalInfo({visible: open})}
                loading={modalLoading}
                setLoading={setModalLoading}
                onModalSubmit={onModalSubmit}
            />

            <TransferProject
                {...transferShow}
                onSuccess={onTransferProjectHint}
                setVisible={(open: boolean) => setTransferShow({visible: open})}
            />

            <YakitHint
                visible={delShow}
                title={delId.Type === "file" ? "删除文件夹" : "删除项目"}
                content={
                    delId.Type === "file" ? "删除文件夹是否同时清除文件夹里所有本地文件?" : "是否同时清除本地文件?"
                }
                okButtonText='保留'
                cancelButtonText='清除'
                footerExtra={
                    <YakitButton
                        size='max'
                        type='outline2'
                        onClick={() => {
                            setDelShow(false)
                            setDelId({Id: -1, Type: "project"})
                        }}
                    >
                        取消
                    </YakitButton>
                }
                onOk={() => delProjectFolder(false)}
                onCancel={() => delProjectFolder(true)}
            />

            <YakitHint
                visible={inquireIntoProjectVisible}
                title='提示'
                content={`是否需要进入新建项目${newProjectInfo?.ProjectName}`}
                onOk={() => {
                    setLoading(true)
                    setInquireIntoProjectVisible(false)
                    ipcRenderer
                        .invoke("SetCurrentProject", {Id: newProjectInfo?.Id})
                        .then((e) => {
                            info("已切换数据库")
                            setNewProjectInfo({Id: "", ProjectName: ""})
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
                }}
                onCancel={() => {
                    setNewProjectInfo({Id: "", ProjectName: ""})
                    setInquireIntoProjectVisible(false)
                }}
            />

            <YakitHint
                visible={detectionTemporaryProjectVisible}
                title='提示'
                content='检测到有临时项目正在使用中，是否需要删除并创建新的临时项目'
                onOk={async () => {
                    // 先删临时项目
                    await delTemporaryProject()
                    await creatTemporaryProject()
                    setDetectionTemporaryProjectVisible(false)
                }}
                onCancel={() => {
                    setDetectionTemporaryProjectVisible(false)
                }}
            />
        </div>
    )
})

export default ProjectManage

interface NewProjectAndFolderProps {
    isNew?: boolean
    isFolder?: boolean
    isExport?: boolean
    isImport?: boolean
    project?: ProjectDescription
    parentNode?: ProjectDescription
    visible: boolean
    setVisible: (open: boolean) => any
    loading: boolean
    setLoading: (flag: boolean) => any
    onModalSubmit: (type: string, value: ProjectFolderInfoProps | ExportProjectProps | ImportProjectProps) => any
}
interface ProjectFolderInfoProps {
    Id?: number
    oldName?: string
    ProjectName: string
    Description?: string
    FolderId?: number
    ChildFolderId?: number
    parent?: ProjectDescription
}
export interface ExportProjectProps {
    Id: number
    ProjectName: string
    Password: string
}
interface ImportProjectProps {
    ProjectFilePath: string
    LocalProjectName?: string
    Password?: string
    FolderId?: number
    ChildFolderId?: number
}
/** 文件夹级联组件节点属性 */
export interface FileProjectInfoProps extends ProjectDescription {
    children?: ProjectDescription[]
    isLeaf?: boolean
    loading?: boolean
}

export const NewProjectAndFolder: React.FC<NewProjectAndFolderProps> = memo((props) => {
    const {
        isNew = true,
        isFolder,
        isExport,
        isImport,
        project,
        parentNode,
        visible,
        setVisible,
        loading,
        setLoading,
        onModalSubmit
    } = props

    const {isExportTemporaryProjectFlag, setIsExportTemporaryProjectFlag} = useTemporaryProjectStore()

    const [data, setData, getData] = useGetState<FileProjectInfoProps[]>([])

    const fetchChildNode = useMemoizedFn((selectedOptions: FileProjectInfoProps[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]
        targetOption.loading = true

        ipcRenderer
            .invoke("GetProjects", {
                FolderId: +targetOption.Id,
                Type: "file",
                Pagination: {Page: 1, Limit: 1000, Order: "desc", OrderBy: "updated_at"}
            })
            .then((rsp: ProjectsResponse) => {
                try {
                    setTimeout(() => {
                        targetOption.children = [...rsp.Projects]
                        targetOption.loading = false
                        setData([...getData()])
                    }, 300)
                } catch (e) {
                    failed("处理项目数据失败: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`查询 Projects 失败：${e}`)
            })
    })

    const fetchFirstList = useMemoizedFn(() => {
        const param: ProjectParamsProp = {
            Type: "file",
            Pagination: {Page: 1, Limit: 1000, Order: "desc", OrderBy: "updated_at"}
        }

        ipcRenderer
            .invoke("GetProjects", param)
            .then((rsp: ProjectsResponse) => {
                try {
                    setData(
                        rsp.Projects.map((item) => {
                            const info: FileProjectInfoProps = {...item}
                            info.isLeaf = false
                            return info
                        })
                    )
                } catch (e) {
                    failed("处理项目数据失败: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`查询 Projects 失败：${e}`)
            })
    })

    const [info, setInfo] = useState<ProjectFolderInfoProps>({
        ProjectName: ""
    })
    const [exportInfo, setExportInfo] = useState<ExportProjectProps>({
        Id: 0,
        ProjectName: "",
        Password: ""
    })
    const [importInfo, setImportInfo] = useState<ImportProjectProps>({
        ProjectFilePath: ""
    })

    useEffect(() => {
        if (visible) {
            fetchFirstList()
        }
        if (visible && isNew && project) {
            if (!isCommunityEdition()) {
                try {
                    const firstDescribe = JSON.parse(project.Description)
                    if (Array.isArray(firstDescribe)) {
                        onReset({
                            Description: firstDescribe
                        })
                    } else {
                        onReset({
                            Description: [{Key: "系统", Value: ""}]
                        })
                    }
                } catch (error) {
                    onReset({
                        Description: [{Key: "系统", Value: ""}]
                    })
                }
            }
            setInfo({
                Id: +project.Id,
                oldName: project.ProjectName,
                ProjectName: project.ProjectName,
                Description: project.Description,
                FolderId: +project.FolderId,
                ChildFolderId: +project.ChildFolderId
            })
        }
        if (visible && isExport && project) {
            setExportInfo({
                Id: project.Id,
                ProjectName: project.ProjectName,
                Password: ""
            })
        }
        if (visible && isImport && parentNode) {
            if (parentNode.Id) {
                const data: ImportProjectProps = {ProjectFilePath: ""}
                // @ts-ignore
                if (+parentNode.FolderId === 0) {
                    data.FolderId = +parentNode.Id
                } else {
                    data.FolderId = +parentNode.FolderId
                    // @ts-ignore
                    if (+parentNode.ChildFolderId === 0) {
                        data.FolderId = +parentNode.Id
                    } else {
                        data.FolderId = +parentNode.ChildFolderId
                    }
                }
                setImportInfo({...data})
            }
        }
        if (!visible) {
            setIsCheck(false)
            setInfo({ProjectName: ""})
            setExportInfo({
                Id: 0,
                ProjectName: "",
                Password: ""
            })
            setImportInfo({
                ProjectFilePath: ""
            })
        }
    }, [visible, isNew, isExport, project])

    const cascaderValue = useMemo(() => {
        if (project) {
            const first = project.FolderName || ""
            const second = project.ChildFolderName || ""
            if (first && !second) return [first]
            if (first && second) return [first, second]
            return []
        }
        return []
    }, [project])

    const [isCheck, setIsCheck] = useState<boolean>(false)

    const headerTitle = useMemo(() => {
        if (isNew && isFolder && !project) return "新建文件夹"
        if (isNew && !isFolder && !project) return "新建项目"
        if (isNew && isFolder && project) return "编辑文件夹"
        if (isNew && !isFolder && project) return "编辑项目"
        if (isExport) return "导出项目"
        if (isImport) return "导入项目"
        return "未知情况"
    }, [isNew, isFolder, isExport, isImport, project])

    const submitTitle = useMemo(() => {
        if (isNew && !project) return "创建"
        if (isExport) return "导出"
        if (isImport) return "导入"
        return "确定"
    }, [isNew, isExport, isImport, project])

    const [transferShow, setTransferShow] = useState<{
        isExport?: boolean
        isImport?: boolean
        visible: boolean
        data?: ExportProjectProps | ImportProjectProps
    }>({
        visible: false
    })

    const validateArray = useMemoizedFn((arr) => {
        return arr.every((item) => item.Key.trim() !== "" && item.Value.trim() !== "")
    })

    const onSubmit = useMemoizedFn(() => {
        const v = form.getFieldsValue()
        const isHasDescription = Array.isArray(v?.Description) && v.Description.length > 0

        if (isHasDescription && !validateArray(v.Description) && !isCommunityEdition()) {
            warn("请将备注信息填写完整")
            return
        }
        if (!isCheck) setIsCheck(true)
        setLoading(true)
        if (isNew) {
            if (!info.ProjectName) {
                setTimeout(() => setLoading(false), 300)
                return
            }
            if (info.ProjectName.length > 100) {
                failed("名称长度应小于100!")
                setTimeout(() => setLoading(false), 300)
                return
            }
            const data = {...info}
            if (parentNode && !data.Id) {
                data.parent = {...parentNode}
                // @ts-ignore
                if (+parentNode.FolderId === 0) {
                    data.FolderId = +parentNode.Id
                } else {
                    data.FolderId = +parentNode.FolderId
                    // @ts-ignore
                    if (+parentNode.ChildFolderId === 0) {
                        data.FolderId = +parentNode.Id
                    } else {
                        data.FolderId = +parentNode.ChildFolderId
                    }
                }
            }
            const type = isFolder ? "isNewFolder" : "isNewProject"

            if (!isCommunityEdition()) {
                data.Description = isHasDescription ? JSON.stringify(v?.Description) : ""
            }

            onModalSubmit(type, {...data})
        }
        if (isExport) {
            if (!exportInfo.Id) {
                failed("未获取到数据ID，请关闭弹窗后重试!")
                setTimeout(() => setLoading(false), 300)
                return
            }
            if (!exportInfo.Password) {
                setTimeout(() => setLoading(false), 300)
                return
            }
            if (exportInfo.Password.length > 15) {
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
            if (!importInfo.ProjectFilePath) {
                setTimeout(() => setLoading(false), 300)
                return
            }

            const newProject: ProjectParamsProps = {
                ProjectName: "",
                Description: "",
                FolderId: importInfo.FolderId ? +importInfo.FolderId : 0,
                ChildFolderId: importInfo.ChildFolderId ? +importInfo.ChildFolderId : 0,
                Type: "project"
            }

            if (importInfo.LocalProjectName) {
                newProject.ProjectName = importInfo.LocalProjectName
                ipcRenderer
                    .invoke("IsProjectNameValid", newProject)
                    .then((e) => {
                        setTransferShow({
                            isImport: true,
                            visible: true,
                            data: {...importInfo, LocalProjectName: importInfo.LocalProjectName}
                        })
                    })
                    .catch((e) => {
                        failed("创建新项目失败，项目名校验不通过：" + `${e}`)
                        setTimeout(() => {
                            setLoading(false)
                        }, 300)
                    })
            } else {
                ipcRenderer
                    .invoke("fetch-path-file-name", importInfo.ProjectFilePath)
                    .then((fileName: string) => {
                        if (!fileName) {
                            failed(`解析路径内文件名为空`)
                            setTimeout(() => {
                                setLoading(false)
                            }, 300)
                            return
                        }

                        newProject.ProjectName = fileName
                        ipcRenderer
                            .invoke("IsProjectNameValid", newProject)
                            .then((e) => {
                                setTransferShow({
                                    isImport: true,
                                    visible: true,
                                    data: {...importInfo, LocalProjectName: fileName}
                                })
                            })
                            .catch((e) => {
                                failed("创建新项目失败，项目名校验不通过：" + `${e}`)
                                setTimeout(() => {
                                    setLoading(false)
                                }, 300)
                            })
                    })
                    .catch((e) => {
                        failed(`无法解析路径内的文件名 ${e}`)
                        setTimeout(() => {
                            setLoading(false)
                        }, 300)
                    })
            }
        }
    })

    // 处理导出临时项目问题
    const handleExportTemporaryProject = () => {
        if (isExportTemporaryProjectFlag) {
            setIsExportTemporaryProjectFlag(false)
            // 发送信号到ProjectManage去执行 getPageInfo(同时删除临时项目也是在这里操作的)
            // 由于 NewProjectAndFolder 该组件是在UILayout中使用
            emiter.emit("onGetProjectInfo")
        }
    }

    const onClose = useMemoizedFn(() => {
        form.resetFields()
        setVisible(false)
        handleExportTemporaryProject()
    })

    const [dropShow, setDropShow] = useState<boolean>(false)

    const [form] = Form.useForm()
    const describeRef = useRef<any>()
    const onReset = useMemoizedFn((restValue) => {
        setInfo({
            ...info,
            ...restValue
        })
        form.setFieldsValue({...restValue})
    })
    // 重置
    const handleReset = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: string,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        onReset({
            [field]: [{Key: "系统", Value: ""}]
        })
        ref.current.setVariableActiveKey(["0"])
    }

    // 添加
    const handleAdd = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        field: string,
        ref: React.MutableRefObject<any>
    ) => {
        e.stopPropagation()
        const v = form.getFieldsValue()
        const variables = v[field] || []
        const index = variables.findIndex((ele: {Key: string; Value: string}) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            onReset({
                [field]: [...variables, {Key: "", Value: ""}]
            })
            ref.current.setVariableActiveKey([...(ref.current.variableActiveKey || []), `${variables?.length || 0}`])
        } else {
            yakitFailed(`请将已添加【备注${index}】设置完成后再进行添加`)
        }
    }

    // 删除
    const handleRemove = (i: number, field: string) => {
        const v = form.getFieldsValue()
        const variables = v[field] || []
        variables.splice(i, 1)
        onReset({
            [field]: [...variables]
        })
    }

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
            bodyStyle={{padding: 0}}
        >
            <Form
                form={form}
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
                                className={classNames({
                                    [styles["required-form-item-wrapper"]]: isCheck && !info.ProjectName
                                })}
                                value={info.ProjectName}
                                onChange={(e) => setInfo({...info, ProjectName: e.target.value})}
                            />
                        </Form.Item>
                        {!isFolder && !parentNode && (
                            <Form.Item
                                label={
                                    !!project ? (
                                        <div className={styles["form-item-cascader"]}>
                                            <div>{`所属文件夹 :`}</div>
                                            {dropShow && (
                                                <div className={styles["hint-style"]}>{cascaderValue.join("/")}</div>
                                            )}
                                        </div>
                                    ) : (
                                        "所属文件夹 :"
                                    )
                                }
                            >
                                <Cascader
                                    defaultValue={cascaderValue}
                                    options={data}
                                    fieldNames={{label: "ProjectName", value: "Id", children: "children"}}
                                    changeOnSelect={true}
                                    loadData={(selectedOptions) => fetchChildNode(selectedOptions as any)}
                                    onChange={(value, selectedOptions) => {
                                        if (value) {
                                            setInfo({...info, FolderId: +value[0] || 0, ChildFolderId: +value[1] || 0})
                                        } else {
                                            setInfo({...info, FolderId: 0, ChildFolderId: 0})
                                        }
                                    }}
                                    dropdownClassName={styles["cascader-dropdown-body"]}
                                    open={dropShow}
                                    onDropdownVisibleChange={(open: boolean) => setDropShow(open)}
                                    suffixIcon={<ChevronDownIcon style={{color: "var(--yakit-body-text-color)"}} />}
                                />
                            </Form.Item>
                        )}
                        <>
                            {isCommunityEdition() ? (
                                <Form.Item label={"备注 :"}>
                                    <YakitInput.TextArea
                                        autoSize={{minRows: 3, maxRows: 5}}
                                        showCount
                                        maxLength={100}
                                        placeholder='请输入描述与备注'
                                        value={info.Description}
                                        onChange={(e) => setInfo({...info, Description: e.target.value})}
                                    />
                                </Form.Item>
                            ) : (
                                <>
                                    <div className={styles["remark-header"]}>
                                        <div className={styles["title"]}>备注 :</div>
                                        {/* 添加额外的元素 */}
                                        <span className={styles[""]}>
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                onClick={(e) => {
                                                    handleReset(e, "Description", describeRef)
                                                }}
                                                size='small'
                                            >
                                                重置
                                            </YakitButton>
                                            <Divider type='vertical' style={{margin: 0}} />
                                            <YakitButton
                                                type='text'
                                                onClick={(e) => {
                                                    handleAdd(e, "Description", describeRef)
                                                }}
                                                className={styles["btn-padding-right-0"]}
                                                size='small'
                                            >
                                                添加
                                                <PlusIcon />
                                            </YakitButton>
                                        </span>
                                    </div>
                                    <VariableProjectList
                                        ref={describeRef}
                                        field='Description'
                                        onDel={(i) => {
                                            handleRemove(i, "Description")
                                        }}
                                    />
                                </>
                            )}
                        </>
                    </>
                )}
                {isExport && (
                    <>
                        <Form.Item label={"项目名称 :"}>
                            <YakitInput disabled={true} size='large' value={exportInfo.ProjectName} />
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
                                className={classNames({
                                    [styles["required-form-item-wrapper"]]: isCheck && !exportInfo.Password
                                })}
                                placeholder='为项目设置打开密码'
                                value={exportInfo.Password}
                                onChange={(e) => setExportInfo({...exportInfo, Password: e.target.value})}
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
                                    点击此处
                                    <Upload
                                        multiple={false}
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(f: any) => {
                                            setImportInfo({...importInfo, ProjectFilePath: f?.path || ""})
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
                                className={classNames({
                                    [styles["required-form-item-wrapper"]]: isCheck && !importInfo.ProjectFilePath
                                })}
                                size='large'
                                placeholder='请输入绝对路径'
                                value={importInfo.ProjectFilePath}
                                onChange={(e) => setImportInfo({...importInfo, ProjectFilePath: e.target.value})}
                            />
                        </Form.Item>
                        <Form.Item
                            label={"项目名称 :"}
                            help={
                                <div className={styles["import-form-item-help-wrapper"]}>
                                    项目名如果为空，则使用项目文件中的名字
                                </div>
                            }
                        >
                            <YakitInput
                                size='large'
                                placeholder='请输入项目名'
                                value={importInfo.LocalProjectName}
                                onChange={(e) => setImportInfo({...importInfo, LocalProjectName: e.target.value})}
                            />
                        </Form.Item>
                        <Form.Item label={"密码 :"} className={styles["export-form-item-password-wrapper"]}>
                            <YakitInput.Password
                                placeholder='如无密码则不填'
                                value={importInfo.Password}
                                onChange={(e) => setImportInfo({...importInfo, Password: e.target.value})}
                            />
                        </Form.Item>
                        {!parentNode && (
                            <Form.Item label={"所属文件夹 :"}>
                                <Cascader
                                    options={data}
                                    fieldNames={{label: "ProjectName", value: "Id", children: "children"}}
                                    changeOnSelect={true}
                                    loadData={(selectedOptions) => fetchChildNode(selectedOptions as any)}
                                    onChange={(value, selectedOptions) => {
                                        if (value) {
                                            setImportInfo({
                                                ...importInfo,
                                                FolderId: +value[0] || 0,
                                                ChildFolderId: +value[1] || 0
                                            })
                                        } else {
                                            setImportInfo({...importInfo, FolderId: 0, ChildFolderId: 0})
                                        }
                                    }}
                                    dropdownClassName={styles["cascader-dropdown-body"]}
                                    suffixIcon={<ChevronDownIcon style={{color: "var(--yakit-body-text-color)"}} />}
                                />
                            </Form.Item>
                        )}
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
                usedBy='NewProjectAndFolder'
                {...transferShow}
                onSuccess={(type) => {
                    if (type === "isExport") {
                        handleExportTemporaryProject()
                    }
                    onModalSubmit(type, {} as any)
                    setTimeout(() => {
                        setTransferShow({visible: false})
                    }, 500)
                }}
                setVisible={(open: boolean) => {
                    setLoading(false)
                    setTransferShow({...transferShow, visible: open})
                }}
            />
        </YakitModal>
    )
})

interface TransferProjectProps {
    usedBy?: string
    isExport?: boolean
    isImport?: boolean
    data?: ExportProjectProps | ImportProjectProps
    visible: boolean
    setVisible: (open: boolean) => any
    onSuccess: (type: string) => any
}
export interface ProjectIOProgress {
    TargetPath: string
    Percent: number
    Verbose: string
}
export const TransferProject: React.FC<TransferProjectProps> = memo((props) => {
    const {usedBy, isExport, isImport, data, visible, setVisible, onSuccess} = props

    const {isExportTemporaryProjectFlag, setIsExportTemporaryProjectFlag} = useTemporaryProjectStore()

    const [token, setToken] = useState(randomString(40))
    const [percent, setPercent] = useState<number>(0.0)
    const [infos, setInfos] = useState<string[]>([])
    /** 导出功能时获取导出文件路径 */
    const pathRef = useRef<string>("")

    useEffect(() => {
        const infos: string[] = []
        if (!visible) {
            setToken(randomString(40))
            setPercent(0)
            setInfos([])
            pathRef.current = ""
            return
        }
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
                    Id: exportData.Id,
                    Password: exportData.Password || ""
                },
                token
            )
        }
        if (isImport) {
            const importData: ImportProjectProps = {...(data as any)}

            ipcRenderer.invoke(
                `ImportProject`,
                {
                    LocalProjectName: importData.LocalProjectName,
                    ProjectFilePath: importData.ProjectFilePath,
                    Password: importData?.Password || "",
                    FolderId: importData.FolderId || 0,
                    ChildFolderId: importData.ChildFolderId || 0
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
            const isError = infos.filter((item) => item.indexOf("error") > -1).length > 0
            if (!isError) {
                if (isImport) onSuccess("isImport")
                if (isExport) {
                    onSuccess("isExport")
                    if (pathRef.current) openABSFileLocated(pathRef.current)
                }
            }
        })

        const id = setInterval(() => {
            setInfos([...infos])
        }, 1000)

        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-ExportProject", token)
            ipcRenderer.invoke("cancel-ImportProject", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [visible])

    // 处理导出临时项目问题
    const handleExportTemporaryProject = () => {
        // 当是加密导出 点击组件TransferProject取消时不执行删除操作
        if (isExportTemporaryProjectFlag && usedBy !== "NewProjectAndFolder") {
            setIsExportTemporaryProjectFlag(false)
            // 发送信号到ProjectManage去执行 getPageInfo(同时删除临时项目也是在这里操作的)
            emiter.emit("onGetProjectInfo")
        }
    }
    const onClose = useMemoizedFn(() => {
        handleExportTemporaryProject()
        setVisible(false)
    })

    return (
        <div className={visible ? styles["transfer-project-mask"] : styles["transfer-project-hidden-mask"]}>
            <div className={styles["transfer-project-mask-body"]}>
                <div
                    className={classNames(
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
                                            className={classNames({
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

interface SetVariableProjectItemProps {
    name: number
}

const SetVariableProjectItem: React.FC<SetVariableProjectItemProps> = React.memo((props) => {
    const {name} = props

    return (
        <div className={styles["variable-project-item"]}>
            <Form.Item name={[name, "Key"]} noStyle wrapperCol={{span: 24}}>
                <input placeholder='备注名称' className={styles["variable-item-input"]} />
            </Form.Item>

            <div className={styles["variable-item-textarea-body"]}>
                <Form.Item name={[name, "Value"]} noStyle wrapperCol={{span: 24}}>
                    <AutoTextarea className={styles["variable-item-textarea"]} placeholder='备注内容' />
                </Form.Item>
                <ResizerIcon className={styles["resizer-icon"]} />
            </div>
        </div>
    )
})

interface VariableProjectListProps {
    field: string
    onDel?: (i: number) => any
    collapseWrapperClassName?: string
    extra?: (i: number, info: {key; name}) => React.ReactNode
    ref: React.Ref<any>
}

/**
 * 目前只有Project备注使用
 */
const VariableProjectList: React.FC<VariableProjectListProps> = React.forwardRef((props, ref) => {
    const {field, onDel, collapseWrapperClassName, extra} = props
    const [variableActiveKey, setVariableActiveKey] = useState<string[]>(["0"])

    useImperativeHandle(
        ref,
        () => ({
            variableActiveKey,
            setVariableActiveKey: onSetActiveKey
        }),
        [variableActiveKey]
    )

    const onSetActiveKey = useMemoizedFn((key: string[] | string) => {
        setVariableActiveKey(key as string[])
    })

    return (
        <div className={styles["variable-project-list"]}>
            <Form.List name={field}>
                {(fields, {add}) => {
                    return (
                        <>
                            <YakitCollapse
                                destroyInactivePanel={true}
                                defaultActiveKey={variableActiveKey}
                                activeKey={variableActiveKey}
                                onChange={onSetActiveKey}
                                className={classNames(styles["variable-list"], collapseWrapperClassName)}
                                bordered={false}
                            >
                                {fields.map(({key, name}, i) => (
                                    <YakitPanel
                                        key={`${key + ""}`}
                                        header={`备注 ${name}`}
                                        className={styles["variable-list-panel"]}
                                        extra={
                                            <div className={styles["extra-wrapper"]}>
                                                <TrashIcon
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (onDel) onDel(i)
                                                    }}
                                                    className={styles["variable-list-remove"]}
                                                />
                                                {extra ? extra(i, {key, name}) : null}
                                            </div>
                                        }
                                    >
                                        <SetVariableProjectItem name={name} />
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                            {fields?.length === 0 && (
                                <>
                                    <YakitButton
                                        type='outline2'
                                        onClick={() => {
                                            add({Key: "", Value: "", Type: "raw"})
                                            onSetActiveKey([
                                                ...(variableActiveKey || []),
                                                `${variableActiveKey?.length}`
                                            ])
                                        }}
                                        icon={<PlusIcon />}
                                        block
                                    >
                                        添加
                                    </YakitButton>
                                </>
                            )}
                        </>
                    )
                }}
            </Form.List>
        </div>
    )
})
