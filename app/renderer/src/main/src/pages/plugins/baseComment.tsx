import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, memo, Suspense, useRef} from "react"
import {useStore} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {failed, success, warn} from "@/utils/notification"
import {PageHeader, Space, Tooltip, Button, Empty, Tag, Tabs, Upload, Input, List, Modal, Spin, Image, Avatar} from "antd"
import {
    StarOutlined,
    StarFilled,
    DownloadOutlined,
    PictureOutlined,
    QuestionOutlined,
    LoadingOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons"
import numeral from "numeral"
import styles from "./baseComment.module.scss"
import moment from "moment"
import cloneDeep from "lodash/cloneDeep"
import {useCommenStore} from "@/store/comment"
import InfiniteScroll from "react-infinite-scroll-component"
import {OnlineCommentIcon, OnlineThumbsUpIcon, OnlineSurfaceIcon} from "@/assets/icons"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import {YakEditor} from "@/utils/editors"
import {YakScript} from "@/pages/invoker/schema"
import {GetReleaseEdition, isEnterpriseEdition} from "@/utils/envfile"
import Login from "@/pages/Login"
import {fail} from "assert"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import { CollapseParagraph } from "../yakitStore/YakitPluginInfoOnline/CollapseParagraph"
import classNames from "classnames"
import { UserPlatformType } from "../globalVariable"
import yakitImg from "@/assets/yakit.jpg"
import { randomAvatarColor } from "@/components/layout/FuncDomain"
import { YakitInput } from "@/components/yakitUI/YakitInput/YakitInput"
const {ipcRenderer} = window.require("electron")

const limit = 20
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
    const onSetValue = useMemoizedFn((value) => {
        if (!isLogin) {
            isLoading()
            return
        }
        setCommentText(value)
    })
  
    return (
        <div className={styles['comment-box']} id='online-plugin-info-scroll'>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
            <div className={styles['info-comment-box']}>
                <div className={styles['box-header']}>
                    <span className={styles['header-title']}>评论</span>
                    <span className={styles['header-subtitle']}>{plugin.comment_num || 0}</span>
                </div>
                <PluginCommentUpload isLogin={isLogin} files={files} setFiles={setFiles}/>
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
                    <div className={styles['vertical-center']}>
                        <LoadingOutlined />
                    </div>
                }
                endMessage={
                    (commentResponses?.pagemeta?.total || 0) > 0 && (
                        <div className={classNames(styles['row-cneter'],styles["no-more-text"])}>暂无更多数据</div>
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
                wrapClassName={styles['comment-reply-dialog']}
                title={<div className={styles['header-title']}>回复@{currentComment?.user_name}</div>}
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
                />
            </Modal>
            <SecondConfirm visible={commentSecondShow} onCancel={pluginCancelComment}></SecondConfirm>
        </div>
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
        <div className={styles['plugin-comment-opt']} key={key}>
            <div className={styles['opt-author-img']}>
                <img src={info.head_img} className={styles['author-img-style']}/>
            </div>

            <div className={styles['opt-comment-body']}>
                <div className={styles['comment-body-name']}>{info.user_name || "anonymous"}</div>

                <div className={styles['comment-body-content']}>
                    <CollapseParagraph value={`${info.message}`} rows={2} valueConfig={{className: "content-style"}}>
                        {info.by_user_name && (
                            <span>
                                回复<span className={styles['content-by-name']}>{info.by_user_name}</span>:
                            </span>
                        )}
                    </CollapseParagraph>
                </div>

                <div className={styles['comment-body-time-func']}>
                    <div>
                        <span>{moment.unix(info.created_at).format("YYYY-MM-DD HH:mm")}</span>
                    </div>
                    {isOperation && (
                        <div className={styles['func-comment-and-star']}>
                            <div className={styles['comment-and-star']} onClick={() => onReply(info)}>
                                {/* @ts-ignore */}
                                <OnlineCommentIcon className={classNames(styles['icon-style-comment'],styles['hover-active'])} />
                            </div>
                            <div
                                style={{marginLeft: 18}}
                                className={classNames(styles['hover-active'],styles['comment-and-star'])}
                                onClick={() => onStar(info)}
                            >
                                {/* @ts-ignore */}
                                {(isStarChange && <OnlineSurfaceIcon className={classNames(styles['hover-active'],styles['icon-style-start'])}
                                />) || (
                                    // @ts-ignore
                                    <OnlineThumbsUpIcon className={classNames(styles['hover-active'],styles['icon-style'])}/>
                                )}
                                <span
                                className={classNames(styles["hover-active"],styles['num-style'],{
                                [styles["num-style-active"]]: isStarChange,
                                }) }>
                                    {numeral(info.like_num).format("0,0")}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <Space>
                    {message_img.map((url) => (
                        <Image key={url + info.id} src={url as any} className={styles['comment-pic']} />
                    ))}
                </Space>
                {isOperation && info.reply_num > 0 && (
                    <a
                        className={styles['comment-reply']}
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

interface PluginCommentUploadProps {
    isLogin:boolean
    files: string[]
    setFiles: (files: string[]) => any
}

const PluginCommentUpload: React.FC<PluginCommentUploadProps> = (props) => {
    const {isLogin, files,setFiles} = props
    const {userInfo} = useStore()
    const {platform,companyHeadImg, companyName} = userInfo
    const avatarColor = useRef<string>(randomAvatarColor())
    const [filesLoading, setFilesLoading] = useState<boolean>(false)
    const uploadFiles = (file) => {
        setFilesLoading(true)
        ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                setFiles(files.concat(res.data))
            })
            .catch((err) => {
                fail("图片上传失败")
            })
            .finally(() => {
                setTimeout(() => setFilesLoading(false), 1)
            })
    }
    return(
    <div className={styles['plugin-comment-upload']}>
        <div className={styles['upload-author-img']}>
        {platform === "company" ? (
                                            <div>
                                            {companyHeadImg && !!companyHeadImg.length ? (
                                                <Avatar size={20} style={{cursor: "pointer"}} src={companyHeadImg} />
                                            ) : (
                                                <Avatar
                                                    size={20}
                                                    style={{backgroundColor: avatarColor.current}}
                                                    className={classNames(styles["judge-avatar-avatar"])}
                                                >
                                                    {companyName && companyName.slice(0, 1)}
                                                </Avatar>
                                            )}
                                        </div>
                                        ) : (
                                            <img
                                                src={
                                                    userInfo[UserPlatformType[platform || ""].img] || yakitImg
                                                }
                                                style={{width: 24, height: 24, borderRadius: "50%"}}
                                            />
                                        )}
        </div>
        <div className={styles['input-upload-box']}>
            <div className={styles['input-box']}></div>
            <YakitInput.TextArea
                // value={}
                autoSize={{minRows: 1, maxRows: 6}}
                placeholder='说点什么...'
                // onChange={(e) => setValue(e.target.value)}
            />
            <div className={styles['upload-box']}>
                <div className={styles['upload-box-left']}>
                    {isLogin &&<Upload
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
                        <YakitButton
                            loading={filesLoading}
                            disabled={files.length >= 3}
                            type="text2"
                            icon={<PictureOutlined className={classNames({
                            [styles["btn-pic-disabled"]]: files.length >= 3,
                            [styles["btn-pic"]]: files.length < 3,
                            }) }/>}
                        />
                    </Upload>}
                </div>
                            <div className={styles['upload-box-right']}>
                                <div className={styles['limit-count']}>0/150</div>
                                <YakitButton>提交反馈</YakitButton>
                            </div>
            </div>
        </div>
    </div>
    )
}

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
            .catch((err) => {
                fail("图片上传失败")
            })
            .finally(() => {
                setTimeout(() => setFilesLoading(false), 1)
            })
    }
    return (
        <div className={styles['plugin-info-comment-input']}>
            <div className={styles['box-input']}>
                <Input.TextArea
                    className={styles['input-stlye']}
                    value={value}
                    autoSize={{minRows: 1, maxRows: 6}}
                    placeholder='说点什么...'
                    onChange={(e) => setValue(e.target.value)}
                ></Input.TextArea>
            </div>
            <div className={styles['box-btn']}>
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
                            icon={<PictureOutlined className={classNames({
                            [styles["btn-pic-disabled"]]: files.length >= 3,
                            [styles["btn-pic"]]: files.length < 3,
                            }) }/>}
                        />
                    </Upload>
                )}
                <Button
                    // disabled={value || files.length !== 0 }
                    type='primary'
                    className={classNames({
                    [styles["btn-submit"]]: !((value || files.length !== 0) && isLogin),
                    }) }
                    onClick={onSubmit}
                    loading={loading}
                >
                    评论
                </Button>
            </div>
            {files.length !== 0 && (
                <div className={styles['box-upload']}>
                    {files.map((item, index) => {
                        return (
                            <div key={item} className={styles['upload-img-opt']}>
                                <Image key={item} src={item as any} className={styles['opt-pic']}/>
                                <div
                                    className={styles['opt-del']}
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
            <div id='scroll-able-div' className={styles['comment-child-body']}>
                <PluginCommentInfo
                    key={parentInfo.id}
                    info={parentInfo}
                    isOperation={false}
                    onStar={() => {}}
                    onReply={() => {}}
                />
                <div className={styles['child-comment-list']}>
                    {/* @ts-ignore */}
                    <InfiniteScroll
                        dataLength={commentChildResponses?.pagemeta?.total || 0}
                        key={commentChildResponses?.pagemeta?.page}
                        next={loadMoreData}
                        hasMore={hasMore}
                        loader={
                            <div className={styles['vertical-center']}>
                                <LoadingOutlined />
                            </div>
                        }
                        endMessage={
                            (commentChildResponses?.pagemeta?.total || 0) > 0 && (
                                <div className={classNames(styles['row-cneter'],styles['no-more-text'])}>暂无更多数据</div>
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
                                    />
                                </>
                            )}
                        />
                    </InfiniteScroll>
                </div>
            </div>
        </Modal>
    )
}
