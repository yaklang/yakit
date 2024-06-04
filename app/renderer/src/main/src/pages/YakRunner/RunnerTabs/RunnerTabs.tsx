import React, {Fragment, memo} from "react"
import {
    RunnerTabBarItemProps,
    RunnerTabBarProps,
    RunnerTabPaneProps,
    RunnerTabsProps,
    YakRunnerWelcomePageProps
} from "./RunnerTabsType"
import {
    DragDropContext,
    Droppable,
    Draggable,
    DragUpdate,
    ResponderProvided,
    DragStart,
    BeforeCapture,
    DropResult
} from "@hello-pangea/dnd"

import classNames from "classnames"
import styles from "./RunnerTabs.module.scss"
import {KeyToIcon} from "../FileTree/icon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineImportIcon, OutlinePlusIcon, OutlineXIcon} from "@/assets/icon/outline"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {YakRunnerNewFileIcon, YakRunnerOpenFileIcon, YakRunnerOpenFolderIcon} from "../icon"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"

const {ipcRenderer} = window.require("electron")

const qqq = [
    {
        name: ".git",
        path: "/Users/nonight/work/yakitVersion/.git",
        isFolder: false,
        icon: "_file",
        isLeaf: false,
        code: "123"
    },
    {
        name: ".github",
        path: "/Users/nonight/work/yakitVersion/.github",
        isFolder: false,
        icon: "_file",
        isLeaf: false,
        code: "123"
    },
    {
        name: ".gitignore",
        path: "/Users/nonight/work/yakitVersion/.gitignore",
        isFolder: false,
        icon: "_file",
        isLeaf: true,
        code: "123"
    },
    {
        name: "ELECTRON_GUIDE.md",
        path: "/Users/nonight/work/yakitVersion/ELECTRON_GUIDE.md",
        isFolder: false,
        icon: "_file",
        isLeaf: true,
        code: "123"
    },
    {
        name: "LICENSE.md",
        path: "/Users/nonight/work/yakitVersion/LICENSE.md",
        isFolder: false,
        icon: "_file",
        isLeaf: true,
        code: "123"
    }
]

export const RunnerTabs: React.FC<RunnerTabsProps> = memo((props) => {
    const {} = props

    return (
        <div className={styles["runner-tabs"]}>
            <RunnerTabBar onlyID='11223' />

            <div className={styles["tabs-pane"]}>
                <RunnerTabPane />
            </div>
        </div>
    )
})

const RunnerTabBar: React.FC<RunnerTabBarProps> = memo((props) => {
    const {onlyID, extra} = props

    return (
        <DragDropContext
            onDragEnd={(result, provided) => {
                console.log(result, provided)
            }}
        >
            <div className={classNames(styles["runner-tab-bar"])}>
                <div className={styles["bar-wrapper"]}>
                    <Droppable droppableId={onlyID} direction='horizontal'>
                        {(provided) => {
                            return (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={classNames(styles["bar-container"])}
                                >
                                    {qqq.map((item, index) => {
                                        return (
                                            <Fragment key={item.path}>
                                                <RunnerTabBarItem index={index} info={item as any} />
                                            </Fragment>
                                        )
                                    })}
                                    {provided.placeholder}
                                </div>
                            )
                        }}
                    </Droppable>
                </div>
                {extra}
            </div>
        </DragDropContext>
    )
})

const RunnerTabBarItem: React.FC<RunnerTabBarItemProps> = memo((props) => {
    const {index, info} = props

    return (
        <Draggable key={info.path} draggableId={info.path} index={index}>
            {(provided, snapshot) => {
                const {isDragging} = snapshot

                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{...provided.draggableProps.style}}
                        className={classNames(styles["runner-tab-bar-item"], {
                            [styles["dragging"]]: isDragging,
                            [styles["selected"]]: index === 3
                        })}
                    >
                        <div className={styles["item-wrapper"]}>
                            <img src={KeyToIcon[info.icon].iconPath} />
                            <div className={styles["text-style"]}>{info.name}</div>
                            <YakitButton
                                className={styles["del-btn"]}
                                type='text2'
                                size='small'
                                icon={<OutlineXIcon />}
                            />
                        </div>
                    </div>
                )
            }}
        </Draggable>
    )
})

const RunnerTabPane: React.FC<RunnerTabPaneProps> = memo((props) => {
    return (
        <div className={styles["runner-tab-pane"]}>
            <YakRunnerWelcomePage />
            {/* <YakitEditor type={"yak"} value={"123"} setValue={() => {}} /> */}
        </div>
    )
})

const YakRunnerWelcomePage: React.FC<YakRunnerWelcomePageProps> = memo((props) => {
    return (
        <div className={styles["yak-runner-welcome-page"]}>
            <div className={styles["title"]}>
                <div className={styles["icon-style"]}>
                    <SolidYakCattleNoBackColorIcon />
                </div>
                <div className={styles["header-style"]}>欢迎使用 Yak 语言</div>
            </div>

            <div className={styles["operate"]}>
                <div className={styles["title-style"]}>快捷创建</div>
                <div className={styles["operate-btn-group"]}>
                    <div className={classNames(styles["btn-style"], styles["btn-new-file"])}>
                        <div className={styles["btn-title"]}>
                            <YakRunnerNewFileIcon />
                            新建文件
                        </div>
                        <OutlinePlusIcon className={styles["icon-style"]} />
                    </div>
                    <div className={classNames(styles["btn-style"], styles["btn-open-file"])}>
                        <div className={styles["btn-title"]}>
                            <YakRunnerOpenFileIcon />
                            打开文件
                        </div>
                        <OutlineImportIcon className={styles["icon-style"]} />
                    </div>
                    <div className={classNames(styles["btn-style"], styles["btn-open-folder"])}>
                        <div className={styles["btn-title"]}>
                            <YakRunnerOpenFolderIcon />
                            打开文件夹
                        </div>
                        <OutlineImportIcon className={styles["icon-style"]} />
                    </div>
                </div>
            </div>

            <div className={styles["recent-open"]}>
                <div className={styles["title-style"]}>最近打开</div>
                <div className={styles["recent-list"]}>
                    {[
                        {
                            name: ".git",
                            path: "/Users/nonight/work/yakitVersion/.git",
                            isFolder: false,
                            icon: "_file",
                            isLeaf: false,
                            code: "123"
                        },
                        {
                            name: ".github",
                            path: "/Users/nonight/work/yakitVersion/.github",
                            isFolder: false,
                            icon: "_file",
                            isLeaf: false,
                            code: "123"
                        },
                        {
                            name: ".gitignore",
                            path: "/Users/nonight/work/yakitVersion/.gitignore",
                            isFolder: false,
                            icon: "_file",
                            isLeaf: true,
                            code: "123"
                        }
                    ].map((item, index) => {
                        return (
                            <div key={item.path} className={styles["list-opt"]}>
                                <div className={styles["file-name"]}>{item.name}</div>
                                <div className={styles["file-path"]}>{item.path}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
})
