import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, memo} from "react"
import {NetWorkApi} from "@/services/fetch"
import {failed, warn} from "../../../utils/notification"
import {Space, Button, Upload, Input, List, Modal, Image} from "antd"
import {PictureOutlined, LoadingOutlined, ExclamationCircleOutlined} from "@ant-design/icons"
import numeral from "numeral"
import "./YakitPluginInfoOnline.scss"
import moment from "moment"
import cloneDeep from "lodash/cloneDeep"
import {useCommenStore} from "@/store/comment"
import InfiniteScroll from "react-infinite-scroll-component"
import {CollapseParagraph} from "./CollapseParagraph"
import {OnlineCommentIcon, OnlineThumbsUpIcon, OnlineSurfaceIcon} from "@/assets/icons"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import Login from "@/pages/Login"
import {fail} from "assert"

const {ipcRenderer} = window.require("electron")

const limit = 20

export interface DownloadOnlinePluginProps {
    OnlineID?: number
    UUID: string
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

export const PluginComment: React.FC<PluginCommentProps> = (props) => {
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
    useEffect(() => {
        if (!isLogin) {
            setFiles([])
            setCommentText("")
        }
    }, [isLogin])
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
                const isMore =
                    res.data.length < limit || newCommentResponses.data.length === commentResponses.pagemeta.total
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
    const isLoading = useMemoizedFn(() => {
        Modal.confirm({
            title: "未登录",
            icon: <ExclamationCircleOutlined />,
            content: "登录后才可评论",
            cancelText: "取消",
            okText: "登录",
            onOk() {
                setLoginShow(true)
            },
            onCancel() {}
        })
    })
    // 新增评论
    const pluginComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!isLogin) {
            isLoading()
            return
        }
        if (!commentText && files.length === 0) {
            failed("请输入评论内容或者上传图片")
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
    // 登录框状态
    const [loginshow, setLoginShow, getLoginShow] = useGetState<boolean>(false)
    const addComment = useMemoizedFn((data: API.NewComment) => {
        NetWorkApi<API.NewComment, API.ActionSucceeded>({
            method: "post",
            url: "comment",
            data
        })
            .then(() => {
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
        if (!isLogin) {
            isLoading()
            return
        }
        if (!currentComment?.id) return
        if (!commentInputText && commentFiles.length === 0) {
            failed("请输入评论内容或者上传图片")
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
            .then(() => {
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
    const onSetValue = useMemoizedFn((value) => {
        if (!isLogin) {
            isLoading()
            return
        }
        setCommentText(value)
    })
    return (
        <>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
            <div className='info-comment-box'>
                <div className='box-header'>
                    <span className='header-title'>用户评论</span>
                    <span className='header-subtitle'>{plugin.comment_num || 0}</span>
                </div>
                <PluginCommentInput
                    value={commentText}
                    setValue={onSetValue}
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
                    (commentResponses?.pagemeta?.total || 0) > 0 && (
                        <div className='row-cneter no-more-text'>暂无更多数据</div>
                    )
                }
                scrollableTarget='online-plugin-info-scroll'
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
                        <Image key={url + info.id} src={url as any} className='comment-pic' />
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
            .catch(() => {
                fail("图片上传失败")
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
                    // disabled={value || files.length !== 0 }
                    type='primary'
                    className={(value || files.length !== 0) && isLogin ? "" : "btn-submit"}
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
                                <Image key={item} src={item as any} className='opt-pic' />
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
                if (!res.data) {
                    res.data = []
                }
                const item = res
                const newCommentChildResponses = {
                    data: page === 1 ? item.data : commentChildResponses.data.concat(item.data),
                    pagemeta: item.pagemeta
                }
                const isMore =
                    item.data.length < limit ||
                    newCommentChildResponses.data.length === commentChildResponses.pagemeta.total
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
            .then(() => {
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
                                <div className='row-cneter no-more-text'>暂无更多数据</div>
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
