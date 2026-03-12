import React, {useEffect, useState} from "react"
import {useCreation, useMemoizedFn, useSelections, useUpdateEffect} from "ahooks"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {Divider, Form, Tooltip} from "antd"
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
import {FramerateData, CoefficientPTSData, ScrecorderModal} from "./ScrecorderModal"
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
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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
const batchMenuDataEnterprise = (t: any): YakitMenuItemProps[] => [
    // {
    //     key: "upload",
    //     label: "上传"
    // },
    {
        key: "remove",
        label: t("YakitButton.delete")
    }
]
interface QueryScreenRecordersProps {
    Keywords: string
}
export const Screen_Recorder_Framerate = "Screen_Recorder_Framerate"
export const Screen_Recorder_CoefficientPTS = "Screen_Recorder_CoefficientPTS"
export const ScreenRecorderList: React.FC<ScreenRecorderListProp> = (props) => {
    const {t} = useI18nNamespaces(["screenRecorder", "yakitUi"])
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
    const [form] = Form.useForm()
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
                yakitNotify("error", t("ScreenRecorderList.getListFailed", {error: e}))
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        onShowScreenRecording()
    }, [])

    useEffect(() => {
        onRefresh()
        onSetFramerate()
        onCoefficientPTS()
    }, [props.refreshTrigger, isShowScreenRecording])
    useUpdateEffect(() => {
        if (!screenRecorderInfo.isRecording) {
            if (isShowScreenRecording) {
                onShowScreenRecording()
            } else {
                setTimeout(() => {
                    onRefresh()
                }, 1000)
            }
        } else {
            onSetFramerate()
            onCoefficientPTS()
        }
    }, [screenRecorderInfo.isRecording])
    const onSetFramerate = useMemoizedFn(() => {
        getRemoteValue(Screen_Recorder_Framerate).then((val) => {
            form.setFieldsValue({
                Framerate: val || "7"
            })
        })
    })
    const onCoefficientPTS = useMemoizedFn(() => {
        getRemoteValue(Screen_Recorder_CoefficientPTS).then((val) => {
            form.setFieldsValue({
                CoefficientPTS: +val || 1
            })
        })
    })
    const onShowScreenRecording = useMemoizedFn(() => {
        setLoading(true)
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
                yakitNotify("error", t("ScreenRecorderList.getListFailed", {error: e}))
            })
            .finally(() => setTimeout(() => setLoading(false), 200))
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
            yakitNotify("warning", t("ScreenRecorderList.loginRequired"))
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
        ipcRenderer
            .invoke("UploadScreenRecorders", paramsUpload)
            .then(() => {
                yakitNotify("success", t("YakitNotification.uploaded"))
                onSearch()
                setSelected([])
            })
            .catch((err) => {
                yakitNotify("error", `${t("YakitNotification.uploadFailed", {colon: true})}${err}`)
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
                yakitNotify("success", t("YakitNotification.deleted"))
                onSearch()
                setSelected([])
                setDelShow(false)
            })
            .catch((err) => {
                yakitNotify("error", `${t("YakitNotification.deleteFailed", {colon: true})}${err}`)
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
        setTotal(total - 1)
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
    })
    return isShowScreenRecording ? (
        <div className={styles["screen-recorder-empty"]}>
            <div className={styles["empty-title"]}>{t("ScreenRecorderList.screenRecorder")}</div>
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
                                colors='danger'
                                size='large'
                            >
                                <StopIcon />
                                {t("ScreenRecorderList.stopRecording")}
                            </YakitButton>
                        ) : (
                            <YakitButton htmlType='submit' type='primary' size='large'>
                                <PlayIcon style={{height: 16}} />
                                {t("ScrecorderModal.startRecording")}
                            </YakitButton>
                        )}
                        {loading ? (
                            <YakitButton type='text' style={{marginTop: 12}}>
                                <LoadingOutlined />
                            </YakitButton>
                        ) : (
                            <YakitButton type='text' style={{marginTop: 12}} onClick={() => onShowScreenRecording()}>
                                {t("YakitButton.refresh")}
                            </YakitButton>
                        )}
                    </div>
                }
            />
        </div>
    ) : (
        <div className={styles["screen-recorder"]}>
            <div className={styles["screen-recorder-heard"]}>
                <div className={styles["heard-title"]}>
                    <span className={styles["heard-title-text"]}>{t("ScreenRecorderList.screenRecorder")}</span>
                    <span className={classNames("content-ellipsis", styles["heard-subTitle-text"])}>
                        {t("ScrecorderModal.screenRecorderDesc")}
                    </span>
                </div>
                <div className={styles["heard-extra"]}>
                    <Form
                        layout='inline'
                        size='small'
                        form={form}
                        initialValues={{
                            DisableMouse: true, // 鼠标捕捉
                            Framerate: "7", // 帧率
                            CoefficientPTS: 1
                        }}
                        onFinish={(v) => {
                            const newValue = {
                                ...v,
                                DisableMouse: !v.DisableMouse
                            }
                            setRemoteValue(Screen_Recorder_Framerate, v.Framerate)
                            setRemoteValue(Screen_Recorder_CoefficientPTS, v.CoefficientPTS)
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
                            label={t("ScrecorderModal.framerate")}
                            tooltip={{
                                title: t("ScrecorderModal.framerateTooltip"),
                                icon: <InformationCircleIcon style={{cursor: "auto"}} />
                            }}
                            name='Framerate'
                        >
                            <YakitSelect
                                options={FramerateData(t)}
                                style={{width: 120}}
                                size='small'
                                disabled={screenRecorderInfo.isRecording}
                            />
                        </Form.Item>
                        <Form.Item label={t("ScrecorderModal.speed")} name='CoefficientPTS'>
                            <YakitSelect
                                options={CoefficientPTSData(t)}
                                style={{width: 120}}
                                size='small'
                                disabled={screenRecorderInfo.isRecording}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("ScrecorderModal.mouseCapture")}
                            valuePropName='checked'
                            name='DisableMouse'
                        >
                            <YakitSwitch disabled={screenRecorderInfo.isRecording} />
                        </Form.Item>
                        <Divider type='vertical' style={{margin: 0, height: 16, marginRight: 16, top: 4}} />
                        {screenRecorderInfo.isRecording ? (
                            <YakitButton
                                onClick={() => {
                                    ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
                                }}
                                type='primary'
                                colors='danger'
                            >
                                <StopIcon />
                                {t("ScreenRecorderList.stopRecording")}
                            </YakitButton>
                        ) : (
                            <YakitButton htmlType='submit' type='primary'>
                                <PlayIcon style={{height: 16}} />
                                {t("ScrecorderModal.startRecording")}
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
                                {t("YakitCheckbox.selectAll")}
                            </YakitCheckbox>
                            <div className={styles["title-text"]} style={{marginLeft: 8}}>
                                Total
                                <span className={styles["title-number"]}>{total}</span>
                            </div>
                            <Divider type='vertical' style={{top: 2}} />
                            <div className={styles["title-text"]}>
                                Selected
                                <span className={styles["title-number"]}>{allSelected ? total : selected.length}</span>
                            </div>
                        </div>
                        <div className={styles["content-heard-extra"]}>
                            <YakitInput.Search
                                placeholder={t("YakitInput.searchKeyWordPlaceholder")}
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
                                            data={batchMenuDataEnterprise(t)}
                                            selectedKeys={[]}
                                            width={92}
                                            onSelect={({key}) => onMenuSelect(key)}
                                        />
                                    }
                                    trigger='click'
                                    overlayClassName={classNames(styles["popover-remove"])}
                                >
                                    <YakitButton
                                        type='outline2'
                                        disabled={selected.length === 0}
                                        className={classNames(styles["button-batch-operate"])}
                                    >
                                        {t("YakitButton.batchOperation")}
                                        <ChevronDownIcon />
                                    </YakitButton>
                                </YakitPopover>
                            ) : (
                                <YakitButton
                                    colors='danger'
                                    disabled={selected.length === 0}
                                    className={classNames(styles["button-batch-remove"])}
                                    onClick={() => setDelShow(true)}
                                >
                                    {t("YakitButton.batchDelete")}
                                </YakitButton>
                            )}
                            <YakitButton type='outline1' colors='danger' onClick={() => setDelShow(true)}>
                                {t("YakitButton.clear")}
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
                title={t("ScreenRecorderList.deleteTitle")}
                content={t("ScreenRecorderList.deleteDesc")}
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
    const {t} = useI18nNamespaces(["screenRecorder", "yakitUi"])
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
                    failed(t("ScreenRecorderListItem.fileNotFound"))
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
                yakitNotify("error", t("ScreenRecorderListItem.playFailed", {error: err}))
            })
    })
    const onEdit = useMemoizedFn(() => {
        const m = showYakitModal({
            title: t("ScreenRecorderListItem.editVideoInfo"),
            type: "white",
            width: 720,
            onOkText: t("YakitButton.save"),
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
                                yakitNotify("error", t("ScreenRecorderListItem.updateFailed", {error: err}))
                            })
                    })
                    .catch(() => {})
            },
            content: (
                <Form
                    form={form}
                    initialValues={{
                        VideoName: item.VideoName || `${t("ScreenRecorderListItem.video")}-${item.Id}`,
                        NoteInfo: item.NoteInfo
                    }}
                    layout='vertical'
                    style={{padding: 24}}
                >
                    <Form.Item
                        name='VideoName'
                        label={t("ScreenRecorderListItem.videoName")}
                        rules={[{required: true, message: t("YakitForm.requiredField")}]}
                    >
                        <YakitInput maxLength={50} />
                    </Form.Item>
                    <Form.Item name='NoteInfo' label={t("ScreenRecorderListItem.notes")}>
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
                    yakitNotify("success", t("YakitNotification.uploaded"))
                })
                .catch((err) => {
                    yakitNotify("error", `${t("YakitNotification.uploadFailed", {colon: true})}${err}`)
                })
                .finally(() =>
                    setTimeout(() => {
                        setUploadLoading(false)
                    }, 200)
                )
        } else {
            yakitNotify("warning", t("ScreenRecorderList.loginRequired"))
        }
    })
    const onRemove = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteScreenRecorders", {
                Ids: [item.Id]
            })
            .then((e) => {
                onRemoveScreenItem(item)
                yakitNotify("success", t("YakitNotification.deleted"))
            })
            .catch((err) => {
                yakitNotify("error", `${t("YakitNotification.deleteFailed", {colon: true})}${err}`)
            })
    })
    return (
        <>
            <YakitCheckbox checked={isSelected} onClick={() => onSelect(item)} />
            <div className={styles["list-item-cover"]} onClick={() => onPlayVideo()}>
                <img
                    alt={t("ScreenRecorderListItem.noImage")}
                    src={item.Cover ? `data:image/png;base64,${item.Cover}` : noPictures}
                />
                <div className={styles["list-item-cover-hover"]}>
                    <PlayIcon />
                </div>
            </div>

            <div className={styles["list-item-info"]}>
                <div className={classNames("content-ellipsis", styles["list-item-name"])} onClick={() => onPlayVideo()}>
                    {item.VideoName || `${t("ScreenRecorderListItem.video")}-${item.Id}`}
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
                        <Tooltip title={t("ScreenRecorderListItem.openDirectory")}>
                            <span
                                className={classNames("content-ellipsis")}
                                onClick={() => {
                                    ipcRenderer
                                        .invoke("is-file-exists", item.Filename)
                                        .then((flag: boolean) => {
                                            if (flag) {
                                                openABSFileLocated(item.Filename)
                                            } else {
                                                failed(t("ScreenRecorderListItem.fileNotFound"))
                                            }
                                        })
                                        .catch(() => {})
                                }}
                            >
                                {item.Filename}
                            </span>
                        </Tooltip>
                        <CopyComponents copyText={item.Filename} />
                    </div>
                </div>
            </div>

            <div className={styles["list-item-operate"]}>
                <PencilAltIcon onClick={() => onEdit()} />

                {/* {isEnterpriseEdition() && (
                    <>
                        <Divider type='vertical' style={{margin: "0 16px"}} />
                        {uploadLoading ? <LoadingOutlined /> : <CloudUploadIcon onClick={() => onUpload()} />}
                    </>
                )} */}
                <Divider type='vertical' style={{margin: "0 16px"}} />
                <YakitPopconfirm title={t("ScreenRecorderListItem.deletePopconfirm")} onConfirm={() => onRemove()}>
                    <YakitButton
                        type='text'
                        size={"small"}
                        danger
                        icon={<TrashIcon className={styles["icon-trash"]} />}
                    />
                </YakitPopconfirm>
            </div>
            <YakitModal
                visible={visible}
                footer={null}
                closeIcon={<></>}
                centered
                width={922}
                onCancel={() => setVisible(false)}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <ReactPlayerVideo
                    url={urlVideo}
                    title={videoItem.VideoName || `${t("ScreenRecorderListItem.video")}-${videoItem.Id}`}
                    onPreClick={() => onGetOneScreenRecorders("asc")}
                    onNextClick={() => onGetOneScreenRecorders("desc")}
                    isPre={videoItem.Before}
                    isNext={videoItem.After}
                />
            </YakitModal>
        </>
    )
}
