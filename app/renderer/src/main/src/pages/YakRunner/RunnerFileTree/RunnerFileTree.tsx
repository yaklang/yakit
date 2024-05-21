import React, {memo, useEffect} from "react"
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
    return (
        <div className={styles["runner-file-tree"]}>
            <div className={styles["container"]}>
                <div className={styles["open-file"]}>
                    <OpenedFile />
                </div>

                <div className={styles["file-tree"]}>
                    <div className={styles["file-tree-container"]}>
                        <div className={styles["file-tree-header"]}>
                            <div className={styles["title-style"]}>文件列表</div>
                            <YakitButton type='text2' icon={<OutlinePluscircleIcon />} />
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

    const titleRender = () => {
        return <div className={styles["opened-file-header"]}>打开的编辑器</div>
    }

    const renderItem = (info: FileNodeProps[]) => {
        return (
            <div className={styles["opened-file-body"]}>
                {info.map((item) => {
                    return (
                        <div key={item.path} className={styles["file-item"]}>
                            <div className={styles["del-btn"]}>
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

    return (
        <CollapseList
            onlyKey='key'
            list={[
                [
                    {
                        name: ".gitignore",
                        path: "/Users/nonight/work/yakitVersion/1",
                        isFolder: false,
                        icon: "_file",
                        isLeaf: true
                    },
                    {
                        name: "ELECTRON_GrwherhreherherheerherhrwgwUIDE.md",
                        path: "/Users/nonight/work/yakitVersion/2",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "LICENSE.md",
                        path: "/Users/nonight/work/yakitVersion/3",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "README-EN.md",
                        path: "/Users/nonight/work/yakitVersion/4",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "README.md",
                        path: "/Users/nonight/work/yakitVersion/5",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "README_LEGACY.md",
                        path: "/Users/nonight/work/yakitVersion/6",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: ".gitignore",
                        path: "/Users/nonight/work/yakitVersion/7",
                        isFolder: false,
                        icon: "_file",
                        isLeaf: true
                    },
                    {
                        name: "ELECTRON_GUIDE.md",
                        path: "/Users/nonight/work/yakitVersion/8",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "LICENSE.md",
                        path: "/Users/nonight/work/yakitVersion/9",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "README-EN.md",
                        path: "/Users/nonight/work/yakitVersion/10",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "README.md",
                        path: "/Users/nonight/work/yakitVersion/11",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    },
                    {
                        name: "README_LEGACY.md",
                        path: "/Users/nonight/work/yakitVersion/12",
                        isFolder: false,
                        icon: "_f_markdown",
                        isLeaf: true
                    }
                ]
            ]}
            titleRender={titleRender}
            renderItem={renderItem}
        />
    )
})
