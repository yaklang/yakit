import React, {Fragment, memo, useEffect, useState} from "react"
import {
    FileDetailInfo,
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
import { useMemoizedFn } from "ahooks"
import useStore from "../hooks/useStore"
import useDispatcher from "../hooks/useDispatcher"
import { TabFileProps } from "../YakRunnerType"
import { IMonacoEditor } from "@/utils/editors"

const {ipcRenderer} = window.require("electron")

const layoutToString = (v:number[]) => {
    return JSON.stringify(v)
}

export const RunnerTabs: React.FC<RunnerTabsProps> = memo((props) => {
    const {layout} = props
    const {tabsFile} = useStore()
    const [tabsList,setTabsList] = useState<FileDetailInfo[]>([])
    useEffect(()=>{
        const showTabs = tabsFile.filter((item)=>layoutToString(item.layout)===layoutToString(layout))
        if(showTabs.length>0){
            setTabsList(showTabs[0].files)
        }
    },[tabsFile])
    return (
        <div className={styles["runner-tabs"]}>
            <RunnerTabBar onlyID={layoutToString(layout)} tabsList={tabsList}/>

            <div className={styles["tabs-pane"]}>
                <RunnerTabPane layout={layout}/>
            </div>
        </div>
    )
})

const RunnerTabBar: React.FC<RunnerTabBarProps> = memo((props) => {
    const {onlyID, tabsList,extra} = props
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
                                    {tabsList.map((item, index) => {
                                        return (
                                            <Fragment key={item.path}>
                                                <RunnerTabBarItem index={index} info={item} layoutStr={onlyID}/>
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
    const {index, info,layoutStr} = props
    const {tabsFile} = useStore()
    const {setTabsFile} = useDispatcher()
    const setActiveFile = useMemoizedFn(()=>{
        const newTabsFile: TabFileProps[] = JSON.parse(JSON.stringify(tabsFile))
        const showTabs = newTabsFile.map((item)=>{
            if(layoutToString(item.layout)===layoutStr){
                return {
                    ...item,
                    files:item.files.map((item,idx)=>{
                        return {...item,isActive:idx === index}
                    })
                }
            }
            return item
        })
        setTabsFile&&setTabsFile(showTabs)
    })

    const closeTabItem = useMemoizedFn((e) => {
        e.stopPropagation()
    })

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
                            [styles["selected"]]: info.isActive
                        })}
                    >
                        <div className={styles["item-wrapper"]} onClick={setActiveFile}>
                            <img src={KeyToIcon[info.icon].iconPath} />
                            <div className={styles["text-style"]}>{info.name}</div>
                            <YakitButton
                                className={styles["del-btn"]}
                                type='text2'
                                size='small'
                                icon={<OutlineXIcon />}
                                onClick={closeTabItem}
                            />
                        </div>
                    </div>
                )
            }}
        </Draggable>
    )
})

const RunnerTabPane: React.FC<RunnerTabPaneProps> = memo((props) => {
    const {layout} = props
    const {tabsFile} = useStore()
    const [editorInfo,setEditorInfo] = useState<FileDetailInfo>()
    // 编辑器实例
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    useEffect(()=>{
        const showTabs = tabsFile.filter((item)=>layoutToString(item.layout)===layoutToString(layout))
        if(showTabs.length>0){
            showTabs[0].files.forEach((item)=>{
                if(item.isActive){
                    setEditorInfo(item)
                }
            })
        }
    },[tabsFile])

    useEffect(() => {
        if (!reqEditor) {
            return
        }

        // 监听光标点击位置
        reqEditor.onDidChangeCursorPosition((e) => {
            console.log("e", e)
            const { position } = e;
            // console.log('当前光标位置：', position);
        })
        
        // 监听光标选中位置
        reqEditor.onDidChangeCursorSelection((e) => {
            const selection = e.selection;
            const {startLineNumber,startColumn,endLineNumber,endColumn} = selection
            // console.log("onDidChangeCursorSelection", startLineNumber,startColumn,endLineNumber,endColumn)
        })

    }, [reqEditor])

    return (
        <div className={styles["runner-tab-pane"]}>
            {/* <YakRunnerWelcomePage /> */}
            <YakitEditor 
                editorDidMount={(editor) => {
                    setReqEditor(editor)
                }} 
            type={editorInfo?.language||"yak"} value={editorInfo?.code||""} setValue={() => {}} />
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
