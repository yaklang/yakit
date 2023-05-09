import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {useMemoizedFn, useSelections} from "ahooks"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {Divider, Form, List, Tag} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed} from "@/utils/notification"
import {formatTimestamp} from "@/utils/timeUtil"
import {showByContextMenu} from "@/components/functionTemplate/showByContext"
import {showByCursorMenu} from "@/utils/showByCursor"
import {openABSFileLocated} from "@/utils/openWebsite"
import {callCopyToClipboard} from "@/utils/basic"
import styles from "./ScreenRecorder.module.scss"
import {
    ChevronDownIcon,
    ClockIcon,
    CloudPluginIcon,
    CloudUploadIcon,
    InformationCircleIcon,
    PencilAltIcon,
    PlayIcon,
    RefreshIcon,
    RemoveIcon,
    StopIcon,
    TrashIcon
} from "@/assets/newIcon"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {FramerateData} from "./ScrecorderModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import classNames from "classnames"
import {UploadIcon} from "@/assets/icons"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {isEnterpriseEdition} from "@/utils/envfile"
import {useScreenRecorder} from "@/store/screenRecorder"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ReactPlayerVideo} from "./ReactPlayerVideo/ReactPlayerVideo"

export interface ScreenRecorderListProp {
    refreshTrigger?: boolean
}

const {ipcRenderer} = window.require("electron")

export interface ScreenRecorder {
    Id: string
    Filename: string
    NoteInfo: string
    Project: string
    CreatedAt: number
    UpdatedAt: number
}
const batchMenuDataEnterprise: YakitMenuItemProps[] = [
    {
        key: "upload",
        label: "上传"
    },
    {
        key: "remove",
        label: "删除"
    }
]
export const ScreenRecorderList: React.FC<ScreenRecorderListProp> = (props) => {
    const [params, setParams] = useState({})
    const [pagination, setPagination] = useState(genDefaultPagination(20))
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ScreenRecorder[]>([])
    const [total, setTotal] = useState(0)

    const [keyword, setKeyword] = useState<string>("")
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)

    const {selected, allSelected, isSelected, toggle, toggleAll, partiallySelected} = useSelections(data)

    const {screenRecorderInfo, setRecording} = useScreenRecorder()

    const update = useMemoizedFn((page?: number, limit?: number, reload?: boolean) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit
            // Limit: 5
        }

        if (reload) {
            setLoading(true)
        }
        ipcRenderer
            .invoke("QueryScreenRecorders", {
                ...params,
                Pagination: paginationProps
            })
            .then((item: QueryGeneralResponse<any>) => {
                const newData = Number(item.Pagination.Page) === 1 ? item.Data : data.concat(item.Data)
                const isMore = item.Data.length < item.Pagination.Limit || newData.length === total
                setHasMore(!isMore)
                if (Number(item.Pagination.Page) === 1) {
                    setIsRef(!isRef)
                }
                setData(newData)

                setPagination(item.Pagination || genDefaultPagination(200))
                setTotal(item.Total)
            })
            .catch((e) => {
                failed(`${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        onRefresh()
    }, [props.refreshTrigger])
    /**@description 列表加载更多 */
    const loadMoreData = useMemoizedFn(() => {
        update(parseInt(`${pagination.Page}`) + 1, 20)
    })
    /** @description 批量操作的菜单操作 */
    const onMenuSelect = useMemoizedFn((key: string) => {})
    const onRefresh = useMemoizedFn(() => {
        update(1, undefined, true)
    })

    return (
        <div className={styles["screen-recorder"]}>
            <div className={styles["screen-recorder-heard"]}>
                <div className={styles["heard-title"]}>
                    <span className={styles["heard-title-text"]}>录屏管理</span>
                    <span className={styles["heard-subTitle-text"]}>
                        本录屏在 Windows 下，会同时录制所有屏幕，合并在一个文件中；在 MacOS 下多屏会生成多个文件
                    </span>
                </div>
                <div className={styles["heard-extra"]}>
                    <Form
                        layout='inline'
                        size='small'
                        initialValues={{
                            DisableMouse: false, // 鼠标捕捉
                            Framerate: "7" // 帧率
                        }}
                        onFinish={(v) => {
                            const newValue = {
                                ...v
                            }
                            if (screenRecorderInfo.isRecording) {
                                ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
                            } else {
                                ipcRenderer.invoke("StartScrecorder", newValue, screenRecorderInfo.token).then(() => {
                                    setRecording(true)
                                })
                            }
                        }}
                    >
                        <Form.Item
                            label='帧率'
                            tooltip={{
                                title: "帧率即每秒截屏次数",
                                icon: <InformationCircleIcon style={{cursor: "auto"}} />
                            }}
                            name='Framerate'
                        >
                            <YakitSelect options={FramerateData} style={{width: 120}} size='small' />
                        </Form.Item>
                        <Form.Item label='鼠标捕捉' valuePropName='checked' name='DisableMouse'>
                            <YakitSwitch />
                        </Form.Item>
                        <Divider type='vertical' style={{margin: 0, height: 16, marginRight: 16, top: 4}} />
                        {screenRecorderInfo.isRecording ? (
                            <YakitButton
                                onClick={() => {
                                    ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
                                }}
                                type='primary'
                                className='button-primary-danger'
                            >
                                <StopIcon className={styles["stop-icon"]} />
                                停止录屏
                            </YakitButton>
                        ) : (
                            <YakitButton htmlType='submit' type='primary'>
                                <PlayIcon style={{height: 16}} />
                                开始录屏
                            </YakitButton>
                        )}
                    </Form>
                    <RefreshIcon className={styles["refresh-icon"]} onClick={() => onRefresh()} />
                </div>
            </div>
            <div className={styles["screen-recorder-content"]}>
                <YakitSpin spinning={loading}>
                    <div className={styles["content-heard"]}>
                        <div className={styles["content-heard-title"]}>
                            <YakitCheckbox checked={allSelected} onChange={toggleAll} indeterminate={partiallySelected}>
                                全选
                            </YakitCheckbox>
                            <div className={styles["title-text"]} style={{marginLeft: 8}}>
                                Total<span className={styles["title-number"]}>{total}</span>
                            </div>
                            <Divider type='vertical' style={{top: 2}} />
                            <div className={styles["title-text"]}>
                                Selected<span className={styles["title-number"]}>{selected.length}</span>
                            </div>
                        </div>
                        <div className={styles["content-heard-extra"]}>
                            <YakitInput.Search placeholder='请输入关键词搜索' />
                            <YakitPopover
                                placement={"bottom"}
                                arrowPointAtCenter={true}
                                content={
                                    <YakitMenu
                                        type='secondary'
                                        data={batchMenuDataEnterprise}
                                        selectedKeys={[]}
                                        width={92}
                                        onSelect={({key}) => onMenuSelect(key)}
                                    />
                                }
                                trigger='hover'
                                overlayClassName={classNames(styles["popover-remove"])}
                            >
                                <YakitButton
                                    type='outline2'
                                    disabled={selected.length === 0}
                                    className={classNames(styles["button-batch-remove"])}
                                >
                                    批量操作
                                    <ChevronDownIcon />
                                </YakitButton>
                            </YakitPopover>
                            <YakitButton
                                type='outline2'
                                onClick={() => {}}
                                disabled={selected.length === 0}
                                className={classNames("button-outline2-danger")}
                            >
                                清空
                            </YakitButton>
                        </div>
                    </div>
                    <div className={styles["screen-recorder-list"]}>
                        <RollingLoadList<ScreenRecorder>
                            isRef={isRef}
                            data={data}
                            page={pagination.Page}
                            hasMore={hasMore}
                            loading={loading}
                            loadMoreData={loadMoreData}
                            defItemHeight={96}
                            classNameRow={styles["list-item"]}
                            renderRow={(item: ScreenRecorder, index) => {
                                return (
                                    <ScreenRecorderListItem
                                        key={item.Id}
                                        item={item}
                                        isSelected={isSelected(item)}
                                        onSelect={toggle}
                                    />
                                )
                            }}
                        />
                    </div>
                </YakitSpin>
            </div>
        </div>
        // <AutoCard
        //     title={"当前项目录屏列表"}
        //     size={"small"}
        //     bordered={false}
        //     extra={
        //         <div>
        //             <YakitButton type={"outline2"} onClick={() => update(1)}>
        //                 刷新
        //             </YakitButton>
        //         </div>
        //     }
        // >
        //     <List<ScreenRecorder>
        //         dataSource={data}
        //         pagination={false}
        //         loading={loading}
        //         renderItem={(item) => {
        //             return (
        //                 <List.Item key={item.Id}>
        //                     <AutoCard
        //                         extra={
        //                             <div>
        //                                 <Tag>创建时间：{formatTimestamp(item.CreatedAt)}</Tag>
        //                             </div>
        //                         }
        //                         size={"small"}
        //                         title={
        //                             <div>
        //                                 项目：<Tag color={"orange"}>{item.Project}</Tag>
        //                                 录屏编号：<Tag>{item.Id}</Tag>
        //                             </div>
        //                         }
        //                         onClick={(e) => {}}
        //                     >
        //                         <ReactPlayer
        //                             url={`atom://${item.Filename}`}
        //                             height={150}
        //                             width={300}
        //                             playing={true}
        //                             controls={true}
        //                         />
        //                         <YakitButton
        //                             onClick={(e) => {
        //                                 showByCursorMenu(
        //                                     {
        //                                         content: [
        //                                             {
        //                                                 title: "打开文件位置",
        //                                                 onClick: () => {
        //                                                     openABSFileLocated(item.Filename)
        //                                                 }
        //                                             },
        //                                             {
        //                                                 title: "复制文件名",
        //                                                 onClick: () => {
        //                                                     callCopyToClipboard(item.Filename)
        //                                                 }
        //                                             }
        //                                         ]
        //                                     },
        //                                     e.clientX,
        //                                     e.clientY
        //                                 )
        //                             }}
        //                             type={"outline2"}
        //                         >
        //                             文件位置：{item.Filename}
        //                         </YakitButton>
        //                     </AutoCard>
        //                 </List.Item>
        //             )
        //         }}
        //     />
        // </AutoCard>
    )
}

interface ScreenRecorderListItemProps {
    item: ScreenRecorder
    isSelected: boolean
    onSelect: (s: ScreenRecorder) => void
}
const ScreenRecorderListItem: React.FC<ScreenRecorderListItemProps> = React.memo((props) => {
    const {item, isSelected, onSelect} = props
    const [urlVideo, setUrlVideo] = useState<string>("")
    const [form] = Form.useForm()
    useEffect(() => {
        setUrlVideo(`atom://${item.Filename}`)
    }, [item.Filename])
    const onPlayVideo = useMemoizedFn(() => {
        ipcRenderer
            .invoke("is-file-exists", item.Filename)
            .then((flag: boolean) => {
                if (flag) {
                    const m = showYakitModal({
                        title: null,
                        footer: <></>,
                        width: 922,
                        closeIcon: <></>,
                        centered: true,
                        content: (
                            <ReactPlayerVideo
                                url={urlVideo}
                                title={item.Filename}
                                onPreClick={() => onPreVideo(item)}
                                onNextClick={() => onNextVideo(item)}
                            />
                        )
                    })
                } else {
                    failed("目标文件已不存在!")
                }
            })
            .catch(() => {})
    })
    /** @description 播放上一个视频 */
    const onPreVideo = useMemoizedFn((item: ScreenRecorder) => {
        console.log("onPreVideo", item)
    })
    /** @description 播放下一个视频 */
    const onNextVideo = useMemoizedFn((item: ScreenRecorder) => {
        console.log("onNextVideo", item)
    })
    const onEdit = useMemoizedFn(() => {
        showYakitModal({
            title: "编辑视频信息",
            type: "white",
            width: 720,
            onOkText: "保存",
            onOk: () => {
                form.validateFields()
                    .then((val) => {
                        console.log("edit", val)
                    })
                    .catch(() => {})
            },
            content: (
                <Form
                    form={form}
                    initialValues={{
                        Filename: item.Filename,
                        NoteInfo: item.NoteInfo
                    }}
                    layout='vertical'
                    style={{padding: 24}}
                >
                    <Form.Item name='Filename' label='视频名称' rules={[{required: true, message: "该项为必填"}]}>
                        <YakitInput />
                    </Form.Item>
                    <Form.Item name='NoteInfo' label='备注'>
                        <YakitInput.TextArea rows={6} />
                    </Form.Item>
                </Form>
            )
        })
    })
    return (
        <>
            <YakitCheckbox checked={isSelected} onClick={() => onSelect(item)} />
            <div className={styles["list-item-cover"]} onClick={() => onPlayVideo()}>
                <img alt='' src='atom://C:\Users\14257\yakit-projects\projects\records\123.jpg' />
                <div className={styles["list-item-cover-hover"]}>
                    <PlayIcon />
                </div>
            </div>

            {/* <ReactPlayer url={`atom://${item.Filename}`} height={72} width={128} /> */}
            <div className={styles["list-item-info"]}>
                <div className={styles["list-item-name"]} onClick={() => onPlayVideo()}>
                    {item.Filename}
                </div>
                <div className={styles["list-item-notes"]}>
                    {item.Id === "13"
                        ? "这里是备注信息"
                        : "这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信息，这里是备注信息这里是备注信备注信息信息虚拟"}
                </div>
                <div className={styles["list-item-extra"]}>
                    <div className={styles["list-item-duration"]}>
                        <ClockIcon style={{marginRight: 4}} /> 28:56s
                    </div>
                    <div>{formatTimestamp(item.CreatedAt)}</div>
                    <div className={styles["list-item-filename"]} onClick={() => openABSFileLocated(item.Filename)}>
                        {item.Filename} <CopyComponents copyText={item.Filename} />
                    </div>
                </div>
            </div>
            <div className={styles["list-item-operate"]}>
                <PencilAltIcon onClick={() => onEdit()} />
                {/* {isEnterpriseEdition() && <CloudUploadIcon />} */}
                <CloudUploadIcon />
                <TrashIcon className={styles["icon-trash"]} />
            </div>
        </>
    )
})
