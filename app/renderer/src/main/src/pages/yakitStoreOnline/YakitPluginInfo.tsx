import React, {memo, useEffect, useRef, useState} from "react"
import {Input, Button, Divider, Upload, Empty, Modal, List, Skeleton} from "antd"
import {
    StarOutlined,
    StarFilled,
    ArrowLeftOutlined,
    PlusCircleOutlined,
    DownloadOutlined,
    PictureOutlined,
    ZoomInOutlined,
    ZoomOutOutlined
} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import throttle from "lodash/throttle"
import cloneDeep from "lodash/cloneDeep"
import {failed, warn, success} from "../../utils/notification"
import {StarsOperation, TagColor} from "./YakitStoreOnline"
import {CollapseParagraph} from "./CollapseParagraph"
import {OnlineCommentIcon, OnlineThumbsUpIcon, OnlineSurfaceIcon} from "@/assets/icons"
import {PluginStoreProps, PagemetaProps} from "./YakitPluginInfo.d"
import {AutoSpin} from "@/components/AutoSpin"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import {showFullScreenMask} from "@/components/functionTemplate/showByContext"
import moment from "moment"
import numeral from "numeral"
import InfiniteScroll from "react-infinite-scroll-component"
import "./YakitPluginInfo.scss"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"

const {ipcRenderer} = window.require("electron")
const limit = 20
export interface YakitPluginInfoProp {
    info: API.YakitPluginDetail
    onBack: () => any
    index: number
    isAdmin: boolean
    isLogin: boolean
}
interface CommentResponsesProps {
    data: CommentListData[]
    pagemeta: PagemetaProps | null
}

interface SearchPluginDetailRequest {
    id: number
}

interface SearchCommentRequest {
    plugin_id: number
    limit: number
    page: number
}

interface CommentListData extends API.CommentListData {
    is_stars?: boolean
}

export const YakitPluginInfo: React.FC<YakitPluginInfoProp> = (props) => {
    const {info, onBack, index, isAdmin, isLogin} = props
    const listRef = useRef<any>({current: null})
    const [loading, setLoading] = useState<boolean>(false)
    const [commentLoading, setCommentLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useGetState<API.YakitPluginDetail>()
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [hasFetchComment, setHasFetchComment] = useState<boolean>(true)

    const [commentResponses, setCommentResponses] = useGetState<API.CommentListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit,
            total: 0,
            total_page: 0
        }
    })
    const [commentText, setCommentText] = useState<string>("")
    const [files, setFiles] = useState<string[]>([])

    const [commentShow, setCommentShow] = useState<boolean>(false)
    const [commentSecondShow, setCommentSencondShow] = useState<boolean>(false)
    const [currentComment, setCurrentComment] = useState<CommentListData | null>()
    const [commentInputText, setCommentInputText] = useState<string>("")
    const [commentFiles, setCommentFiles] = useState<string[]>([])

    const [commentChildVisible, setCommentChildVisible] = useState<boolean>(false)
    const [parentComment, setParentComment] = useState<CommentListData>()

    useEffect(() => {
        getPluginDetail()
        getComment(1)
    }, [])

    const getPluginDetail = useMemoizedFn(() => {
        let url = "yakit/plugin/detail-unlogged"
        if (isLogin) {
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

    const getComment = useMemoizedFn((page: number = 1) => {
        const params: SearchCommentRequest = {
            plugin_id: info.id,
            limit,
            page
        }
        NetWorkApi<SearchCommentRequest, API.CommentListResponse>({
            method: "get",
            url: "comment",
            params
        })
            .then((res) => {
                console.log("评论", res)
                const item = res
                const newCommentResponses = {
                    data: page === 1 ? item.data : commentResponses.data.concat(item.data),
                    pagemeta: item.pagemeta
                }
                if (item.data && item.data.length > 0) {
                    const isMore = item.data.length < limit
                    setHasMore(!isMore)
                    setCommentResponses({
                        data: [...newCommentResponses.data],
                        pagemeta: item.pagemeta
                    })
                } else {
                    setHasMore(false)
                }
            })
            .catch((err) => {
                failed("评论查询失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    const pluginStar = useMemoizedFn(() => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        if (!plugin) return
        const prams: StarsOperation = {
            id: plugin?.id,
            operation: plugin.is_stars ? "remove" : "add"
        }
        console.log("plugin.is_stars", plugin.is_stars, prams)
        NetWorkApi<StarsOperation, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/stars",
            params: prams
        })
            .then((res) => {
                // console.log("点赞", res)
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
                failed("点星:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    const pluginAdd = useMemoizedFn(() => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        alert("添加成功")
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

    const addComment = useMemoizedFn((params: any) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        setCommentLoading(true)
        ipcRenderer
            .invoke("add-plugin-comment", params)
            .then((res) => {
                if (params.parent_id === 0) getComment(1)
                if (commentText) setCommentText("")
                if (files.length > 0) setFiles([])
                if (commentInputText) setCommentInputText("")
                if (currentComment?.id) setCurrentComment(null)
                if (commentFiles.length > 0) setCommentFiles([])
                if (commentShow) setCommentShow(false)
            })
            .catch((e: any) => {
                failed("评论错误" + e)
            })
            .finally(() => {
                setTimeout(() => setCommentLoading(false), 200)
            })
    })

    const pluginReply = useMemoizedFn((item: CommentListData) => {
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
    const pluginCancelComment = useMemoizedFn((flag: number) => {
        if (flag === 2) {
            setCurrentComment(null)
            setCommentInputText("")
            setCommentFiles([])
            setCommentShow(false)
        }
        setCommentSencondShow(false)
    })

    const pluginCommentStar = useMemoizedFn((item: CommentListData) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        const params = {
            comment_id: item.id,
            operation: item.is_stars ? "remove" : "add"
        }
        ipcRenderer
            .invoke("add-plugin-comment-stars", params)
            .then((res) => {
                if (!commentResponses) return
                const index: number = commentResponses.data.findIndex((ele: CommentListData) => ele.id === item.id)
                if (index !== -1) {
                    if (item.is_stars) {
                        commentResponses.data[index].like_num -= 1
                        // commentResponses.data[index].is_stars = false
                    } else {
                        commentResponses.data[index].like_num += 1
                        // commentResponses.data[index].is_stars = true
                    }
                    setCommentResponses({
                        ...commentResponses,
                        data: [...commentResponses.data]
                    })
                }
            })
            .catch((e: any) => {
                failed("点赞失败" + e)
            })
            .finally(() => {})
    })

    const pluginExamine = useMemoizedFn((status: number) => {
        NetWorkApi<SearchCommentRequest, API.CommentListResponse>({
            method: "post",
            url: "yakit/plugin/audit"
            // data:{id: plugin?.id, status}
        })
            .then((res) => {
                console.log("审核", res)
            })
            .catch((err) => {
                failed("评论查询失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
        // setLoading(true)
        // ipcRenderer
        //     .invoke("fetch-plugin-audit", {id: plugin?.id, status})
        //     .then((res) => {
        //         if (plugin) setPlugin({...plugin, status})
        //         success(`插件审核${status === 1 ? "通过" : "不通过"}`)
        //     })
        //     .catch((e: any) => {
        //         failed("审核失败" + e)
        //     })
        //     .finally(() => {
        //         setTimeout(() => setLoading(false), 200)
        //     })
    })

    const onScrollCapture = (e) => {
        if (listRef && hasFetchComment && hasMore) {
            const dom = listRef.current
            const contentScrollTop = dom.scrollTop //滚动条距离顶部
            const clientHeight = dom.clientHeight //可视区域
            const scrollHeight = dom.scrollHeight //滚动条内容的总高度
            if (contentScrollTop + clientHeight >= scrollHeight - 200) {
                setHasFetchComment(false)
                const number = commentResponses?.pagemeta?.page || 0
                getComment(number + 1) // 获取数据的方法
            }
        }
    }
    const openCommentChildModel = (visible) => {
        setCommentChildVisible(visible)
    }

    if (!plugin) {
        return (
            <div className='yakit-plugin-info-container'>
                <Empty description='无插件信息' />
            </div>
        )
    }
    return (
        <AutoSpin spinning={loading}>
            {/* @ts-ignore */}

            <div className='yakit-plugin-info-container'>
                <div
                    className='plugin-info-width plugin-info-body'
                    style={{padding: isAdmin ? "16px 8px 76px 0" : "16px 8px 4px 0"}}
                    onScroll={onScrollCapture}
                    ref={listRef}
                >
                    <div className='vertical-center info-back' onClick={onBack}>
                        <ArrowLeftOutlined />
                        <span style={{marginLeft: 4}}>返回首页</span>
                    </div>

                    <div className='info-header'>
                        <div className='header-title-body'>
                            <span className='content-ellipsis title-body-text' title={plugin.script_name}>
                                {plugin.script_name}
                            </span>
                            {isAdmin && (
                                <div className='vertical-center'>
                                    <div
                                        className={`${
                                            TagColor[["not", "success", "failed"][plugin.status]].split("|")[0]
                                        } title-body-admin-tag`}
                                    >
                                        {TagColor[["not", "success", "failed"][plugin.status]].split("|")[1]}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className='header-btn-body'>
                            <Button
                                className='btn-like'
                                icon={
                                    plugin.is_stars ? (
                                        <StarFilled className='solid-star' />
                                    ) : (
                                        <StarOutlined className='empty-star' />
                                    )
                                }
                                onClick={pluginStar}
                            >
                                喜欢
                            </Button>
                            <Button className='btn-add' icon={<PlusCircleOutlined />} onClick={pluginAdd}>
                                添加
                            </Button>
                        </div>
                    </div>

                    <div className='info-preface'>
                        <div className='preface-author'>
                            <img src={plugin.head_img} className='author-img' />
                            <div className='vertical-center' style={{marginLeft: 8}}>
                                <span className='author-name'>{plugin.authors || "anonymous"}</span>
                            </div>
                        </div>

                        <Divider className='preface-divider' type='vertical' />

                        <div className='vertical-center'>
                            <div className='preface-time'>
                                <span className='time-title'>最新更新时间</span>
                                <span className='time-style'>
                                    {info?.updated_at && moment.unix(info.updated_at).format("YYYY年MM月DD日")}
                                </span>
                            </div>
                        </div>
                        <div className='preface-star-and-download' style={{margin: "0 24px 0 26px"}}>
                            <div onClick={pluginStar}>
                                {plugin.is_stars ? (
                                    <StarFilled className='solid-star' />
                                ) : (
                                    <StarOutlined className='star-download-icon' />
                                )}
                            </div>
                            <div className='vertical-center'>
                                <span className={`star-download-num ${plugin.is_stars && `star-download-num-active`}`}>
                                    {plugin.stars}
                                </span>
                            </div>
                        </div>

                        <div className='preface-star-and-download'>
                            <div className='vertical-center'>
                                <DownloadOutlined className='star-download-icon' />
                            </div>
                            <div className='vertical-center'>
                                <span className='star-download-num'>{plugin.downloaded_total}</span>
                            </div>
                        </div>
                    </div>

                    <div className='info-summary'>
                        <div className='summary-introduce'>
                            <div className='introduce-title'>概述</div>

                            <div className='introduce-content'>
                                <CollapseParagraph value={plugin.content} isLine={true} rows={3}></CollapseParagraph>
                            </div>
                        </div>
                    </div>

                    <div className='info-comment-box'>
                        <div className='box-header'>
                            <span className='header-title'>用户评论</span>
                            <span className='header-subtitle'>{commentResponses?.pagemeta?.total || 0}</span>
                        </div>
                        <PluginCommentInput
                            value={commentText}
                            setValue={setCommentText}
                            files={files}
                            setFiles={setFiles}
                            onSubmit={pluginComment}
                            loading={commentLoading}
                            isLogin={isLogin}
                        ></PluginCommentInput>
                    </div>
                    <div className='info-comment-content'>
                        {commentResponses?.data?.map((item: CommentListData, index) => (
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
                        ))}
                        {!hasFetchComment && hasMore && <Skeleton avatar paragraph={{rows: 1}} active />}
                        {!hasMore && (commentResponses?.pagemeta?.total || 0) > 0 && (
                            <div className='no-more-text padding-bottom-12'>It is all, nothing more 🤐</div>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className='plugin-info-examine'>
                        <div className='plugin-info-width info-examine-body'>
                            <div className='vertical-center'>
                                <div className='examine-title'>审核意见</div>
                            </div>
                            <div className='vertical-center'>
                                <div>
                                    <Button className='examine-reject' onClick={() => pluginExamine(2)}>
                                        不通过
                                    </Button>
                                    <Button className='examine-adopt' onClick={() => pluginExamine(1)}>
                                        通过
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <PluginCommentChildModal
                visible={commentChildVisible}
                parentInfo={parentComment}
                onReply={pluginReply}
                onCancel={(val) => {
                    setParentComment(undefined)
                    setCommentChildVisible(val)
                }}
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
        </AutoSpin>
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
    const uploadFiles = (file: any) => {
        setFilesLoading(true)
        ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                setFiles(files.concat(res.from))
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

            <div className='box-btn'>
                {isLogin && (
                    <Upload
                        accept='image/jpeg,image/png,image/jpg,image/gif'
                        method='post'
                        multiple={true}
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
                            return false
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
                    disabled={isLogin || !value}
                    type={value ? "primary" : undefined}
                    className={value || files.length !== 0 ? "" : "btn-submit"}
                    onClick={onSubmit}
                    loading={loading}
                >
                    评论
                </Button>
            </div>
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

interface PluginCommentInfoProps {
    info: CommentListData
    key: number
    isStarChange?: boolean
    onReply: (name: CommentListData) => any
    onStar: (name: CommentListData) => any
    openCommentChildModel?: (visible: boolean) => any
    setParentComment?: (name: CommentListData) => any
}
// 评论内容单条组件
const PluginCommentInfo = memo((props: PluginCommentInfoProps) => {
    const {info, onReply, onStar, key, isStarChange, openCommentChildModel, setParentComment} = props

    const message_img: string[] = (info.message_img && JSON.parse(info.message_img)) || []
    return (
        <div className='plugin-comment-opt' key={key}>
            <div className='opt-author-img'>
                <img src={info.head_img} className='author-img-style' />
            </div>

            <div className='opt-comment-body'>
                <div className='comment-body-name'>{info.user_name || "anonymous"}</div>

                <div className='comment-body-content'>
                    <CollapseParagraph value={info.message} rows={2} valueConfig={{className: "content-style"}}>
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
                </div>
                <div>
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
                </div>
                {info.reply_num > 0 && (
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

interface PluginCommentChildModalProps {
    visible: boolean
    parentInfo?: CommentListData
    onReply: (info: CommentListData) => any
    onCancel: (visible: boolean) => any
}

interface CommentQueryProps extends API.PageMeta {
    root_id?: number
    plugin_id?: number
}

const PluginCommentChildModal = (props: PluginCommentChildModalProps) => {
    const {parentInfo, visible, onReply, onCancel} = props

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
                // const item: API.CommentListResponse = (res?.from && JSON.parse(res.from)) || {
                //     data: [],
                //     pagemeta: {
                //         page: 1,
                //         limit,
                //         total: 0,
                //         total_page: 0
                //     }
                // }
                // if (!item.data) return
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
            })
            .catch((err) => {
                failed("评论查询失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoadingChild(false), 200)
            })
    })
    const onCommentChildStar = useMemoizedFn((childItem: CommentListData) => {
        const params = {
            comment_id: childItem.id,
            operation: childItem.is_stars ? "remove" : "add"
        }

        ipcRenderer
            .invoke("add-plugin-comment-stars", params)
            .then((res) => {
                const index: number = commentChildResponses.data.findIndex(
                    (ele: CommentListData) => ele.id === childItem.id
                )
                if (index !== -1) {
                    if (childItem.is_stars) {
                        commentChildResponses.data[index].like_num -= 1
                        // commentChildResponses.data[index].is_stars = false
                    } else {
                        commentChildResponses.data[index].like_num += 1
                        // commentChildResponses.data[index].is_stars = true
                    }
                    setCommentChildResponses({
                        ...commentChildResponses,
                        data: [...commentChildResponses.data]
                    })
                }
            })
            .catch((e: any) => {
                failed("点赞失败" + e)
            })
            .finally(() => {})
    })

    useEffect(() => {
        // 接收
        ipcRenderer.on("ref-comment-child-list", (_, data) => {
            if (!parentInfo) return
            const refParams = {
                root_id: parentInfo?.id,
                plugin_id: parentInfo?.plugin_id
            }
            getChildComment(1, refParams)
        })

        return () => {
            ipcRenderer.removeAllListeners("ref-comment-child-list")
        }
    }, [parentInfo])
    useEffect(() => {
        if (visible) {
            setLoadingChild(true)
            getChildComment(1)
        }
    }, [visible])
    return (
        <Modal visible={visible} onCancel={onCommentChildCancel} footer={null} width='70%' centered>
            <div id='scroll-able-div' className='comment-child-body'>
                {/* @ts-ignore */}
                <InfiniteScroll
                    dataLength={commentChildResponses?.pagemeta?.total || 0}
                    key={commentChildResponses?.pagemeta?.page}
                    next={loadMoreData}
                    hasMore={hasMore}
                    loader={<Skeleton avatar paragraph={{rows: 1}} active />}
                    endMessage={
                        (commentChildResponses?.pagemeta?.total || 0) > 0 && (
                            <div className='no-more-text'>It is all, nothing more 🤐</div>
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
                                    // isStarChange={childItem.is_stars}
                                ></PluginCommentInfo>
                                <div className='comment-separator'></div>
                            </>
                        )}
                    />
                </InfiniteScroll>
            </div>
        </Modal>
    )
}
