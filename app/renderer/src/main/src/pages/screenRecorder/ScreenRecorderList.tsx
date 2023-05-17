import React, {useEffect, useState} from "react"
import {useCreation, useMemoizedFn, useSelections, useUpdateEffect} from "ahooks"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {Divider, Form} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, yakitFailed, yakitNotify} from "@/utils/notification"
import {formatTimestamp} from "@/utils/timeUtil"
import {openABSFileLocated} from "@/utils/openWebsite"
import styles from "./ScreenRecorder.module.scss"
import {
    ChevronDownIcon,
    ClockIcon,
    CloudUploadIcon,
    InformationCircleIcon,
    PencilAltIcon,
    PlayIcon,
    RefreshIcon,
    StopIcon,
    TrashIcon
} from "@/assets/newIcon"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {FramerateData, ScrecorderModal} from "./ScrecorderModal"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import classNames from "classnames"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {isEnterpriseEdition} from "@/utils/envfile"
import {useScreenRecorder} from "@/store/screenRecorder"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {ReactPlayerVideo} from "./ReactPlayerVideo/ReactPlayerVideo"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {useStore} from "@/store"
import noPictures from "@/assets/noPictures.png"
import {LoadingOutlined} from "@ant-design/icons"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"

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
    VideoName: string
    Cover: string
    Duration: string
    Before?: boolean
    After?: boolean
}
interface UploadScreenRecorderRequest {
    Token: string
    Keywords?: string
    Ids?: string[]
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
interface QueryScreenRecordersProps {
    Keywords: string
}
export const ScreenRecorderList: React.FC<ScreenRecorderListProp> = (props) => {
    const [params, setParams] = useState<QueryScreenRecordersProps>({
        Keywords: ""
    })
    const [pagination, setPagination] = useState(genDefaultPagination(20))
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ScreenRecorder[]>([])
    const [total, setTotal] = useState<number>(0)

    const [hasMore, setHasMore] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [recalculation, setRecalculation] = useState<boolean>(false)
    const [isShowScreenRecording, setIsShowScreenRecording] = useState<boolean>(false)

    const [delShow, setDelShow] = useState<boolean>(false)

    const selectedId = useCreation(() => {
        return data.map((i) => i.Id)
    }, [data])
    const {
        selected,
        allSelected,
        isSelected,
        select,
        unSelect,
        selectAll,
        unSelectAll,
        setSelected,
        partiallySelected
    } = useSelections(selectedId)

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
                if (allSelected) setSelected(newData)
                setData(newData)
                setPagination(item.Pagination || genDefaultPagination(200))
                setTotal(item.Total)
            })
            .catch((e) => {
                yakitNotify("error", "获取列表数据失败：" + e)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        onShowScreenRecording()
    }, [])

    useEffect(() => {
        onRefresh()
    }, [props.refreshTrigger])
    useUpdateEffect(() => {
        if (!screenRecorderInfo.isRecording) {
            setTimeout(() => {
                onRefresh()
            }, 1000)
        }
    }, [screenRecorderInfo.isRecording])
    const onShowScreenRecording = useMemoizedFn(() => {
        ipcRenderer
            .invoke("QueryScreenRecorders", {
                Pagination: {
                    Page: 1,
                    Limit: 1
                }
            })
            .then((item: QueryGeneralResponse<any>) => {
                setIsShowScreenRecording(!(item.Total > 0))
            })
            .catch((e) => {
                yakitNotify("error", "获取列表数据失败：" + e)
            })
    })
    /**@description 列表加载更多 */
    const loadMoreData = useMemoizedFn(() => {
        update(parseInt(`${pagination.Page}`) + 1, 20)
    })
    /** @description 批量操作的菜单操作 */
    const onMenuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "remove":
                setDelShow(true)
                break
            case "upload":
                onBatchUpload()
                break
            default:
                break
        }
    })
    // 全局监听登录状态
    const {userInfo} = useStore()
    const onBatchUpload = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            yakitNotify("warning", "请先登录，登录后方可使用")
        }
        let paramsUpload: UploadScreenRecorderRequest = {
            Token: userInfo.token
        }
        if (allSelected) {
            paramsUpload = {
                ...paramsUpload,
                ...params
            }
        } else {
            paramsUpload = {
                ...paramsUpload,
                // Ids: selected.map((i) => i.Id)
                Ids: selected
            }
        }
        console.log("paramsUpload", paramsUpload)
        ipcRenderer
            .invoke("UploadScreenRecorders", paramsUpload)
            .then(() => {
                yakitNotify("success", "上传成功")
                onSearch()
                setSelected([])
            })
            .catch((err) => {
                yakitNotify("error", "上传失败：" + err)
            })
    })
    const onBatchRemove = useMemoizedFn(() => {
        let paramsRemove = {}
        if (allSelected) {
            paramsRemove = {
                ...params
            }
        } else {
            paramsRemove = {
                // Ids: selected.map((i) => i.Id)
                Ids: selected
            }
        }
        ipcRenderer
            .invoke("DeleteScreenRecorders", paramsRemove)
            .then((e) => {
                yakitNotify("success", "删除成功")
                onSearch()
                setSelected([])
                setDelShow(false)
            })
            .catch((err) => {
                yakitNotify("error", "删除失败：" + err)
            })
    })
    const onRefresh = useMemoizedFn(() => {
        setParams({
            Keywords: ""
        })
        setSelected([])
        setTimeout(() => {
            update(1, undefined, true)
        }, 100)
    })
    const onSearch = useMemoizedFn(() => {
        setSelected([])
        update(1, undefined, true)
    })
    /** @description 清空录屏数据 */
    const onClear = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteScreenRecorders", {})
            .then((e) => {
                yakitNotify("success", "清空成功")
                onRefresh()
            })
            .catch((err) => {
                yakitNotify("error", "清空失败：" + err)
            })
    })
    const onUpdateScreenList = useMemoizedFn((updateItem: ScreenRecorder) => {
        const index = data.findIndex((l) => l.Id === updateItem.Id)
        if (index === -1) return
        data[index] = updateItem
        setData(data)
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
    })
    const onRemoveScreenItem = useMemoizedFn((removeItem: ScreenRecorder) => {
        const index = data.findIndex((l) => l.Id === removeItem.Id)
        if (index === -1) return
        data.splice(index, 1)
        setData(data)
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
    })
    return isShowScreenRecording ? (
        <div className={styles["screen-recorder-empty"]}>
            <div className={styles["empty-title"]}>录屏管理</div>
            <ScrecorderModal
                disabled={screenRecorderInfo.isRecording}
                onClose={() => {}}
                token={screenRecorderInfo.token}
                onStartCallback={() => {
                    setRecording(true)
                }}
                formStyle={{padding: "24px 0 "}}
                footer={
                    <div className={styles["empty-footer"]}>
                        {screenRecorderInfo.isRecording ? (
                            <YakitButton
                                onClick={() => {
                                    ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
                                    setTimeout(() => {
                                        onRefresh()
                                    }, 1000)
                                }}
                                type='primary'
                                className='button-primary-danger'
                                size='large'
                            >
                                <StopIcon className={styles["stop-icon"]} />
                                停止录屏
                            </YakitButton>
                        ) : (
                            <YakitButton htmlType='submit' type='primary' size='large'>
                                <PlayIcon style={{height: 16}} />
                                开始录屏
                            </YakitButton>
                        )}
                        <YakitButton type='text' style={{marginTop: 12}} onClick={() => onShowScreenRecording()}>
                            刷新
                        </YakitButton>
                    </div>
                }
            />
        </div>
    ) : (
        <div className={styles["screen-recorder"]}>
            <div className={styles["screen-recorder-heard"]}>
                <div className={styles["heard-title"]}>
                    <span className={styles["heard-title-text"]}>录屏管理</span>
                    <span className={classNames("content-ellipsis", styles["heard-subTitle-text"])}>
                        本录屏在 Windows 下，会同时录制所有屏幕，合并在一个文件中；在 MacOS 下多屏会生成多个文件
                    </span>
                </div>
                <div className={styles["heard-extra"]}>
                    <Form
                        layout='inline'
                        size='small'
                        initialValues={{
                            DisableMouse: true, // 鼠标捕捉
                            Framerate: "7" // 帧率
                        }}
                        onFinish={(v) => {
                            const newValue = {
                                ...v,
                                DisableMouse: !v.DisableMouse
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
                            <YakitSelect
                                options={FramerateData}
                                style={{width: 120}}
                                size='small'
                                disabled={screenRecorderInfo.isRecording}
                            />
                        </Form.Item>
                        <Form.Item label='鼠标捕捉' valuePropName='checked' name='DisableMouse'>
                            <YakitSwitch disabled={screenRecorderInfo.isRecording} />
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
                            <YakitCheckbox
                                checked={allSelected}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        selectAll()
                                    } else {
                                        unSelectAll()
                                    }
                                }}
                                indeterminate={partiallySelected}
                            >
                                全选
                            </YakitCheckbox>
                            <div className={styles["title-text"]} style={{marginLeft: 8}}>
                                Total<span className={styles["title-number"]}>{total}</span>
                            </div>
                            <Divider type='vertical' style={{top: 2}} />
                            <div className={styles["title-text"]}>
                                Selected
                                <span className={styles["title-number"]}>{allSelected ? total : selected.length}</span>
                            </div>
                        </div>
                        <div className={styles["content-heard-extra"]}>
                            <YakitInput.Search
                                placeholder='请输入关键词搜索'
                                value={params.Keywords}
                                onChange={(e) =>
                                    setParams({
                                        ...params,
                                        Keywords: e.target.value
                                    })
                                }
                                onSearch={(v) => {
                                    setParams({
                                        ...params,
                                        Keywords: v
                                    })
                                    setTimeout(() => {
                                        onSearch()
                                    }, 100)
                                }}
                                onPressEnter={(v) => {
                                    onSearch()
                                }}
                            />
                            {isEnterpriseEdition() ? (
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
                                        className={classNames(styles["button-batch-operate"])}
                                    >
                                        批量操作
                                        <ChevronDownIcon />
                                    </YakitButton>
                                </YakitPopover>
                            ) : (
                                <YakitButton
                                    type='danger'
                                    disabled={selected.length === 0}
                                    className={classNames(styles["button-batch-remove"])}
                                    onClick={() => setDelShow(true)}
                                >
                                    批量删除
                                </YakitButton>
                            )}
                            <YakitButton
                                type='outline2'
                                className={classNames("button-outline2-danger")}
                                onClick={() => setDelShow(true)}
                            >
                                清空
                            </YakitButton>
                        </div>
                    </div>
                    <div className={styles["screen-recorder-list"]}>
                        <RollingLoadList<ScreenRecorder>
                            recalculation={recalculation}
                            isRef={isRef}
                            data={data}
                            page={pagination.Page}
                            hasMore={hasMore}
                            loading={loading}
                            loadMoreData={loadMoreData}
                            defItemHeight={96}
                            rowKey='Id'
                            classNameRow={styles["list-item"]}
                            renderRow={(item: ScreenRecorder, index) => {
                                return (
                                    <ScreenRecorderListItem
                                        item={item}
                                        isSelected={isSelected(item.Id)}
                                        onSelect={(item) => {
                                            if (isSelected(item.Id)) {
                                                unSelect(item.Id)
                                            } else {
                                                select(item.Id)
                                            }
                                        }}
                                        onUpdateScreenList={onUpdateScreenList}
                                        onRemoveScreenItem={onRemoveScreenItem}
                                    />
                                )
                            }}
                        />
                    </div>
                </YakitSpin>
            </div>
            <YakitHint
                visible={delShow}
                title='删除录屏'
                content='删除录屏的同时会清除本地视频文件'
                onOk={() => onBatchRemove()}
                onCancel={() => setDelShow(false)}
            />
        </div>
    )
}

interface ScreenRecorderListItemProps {
    item: ScreenRecorder
    isSelected: boolean
    onSelect: (s: ScreenRecorder) => void
    onUpdateScreenList: (s: ScreenRecorder) => void
    onRemoveScreenItem: (s: ScreenRecorder) => void
}
const ScreenRecorderListItem: React.FC<ScreenRecorderListItemProps> = (props) => {
    const {item, isSelected, onSelect, onUpdateScreenList, onRemoveScreenItem} = props
    const [urlVideo, setUrlVideo] = useState<string>("")
    const [visible, setVisible] = useState<boolean>(false)
    const [videoItem, setVideoItem] = useState<ScreenRecorder>(item)

    const [uploadLoading, setUploadLoading] = useState<boolean>(false)

    const [form] = Form.useForm()
    useEffect(() => {
        setUrlVideo(`atom://${item.Filename}`)
    }, [item.Filename])
    const onPlayVideo = useMemoizedFn(() => {
        ipcRenderer
            .invoke("is-file-exists", item.Filename)
            .then((flag: boolean) => {
                if (flag) {
                    setVideoItem(item)
                    setVisible(true)
                } else {
                    failed("目标文件已不存在!")
                }
            })
            .catch(() => {})
    })
    const onGetOneScreenRecorders = useMemoizedFn((order: "asc" | "desc") => {
        if (!videoItem) return
        const params = {
            Id: videoItem.Id,
            Order: order
        }
        ipcRenderer
            .invoke("GetOneScreenRecorders", params)
            .then((data) => {
                setVideoItem(data)
                setUrlVideo(`atom://${data.Filename}`)
            })
            .catch((err) => {
                yakitNotify("error", "播放失败：" + err)
            })
    })
    const onEdit = useMemoizedFn(() => {
        const m = showYakitModal({
            title: "编辑视频信息",
            type: "white",
            width: 720,
            onOkText: "保存",
            onOk: () => {
                form.validateFields()
                    .then((val) => {
                        const editItem = {
                            ...val,
                            Id: item.Id
                        }
                        ipcRenderer
                            .invoke("UpdateScreenRecorders", editItem)
                            .then(() => {
                                onUpdateScreenList({
                                    ...item,
                                    ...val
                                })
                                m.destroy()
                            })
                            .catch((err) => {
                                yakitNotify("error", "修改失败：" + err)
                            })
                    })
                    .catch(() => {})
            },
            content: (
                <Form
                    form={form}
                    initialValues={{
                        VideoName: item.VideoName || `视频-${item.Id}`,
                        NoteInfo: item.NoteInfo
                    }}
                    layout='vertical'
                    style={{padding: 24}}
                >
                    <Form.Item name='VideoName' label='视频名称' rules={[{required: true, message: "该项为必填"}]}>
                        <YakitInput maxLength={50} />
                    </Form.Item>
                    <Form.Item name='NoteInfo' label='备注'>
                        <YakitInput.TextArea rows={6} />
                    </Form.Item>
                </Form>
            )
        })
    })
    // 全局监听登录状态
    const {userInfo} = useStore()
    const onUpload = useMemoizedFn(() => {
        if (userInfo.isLogin) {
            setUploadLoading(true)
            const paramsUpload = {
                Token: userInfo.token,
                Ids: [item.Id]
            }
            ipcRenderer
                .invoke("UploadScreenRecorders", paramsUpload)
                .then((e) => {
                    yakitNotify("success", "上传成功")
                })
                .catch((err) => {
                    yakitNotify("error", "上传失败：" + err)
                })
                .finally(() =>
                    setTimeout(() => {
                        setUploadLoading(false)
                    }, 200)
                )
        } else {
            yakitNotify("warning", "请先登录，登录后方可使用")
        }
    })
    const onRemove = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteScreenRecorders", {
                Ids: [item.Id]
            })
            .then((e) => {
                onRemoveScreenItem(item)
                yakitNotify("success", "删除成功")
            })
            .catch((err) => {
                yakitNotify("error", "删除失败：" + err)
            })
    })
    return (
        <>
            <YakitCheckbox checked={isSelected} onClick={() => onSelect(item)} />
            <div className={styles["list-item-cover"]} onClick={() => onPlayVideo()}>
                <img alt='暂无图片' src={item.Cover ? `data:image/png;base64,${item.Cover}` : noPictures} />
                <div className={styles["list-item-cover-hover"]}>
                    <PlayIcon />
                </div>
            </div>

            <div className={styles["list-item-info"]}>
                <div className={classNames("content-ellipsis", styles["list-item-name"])} onClick={() => onPlayVideo()}>
                    {item.VideoName || `视频-${item.Id}`}
                </div>
                <div className={styles["list-item-notes"]}>{item.NoteInfo || "No Description about it."}</div>
                <div className={styles["list-item-extra"]}>
                    <div className={styles["list-item-duration"]}>
                        <ClockIcon style={{marginRight: 4}} /> {item.Duration || "0s"}
                    </div>
                    <Divider type='vertical' style={{margin: "0 16px", top: 2}} />
                    <div className={styles["list-item-created-at"]}>{formatTimestamp(item.CreatedAt)}</div>
                    <Divider type='vertical' style={{margin: "0 16px", top: 2}} />
                    <div className={classNames("content-ellipsis", styles["list-item-filename"])}>
                        <span
                            className={classNames("content-ellipsis")}
                            onClick={() => {
                                ipcRenderer
                                    .invoke("is-file-exists", item.Filename)
                                    .then((flag: boolean) => {
                                        if (flag) {
                                            openABSFileLocated(item.Filename)
                                        } else {
                                            failed("目标文件已不存在!")
                                        }
                                    })
                                    .catch(() => {})
                            }}
                        >
                            {item.Filename}
                        </span>
                        <CopyComponents copyText={item.Filename} />
                    </div>
                </div>
            </div>

            <div className={styles["list-item-operate"]}>
                <PencilAltIcon onClick={() => onEdit()} />

                {isEnterpriseEdition() && (
                    <>
                        <Divider type='vertical' style={{margin: "0 16px"}} />
                        {uploadLoading ? <LoadingOutlined /> : <CloudUploadIcon onClick={() => onUpload()} />}
                    </>
                )}
                <Divider type='vertical' style={{margin: "0 16px"}} />
                <YakitPopconfirm
                    title={"删除录屏的同时会删除本地录屏文件"}
                    onConfirm={() => onRemove()}
                    className='button-text-danger'
                >
                    <TrashIcon className={styles["icon-trash"]} />
                </YakitPopconfirm>
            </div>
            <YakitModal
                visible={visible}
                footer={null}
                closeIcon={<></>}
                centered
                width={922}
                onCancel={() => setVisible(false)}
            >
                <ReactPlayerVideo
                    url={urlVideo}
                    title={videoItem.VideoName || `视频-${videoItem.Id}`}
                    onPreClick={() => onGetOneScreenRecorders("asc")}
                    onNextClick={() => onGetOneScreenRecorders("desc")}
                    isPre={videoItem.Before}
                    isNext={videoItem.After}
                />
            </YakitModal>
        </>
    )
}
