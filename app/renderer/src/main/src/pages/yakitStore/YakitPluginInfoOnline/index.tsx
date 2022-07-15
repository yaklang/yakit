import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, memo} from "react"
import {useStore} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {failed, success, warn} from "../../../utils/notification"
import {PageHeader, Space, Tooltip, Button, Empty, Tag, Tabs, Upload, Input, List, Modal} from "antd"
import {
    StarOutlined,
    StarFilled,
    ArrowLeftOutlined,
    PlusCircleOutlined,
    DownloadOutlined,
    PictureOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    QuestionOutlined,
    LoadingOutlined
} from "@ant-design/icons"
import numeral from "numeral"
import "./index.scss"
import moment from "moment"
import cloneDeep from "lodash/cloneDeep"
import {showFullScreenMask} from "@/components/functionTemplate/showByContext"
import {useCommenStore} from "@/store/comment"
import InfiniteScroll from "react-infinite-scroll-component"
import {CollapseParagraph} from "./CollapseParagraph"
import {OnlineCommentIcon, OnlineThumbsUpIcon, OnlineSurfaceIcon} from "@/assets/icons"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import {YakEditor} from "@/utils/editors"
import {usePluginStore} from "@/store/plugin"

const {ipcRenderer} = window.require("electron")
const {TabPane} = Tabs
const limit = 5

interface YakitPluginInfoOnlineProps {
    info: API.YakitPluginDetail
}

interface SearchPluginDetailRequest {
    id: number
}

export interface StarsOperation {
    id: number
    operation: string
}

export interface DownloadOnlinePluginProps {
    OnlineID?: number
    UUID: string
}

interface AuditParameters {
    id: number
    status: boolean
}

export const TagColor: {[key: string]: string} = {
    failed: "color-bgColor-red|审核不通过",
    success: "color-bgColor-green|审核通过",
    not: "color-bgColor-blue|待审核"
}

export const YakitPluginInfoOnline: React.FC<YakitPluginInfoOnlineProps> = (props) => {
    const {info} = props
    // 全局登录状态
    const {userInfo} = useStore()
    const [loading, setLoading] = useState<boolean>(false)
    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useGetState<API.YakitPluginDetail>()
    useEffect(() => {
        getPluginDetail()
    }, [info.id])
    const getPluginDetail = useMemoizedFn(() => {
        let url = "yakit/plugin/detail-unlogged"
        if (userInfo.isLogin) {
            url = "yakit/plugin/detail"
        }
        setLoading(true)
        NetWorkApi<SearchPluginDetailRequest, API.YakitPluginDetailResponse>({
            method: "get",
            url,
            params: {
                id: info.id
            }
        })
            .then((res) => {
                setPlugin(res.data)
            })
            .catch((err) => {
                failed("插件详情获取失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const pluginStar = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("请先登录")
            return
        }
        if (!plugin) return
        const prams: StarsOperation = {
            id: plugin?.id,
            operation: plugin.is_stars ? "remove" : "add"
        }

        NetWorkApi<StarsOperation, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/stars",
            params: prams
        })
            .then((res) => {
                if (!res.ok) return
                if (plugin.is_stars) {
                    plugin.is_stars = false
                    plugin.stars -= 1
                } else {
                    plugin.is_stars = true
                    plugin.stars += 1
                }
                setPlugin({...plugin})
            })
            .catch((err) => {
                failed("插件点星:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const pluginAdd = useMemoizedFn(() => {
        if (!plugin) return
        // if (!isLogin) {
        //     warn("请先登录")
        //     return
        // }
        setAddLoading(true)
        ipcRenderer
            .invoke("DownloadOnlinePluginById", {
                OnlineID: plugin.id,
                UUID: plugin.uuid
            } as DownloadOnlinePluginProps)
            .then(() => {
                success("添加成功")
                setPlugin({
                    ...plugin,
                    downloaded_total: plugin.downloaded_total + 1
                })
            })
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
            .finally(() => {
                setTimeout(() => setAddLoading(false), 200)
            })
    })
    const {setCurrentPlugin} = usePluginStore()
    const pluginExamine = useMemoizedFn((status: number) => {
        const auditParams: AuditParameters = {
            id: plugin?.id || 0,
            status: status === 1
        }
        if (auditParams.id === 0) return
        NetWorkApi<AuditParameters, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/audit",
            params: auditParams
        })
            .then((res) => {
                if (plugin) {
                    const newPlugin = {...plugin, status}
                    setPlugin(newPlugin)
                    setCurrentPlugin({currentPlugin: newPlugin})
                }
                success(`插件审核${status === 1 ? "通过" : "不通过"}`)
            })
            .catch((err) => {
                failed("审核失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    if (!plugin) {
        return (
            <div className='yakit-plugin-info-container'>
                <Empty description='无插件信息' />
            </div>
        )
    }
    const tags: string[] = plugin.tags ? JSON.parse(plugin.tags) : []
    const isAdmin = userInfo.role === "admin"
    return (
        <div className='plugin-info'>
            {/* PageHeader */}
            <PageHeader
                title={plugin?.script_name}
                style={{marginBottom: 0, paddingBottom: 0}}
                subTitle={
                    <Space>
                        {isAdmin && (
                            <div className='plugin-status vertical-center'>
                                <div
                                    className={`${
                                        TagColor[["not", "success", "failed"][plugin.status]].split("|")[0]
                                    } title-body-admin-tag`}
                                >
                                    {TagColor[["not", "success", "failed"][plugin.status]].split("|")[1]}
                                </div>
                            </div>
                        )}
                        {plugin?.help && (
                            <Tooltip title={plugin.help}>
                                <Button type={"link"} icon={<QuestionOutlined />} />
                            </Tooltip>
                        )}
                        <Tooltip title={`插件id:${plugin?.uuid || "-"}`}>
                            <p className='plugin-author'>作者:{plugin.authors}</p>
                        </Tooltip>
                        {(tags &&
                            tags.length > 0 &&
                            tags.map((i) => (
                                <Tag style={{marginLeft: 2, marginRight: 0}} key={`${i}`} color={"geekblue"}>
                                    {i}
                                </Tag>
                            ))) ||
                            "No Tags"}
                    </Space>
                }
                extra={
                    <div className='plugin-heard-extra'>
                        <div className='preface-star-and-download'>
                            <div onClick={pluginStar}>
                                {plugin.is_stars ? (
                                    <StarFilled className='solid-star' />
                                ) : (
                                    <StarOutlined className='star-download-icon' />
                                )}
                            </div>
                            <div className='vertical-center'>
                                <span className={`star-download-num ${plugin.is_stars && `star-download-num-active`}`}>
                                    {plugin.stars > 10000000 ? "10,000,000+" : numeral(plugin.stars).format("0,0")}
                                </span>
                            </div>
                        </div>
                        <div className='preface-star-and-download'>
                            <div className='vertical-center'>
                                {(addLoading && <LoadingOutlined />) || (
                                    <DownloadOutlined className='star-download-icon' onClick={pluginAdd} />
                                )}
                            </div>
                            <div className='vertical-center'>
                                <span className='star-download-num'>{plugin.downloaded_total}</span>
                            </div>
                        </div>
                    </div>
                }
            />
            <div className='plugin-body'>
                <div className='flex-space-between'>
                    <div className='vertical-center'>
                        <div className='preface-time'>
                            <span className='time-title'>最新更新时间</span>
                            <span className='time-style'>
                                {plugin?.updated_at && moment.unix(info.updated_at).format("YYYY年MM月DD日")}
                            </span>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className='plugin-info-examine'>
                            <Button onClick={() => pluginExamine(2)}>不通过</Button>
                            <Button type='primary' onClick={() => pluginExamine(1)}>
                                通过
                            </Button>
                        </div>
                    )}
                </div>

                <Tabs defaultActiveKey='1'>
                    <TabPane tab='源码' key='1'>
                        <YakEditor type={"yak"} value={plugin.content} readOnly={true} />
                    </TabPane>
                    <TabPane tab='评论' key='2'>
                        <PluginComment isLogin={userInfo.isLogin} plugin={plugin} />
                    </TabPane>
                </Tabs>
            </div>
        </div>
    )
}

interface PluginCommentProps {
    plugin: API.YakitPluginDetail
    isLogin: boolean
}

interface SearchCommentRequest {
    plugin_id: number
    limit: number
    page: number
}

interface CommentStarsProps {
    comment_id: number
    operation: string
}

const PluginComment: React.FC<PluginCommentProps> = (props) => {
    const {plugin, isLogin} = props
    const [commentLoading, setCommentLoading] = useState<boolean>(false)
    const [commentText, setCommentText] = useState<string>("")
    const [files, setFiles] = useState<string[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [commentResponses, setCommentResponses] = useGetState<API.CommentListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit,
            total: 0,
            total_page: 0
        }
    })
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [commentInputText, setCommentInputText] = useState<string>("")
    const [commentFiles, setCommentFiles] = useState<string[]>([])
    const [currentComment, setCurrentComment] = useState<API.CommentListData | null>()
    const [commentShow, setCommentShow] = useState<boolean>(false)
    const [parentComment, setParentComment] = useState<API.CommentListData>()
    const [commentChildVisible, setCommentChildVisible] = useState<boolean>(false)
    const [commentSecondShow, setCommentSencondShow] = useState<boolean>(false)
    useEffect(() => {
        getComment(1)
        setFiles([])
        setCommentText("")
    }, [plugin.id])
    const getComment = useMemoizedFn((page: number = 1) => {
        const params: SearchCommentRequest = {
            plugin_id: plugin.id,
            limit,
            page
        }
        setLoading(true)
        NetWorkApi<SearchCommentRequest, API.CommentListResponse>({
            method: "get",
            url: "comment",
            params
        })
            .then((res) => {
                if (!res.data) {
                    res.data = []
                }
                const newCommentResponses = {
                    data: page === 1 ? res.data : commentResponses.data.concat(res.data),
                    pagemeta: res.pagemeta
                }
                const isMore = res.data.length < limit
                setHasMore(!isMore)
                setCommentResponses({
                    data: [...newCommentResponses.data],
                    pagemeta: res.pagemeta
                })
            })
            .catch((err) => {
                failed("评论查询失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    // 新增评论
    const pluginComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!commentText) {
            failed("请输入评论内容")
            return
        }
        const params = {
            plugin_id: plugin.id,
            message_img: files,
            parent_id: 0,
            root_id: 0,
            by_user_id: 0,
            message: commentText
        }
        addComment(params)
    })

    // 全局监听是否刷新子评论列表状态
    const {setCommenData} = useCommenStore()
    const addComment = useMemoizedFn((data: API.NewComment) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        NetWorkApi<API.NewComment, API.ActionSucceeded>({
            method: "post",
            url: "comment",
            data
        })
            .then((res) => {
                if (data.by_user_id && data.by_user_id > 0) {
                    // 刷新modal中子评论列表
                    setCommenData({
                        isRefChildCommentList: true
                    })
                }
                if (data.parent_id === 0) getComment(1)
                if (commentText) setCommentText("")
                if (files.length > 0) setFiles([])
                if (commentInputText) setCommentInputText("")
                if (currentComment?.id) setCurrentComment(null)
                if (commentFiles.length > 0) setCommentFiles([])
                if (commentShow) setCommentShow(false)
            })
            .catch((err) => {
                failed("评论错误" + err)
            })
            .finally(() => {
                setTimeout(() => setCommentLoading(false), 200)
            })
    })
    const pluginReply = useMemoizedFn((item: API.CommentListData) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        setCurrentComment(item)
        setCommentShow(true)
    })
    const pluginReplyComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!currentComment?.id) return
        if (!commentInputText) {
            failed("请输入评论内容")
            return
        }
        const params = {
            plugin_id: plugin.id,
            message_img: commentFiles,
            parent_id: currentComment.root_id === 0 ? 0 : currentComment.id,
            root_id: currentComment.root_id || currentComment.id,
            by_user_id: currentComment.user_id,
            message: commentInputText
        }
        addComment(params)
    })
    const pluginCommentStar = useMemoizedFn((item: API.CommentListData) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        const params: CommentStarsProps = {
            comment_id: item.id,
            operation: item.is_stars ? "remove" : "add"
        }

        NetWorkApi<CommentStarsProps, API.ActionSucceeded>({
            method: "post",
            url: "comment/stars",
            params: params
        })
            .then((res) => {
                if (!commentResponses) return
                const index: number = commentResponses.data.findIndex((ele: API.CommentListData) => ele.id === item.id)
                if (index !== -1) {
                    if (item.is_stars) {
                        commentResponses.data[index].like_num -= 1
                        commentResponses.data[index].is_stars = false
                    } else {
                        commentResponses.data[index].like_num += 1
                        commentResponses.data[index].is_stars = true
                    }
                    setCommentResponses({
                        ...commentResponses,
                        data: [...commentResponses.data]
                    })
                }
            })
            .catch((err) => {
                failed("点赞失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const openCommentChildModel = (visible) => {
        setCommentChildVisible(visible)
    }
    const loadMoreData = useMemoizedFn(() => {
        getComment(commentResponses.pagemeta.page + 1)
    })
    const pluginCancelComment = useMemoizedFn((flag: number) => {
        if (flag === 2) {
            setCurrentComment(null)
            setCommentInputText("")
            setCommentFiles([])
            setCommentShow(false)
        }
        setCommentSencondShow(false)
    })
    return (
        <>
            <div className='info-comment-box'>
                <div className='box-header'>
                    <span className='header-title'>用户评论</span>
                    <span className='header-subtitle'>{plugin.comment_num || 0}</span>
                </div>
                <PluginCommentInput
                    value={commentText}
                    setValue={setCommentText}
                    files={files}
                    setFiles={setFiles}
                    onSubmit={pluginComment}
                    loading={commentLoading}
                    isLogin={isLogin}
                />
            </div>
            {/* @ts-ignore */}
            <InfiniteScroll
                dataLength={commentResponses?.pagemeta?.total || 0}
                key={commentResponses?.pagemeta?.page}
                next={loadMoreData}
                hasMore={hasMore}
                loader={
                    <div className='vertical-center'>
                        <LoadingOutlined />
                    </div>
                }
                endMessage={
                    (commentResponses?.pagemeta?.total || 0) > 0 && <div className='row-cneter'>暂无更多数据</div>
                }
                scrollableTarget='plugin-info-scroll'
            >
                <List
                    dataSource={commentResponses.data || []}
                    loading={loading}
                    renderItem={(item) => (
                        <>
                            <PluginCommentInfo
                                key={item.id}
                                info={item}
                                onReply={pluginReply}
                                onStar={pluginCommentStar}
                                isStarChange={item.is_stars}
                                setParentComment={setParentComment}
                                openCommentChildModel={openCommentChildModel}
                            />
                            <div className='comment-separator'></div>
                        </>
                    )}
                />
            </InfiniteScroll>
            <PluginCommentChildModal
                visible={commentChildVisible}
                parentInfo={parentComment}
                onReply={pluginReply}
                onCancel={(val) => {
                    setParentComment(undefined)
                    setCommentChildVisible(val)
                }}
                isLogin={isLogin}
            />
            <Modal
                wrapClassName='comment-reply-dialog'
                title={<div className='header-title'>回复@{currentComment?.user_name}</div>}
                visible={commentShow}
                centered={true}
                footer={null}
                destroyOnClose={true}
                onCancel={() => setCommentSencondShow(true)}
            >
                <PluginCommentInput
                    value={commentInputText}
                    setValue={setCommentInputText}
                    files={commentFiles}
                    setFiles={setCommentFiles}
                    onSubmit={pluginReplyComment}
                    loading={commentLoading}
                    isLogin={isLogin}
                ></PluginCommentInput>
            </Modal>
            <SecondConfirm visible={commentSecondShow} onCancel={pluginCancelComment}></SecondConfirm>
        </>
    )
}

interface PluginCommentInfoProps {
    info: API.CommentListData
    key: number
    isStarChange?: boolean
    isOperation?: boolean
    onReply: (name: API.CommentListData) => any
    onStar: (name: API.CommentListData) => any
    openCommentChildModel?: (visible: boolean) => any
    setParentComment?: (name: API.CommentListData) => any
}
// 评论内容单条组件
const PluginCommentInfo = memo((props: PluginCommentInfoProps) => {
    const {
        info,
        onReply,
        onStar,
        key,
        isStarChange,
        openCommentChildModel,
        setParentComment,
        isOperation = true
    } = props

    const message_img: string[] = (info.message_img && JSON.parse(info.message_img)) || []
    return (
        <div className='plugin-comment-opt' key={key}>
            <div className='opt-author-img'>
                <img src={info.head_img} className='author-img-style' />
            </div>

            <div className='opt-comment-body'>
                <div className='comment-body-name'>{info.user_name || "anonymous"}</div>

                <div className='comment-body-content'>
                    <CollapseParagraph value={`${info.message}`} rows={2} valueConfig={{className: "content-style"}}>
                        {info.by_user_name && (
                            <span>
                                回复<span className='content-by-name'>{info.by_user_name}</span>:
                            </span>
                        )}
                    </CollapseParagraph>
                </div>

                <div className='comment-body-time-func'>
                    <div>
                        <span>{moment.unix(info.created_at).format("YYYY-MM-DD HH:mm")}</span>
                    </div>
                    {isOperation && (
                        <div className='func-comment-and-star'>
                            <div className='comment-and-star' onClick={() => onReply(info)}>
                                {/* @ts-ignore */}
                                <OnlineCommentIcon className='icon-style-comment hover-active' />
                            </div>
                            <div
                                style={{marginLeft: 18}}
                                className='hover-active  comment-and-star'
                                onClick={() => onStar(info)}
                            >
                                {/* @ts-ignore */}
                                {(isStarChange && <OnlineSurfaceIcon className='hover-active icon-style-start' />) || (
                                    // @ts-ignore
                                    <OnlineThumbsUpIcon className='hover-active  icon-style' />
                                )}
                                <span className={`hover-active  num-style ${isStarChange && "num-style-active"}`}>
                                    {numeral(info.like_num).format("0,0")}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <Space>
                    {message_img.map((url) => (
                        <img
                            key={url + info.id}
                            src={url as any}
                            className='comment-pic'
                            onClick={() => {
                                let m = showFullScreenMask(
                                    <PluginMaskImage info={url} />,
                                    "mask-img-display",
                                    undefined,
                                    (e) => {
                                        if ((e.target as any).className === "mask-img-display") m.destroy()
                                    }
                                )
                            }}
                        />
                    ))}
                </Space>
                {isOperation && info.reply_num > 0 && (
                    <a
                        className='comment-reply'
                        onClick={() => {
                            if (openCommentChildModel && setParentComment) {
                                setParentComment(info)
                                setTimeout(() => {
                                    openCommentChildModel(true)
                                }, 1)
                            }
                        }}
                    >
                        查看更多回复
                    </a>
                )}
            </div>
        </div>
    )
})

interface PluginCommentInputProps {
    value: string
    loading: boolean
    isLogin?: boolean
    setValue: (value: string) => any
    files: string[]
    setFiles: (files: string[]) => any
    onSubmit: (callback?) => any
}

// 评论功能的部分组件-输入组件、展示图片组件、上传和提交按钮组件
const PluginCommentInput = (props: PluginCommentInputProps) => {
    const {value, loading, isLogin, setValue, files, setFiles, onSubmit} = props
    const [filesLoading, setFilesLoading] = useState<boolean>(false)
    const uploadFiles = (file) => {
        setFilesLoading(true)
        ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                setFiles(files.concat(res.data))
            })
            .finally(() => {
                setTimeout(() => setFilesLoading(false), 1)
            })
    }
    return (
        <div className='plugin-info-comment-input'>
            <div className='box-input'>
                <Input.TextArea
                    className='input-stlye'
                    value={value}
                    autoSize={{minRows: 1, maxRows: 6}}
                    placeholder='说点什么...'
                    onChange={(e) => setValue(e.target.value)}
                ></Input.TextArea>
            </div>
            <div className='box-btn'>
                {isLogin && (
                    <Upload
                        accept='image/jpeg,image/png,image/jpg,image/gif'
                        multiple={false}
                        disabled={files.length >= 3}
                        showUploadList={false}
                        beforeUpload={(file: any) => {
                            if (file.size / 1024 / 1024 > 10) {
                                failed("图片大小不超过10M")
                                return false
                            }
                            if (!"image/jpeg,image/png,image/jpg,image/gif".includes(file.type)) {
                                failed("仅支持上传图片格式为：image/jpeg,image/png,image/jpg,image/gif")
                                return false
                            }
                            if (file) {
                                uploadFiles(file)
                            }
                            return true
                        }}
                    >
                        <Button
                            loading={filesLoading}
                            type='link'
                            disabled={files.length >= 3}
                            icon={<PictureOutlined className={files.length >= 3 ? "btn-pic-disabled" : "btn-pic"} />}
                        />
                    </Upload>
                )}
                <Button
                    disabled={!isLogin || !value}
                    type={value ? "primary" : undefined}
                    className={value || files.length !== 0 ? "" : "btn-submit"}
                    onClick={onSubmit}
                    loading={loading}
                >
                    评论
                </Button>
            </div>
            {files.length !== 0 && (
                <div className='box-upload'>
                    {files.map((item, index) => {
                        return (
                            <div key={item} className='upload-img-opt'>
                                <img
                                    key={item}
                                    src={item as any}
                                    className='opt-pic'
                                    onClick={() => {
                                        let m = showFullScreenMask(
                                            <PluginMaskImage info={item} />,
                                            "mask-img-display",
                                            undefined,
                                            (e) => {
                                                if ((e.target as any).className === "mask-img-display") m.destroy()
                                            }
                                        )
                                    }}
                                />
                                <div
                                    className='opt-del'
                                    onClick={() => {
                                        const arr = cloneDeep(files)
                                        arr.splice(index, 1)
                                        setFiles(arr)
                                    }}
                                >
                                    x
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

interface PluginMaskImageProps {
    info: string
}
// 全屏预览图功能组件
const PluginMaskImage = memo((props: PluginMaskImageProps) => {
    const {info} = props

    const [imgSize, setImgSize] = useState<number>(0)
    const [width, setWidth, getWidth] = useGetState<number>(540)
    const [height, setHeight, getHeight] = useGetState<number>(330)

    const expandSize = useMemoizedFn(() => {
        if (imgSize >= 3) return false
        setWidth(width + 160)
        setHeight(height + 130)
        setImgSize(imgSize + 1)
    })
    const narrowSize = useMemoizedFn(() => {
        if (imgSize <= 0) return false
        setWidth(width - 160)
        setHeight(height - 130)
        setImgSize(imgSize - 1)
    })
    const downloadImg = () => {
        alert(`图片下载成功`)
    }

    return (
        <>
            <div className='mask-display-icon-body'>
                <ZoomInOutlined className='display-icon' onClick={expandSize} />
                <ZoomOutOutlined className='display-icon display-icon-middle' onClick={narrowSize} />
                <DownloadOutlined className='display-icon' onClick={downloadImg} />
            </div>
            <img className='mask-disply-image' style={{width: getWidth(), height: getHeight()}} src={info as any} />
        </>
    )
})

interface PluginCommentChildModalProps {
    visible: boolean
    isLogin: boolean
    parentInfo?: API.CommentListData
    onReply: (info: API.CommentListData) => any
    onCancel: (visible: boolean) => any
}

interface CommentQueryProps extends API.PageMeta {
    root_id?: number
    plugin_id?: number
}

const PluginCommentChildModal = (props: PluginCommentChildModalProps) => {
    const {parentInfo, visible, onReply, onCancel, isLogin} = props

    const [hasMore, setHasMore] = useState<boolean>(false)
    const [loadingChild, setLoadingChild] = useState<boolean>(false)
    const [commentChildResponses, setCommentChildResponses] = useState<API.CommentListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit,
            total: 0,
            total_page: 0
        }
    })

    const onCommentChildCancel = useMemoizedFn(() => {
        setCommentChildResponses({
            data: [],
            pagemeta: {
                page: 1,
                limit,
                total: 0,
                total_page: 0
            }
        })
        onCancel(false)
    })
    const loadMoreData = useMemoizedFn(() => {
        if (commentChildResponses?.pagemeta?.page) {
            getChildComment(commentChildResponses?.pagemeta?.page + 1)
        }
    })
    // 全局监听是否刷新子评论列表状态
    const {commenData, setCommenData} = useCommenStore()
    // 获取子评论列表
    const getChildComment = useMemoizedFn((page: number = 1, payload: any = {}) => {
        const params = {
            root_id: parentInfo?.id,
            plugin_id: parentInfo?.plugin_id,
            limit,
            page,
            order_by: "created_at",
            ...payload
        }
        NetWorkApi<CommentQueryProps, API.CommentListResponse>({
            method: "get",
            url: "comment/reply",
            params
        })
            .then((res) => {
                const item = res
                const newCommentChildResponses = {
                    data: page === 1 ? item.data : commentChildResponses.data.concat(item.data),
                    pagemeta: item.pagemeta
                }
                const isMore = item.data.length < limit
                setHasMore(!isMore)
                setCommentChildResponses({
                    data: [...newCommentChildResponses.data],
                    pagemeta: item.pagemeta
                })
                // 刷新modal中子评论列表
                setCommenData({
                    isRefChildCommentList: false
                })
            })
            .catch((err) => {
                failed("评论查询失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoadingChild(false), 200)
            })
    })
    const onCommentChildStar = useMemoizedFn((childItem: API.CommentListData) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        const params = {
            comment_id: childItem.id,
            operation: childItem.is_stars ? "remove" : "add"
        }
        NetWorkApi<CommentStarsProps, API.ActionSucceeded>({
            method: "post",
            url: "comment/stars",
            params: params
        })
            .then((res) => {
                const index: number = commentChildResponses.data.findIndex(
                    (ele: API.CommentListData) => ele.id === childItem.id
                )
                if (index !== -1) {
                    if (childItem.is_stars) {
                        commentChildResponses.data[index].like_num -= 1
                        commentChildResponses.data[index].is_stars = false
                    } else {
                        commentChildResponses.data[index].like_num += 1
                        commentChildResponses.data[index].is_stars = true
                    }
                    setCommentChildResponses({
                        ...commentChildResponses,
                        data: [...commentChildResponses.data]
                    })
                }
            })
            .catch((err) => {
                failed("点赞失败:" + err)
            })
            .finally(() => {})
    })
    useEffect(() => {
        if (!commenData.isRefChildCommentList) return
        if (!parentInfo) return
        const refParams = {
            root_id: parentInfo?.id,
            plugin_id: parentInfo?.plugin_id
        }
        getChildComment(1, refParams)
    }, [commenData.isRefChildCommentList])
    useEffect(() => {
        if (visible) {
            setLoadingChild(true)
            getChildComment(1)
        }
    }, [visible])
    if (!parentInfo) return <></>
    return (
        <Modal visible={visible} onCancel={onCommentChildCancel} footer={null} width='70%' centered>
            <div id='scroll-able-div' className='comment-child-body'>
                <PluginCommentInfo
                    key={parentInfo.id}
                    info={parentInfo}
                    isOperation={false}
                    onStar={() => {}}
                    onReply={() => {}}
                />
                <div className='child-comment-list'>
                    {/* @ts-ignore */}
                    <InfiniteScroll
                        dataLength={commentChildResponses?.pagemeta?.total || 0}
                        key={commentChildResponses?.pagemeta?.page}
                        next={loadMoreData}
                        hasMore={hasMore}
                        loader={
                            <div className='vertical-center'>
                                <LoadingOutlined />
                            </div>
                        }
                        endMessage={
                            (commentChildResponses?.pagemeta?.total || 0) > 0 && (
                                <div className='row-cneter'>暂无更多数据</div>
                            )
                        }
                        scrollableTarget='scroll-able-div'
                    >
                        <List
                            dataSource={commentChildResponses.data || []}
                            loading={loadingChild}
                            renderItem={(childItem) => (
                                <>
                                    <PluginCommentInfo
                                        key={childItem.id}
                                        info={childItem}
                                        onReply={onReply}
                                        onStar={onCommentChildStar}
                                        isStarChange={childItem.is_stars}
                                    ></PluginCommentInfo>
                                    <div className='comment-separator'></div>
                                </>
                            )}
                        />
                    </InfiniteScroll>
                </div>
            </div>
        </Modal>
    )
}
