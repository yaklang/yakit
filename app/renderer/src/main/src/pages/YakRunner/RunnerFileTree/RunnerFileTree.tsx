import React, {memo, useEffect, useMemo} from "react"
import {useMemoizedFn} from "ahooks"
import {OpenedFileProps, RunnerFileTreeProps} from "./RunnerFileTreeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePluscircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {CollapseList} from "../CollapseList/CollapseList"
import {FileNodeProps} from "../FileTree/FileTreeType"
import {KeyToIcon} from "../FileTree/icon"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import {FileTree} from "../FileTree/FileTree"

import classNames from "classnames"
import styles from "./RunnerFileTree.module.scss"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {FileDetailInfo} from "../RunnerTabs/RunnerTabsType"
import {getDefaultActiveFile, removeAreaFileInfo, setAreaFileActive, updateAreaFileInfo} from "../utils"

const {ipcRenderer} = window.require("electron")

export const RunnerFileTree: React.FC<RunnerFileTreeProps> = (props) => {
    const {fileTree} = useStore()
    const {handleFileLoadData} = useDispatcher()

    const onLoadData = useMemoizedFn((node: FileNodeProps) => {
        if (handleFileLoadData) return handleFileLoadData(node)
        return Promise.reject()
    })

    useEffect(() => {
        console.log("我是runner-file-tree")
    }, [])

    const menuData: YakitMenuItemType[] = useMemo(() => {
        return [
            {
                key: "createFile",
                label: "新建文件"
            },
            {
                key: "createFolder",
                label: "新建文件夹"
            },
            {
                type: "divider"
            },
            {
                key: "openFile",
                label: "打开文件"
            },
            {
                key: "openFolder",
                label: "打开文件夹"
            },
            {
                key: "history",
                label: "最近打开",
                children: [
                    {
                        key: "6",
                        label: "xxx"
                    }
                ]
            }
        ]
    }, [])

    const menuSelect = useMemoizedFn((key) => {
        switch (key) {
            case "createFile":
                break
            case "createFolder":
                break
            case "openFile":
                break
            case "openFolder":
                break
            default:
                break
        }
    })

    return (
        <div className={styles["runner-file-tree"]}>
            <div className={styles["container"]}>
                <OpenedFile />

                <div className={styles["file-tree"]}>
                    <div className={styles["file-tree-container"]}>
                        <div className={styles["file-tree-header"]}>
                            <div className={styles["title-style"]}>文件列表</div>
                            <YakitDropdownMenu
                                menu={{
                                    data: menuData,
                                    onClick: ({key}) => menuSelect(key)
                                }}
                                dropdown={{
                                    trigger: ["click"],
                                    placement: "bottomLeft"
                                }}
                            >
                                <YakitButton type='text2' icon={<OutlinePluscircleIcon />} />
                            </YakitDropdownMenu>
                        </div>

                        <div className={styles["file-tree-tree"]}>
                            <div className={styles["tree-body"]}>
                                <FileTree data={fileTree} onLoadData={onLoadData} />
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

    const openItem = useMemoizedFn(async(data: FileDetailInfo) => {
        // 注入语法检测 由于点击项必为激活项默认给true
        const newActiveFile = {...await getDefaultActiveFile(data),isActive:true}
        // 更改当前tabs active
        const activeAreaInfo = setAreaFileActive(areaInfo, data)
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
                        <div key={item.path} className={styles["file-item"]} onClick={() => openItem(item)}>
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
            const nameA = a.name.toUpperCase() // 不区分大小写
            const nameB = b.name.toUpperCase() // 不区分大小写

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
                    />
                </div>
            ) : (
                <></>
            )}
        </>
    )
})
