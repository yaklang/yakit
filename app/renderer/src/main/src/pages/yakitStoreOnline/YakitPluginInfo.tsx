import React, {memo, useEffect, useRef, useState} from "react"
import {Input, Button, Divider, Upload} from "antd"
import {
    StarOutlined,
    StarFilled,
    ArrowLeftOutlined,
    PlusCircleOutlined,
    DownloadOutlined,
    PictureOutlined
} from "@ant-design/icons"
import {YakScript} from "../invoker/schema"
import {useGetState, useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {failed} from "../../utils/notification"
import {TagColor} from "./YakitStoreOnline"
import {CollapseParagraph} from "./CollapseParagraph"
import {OnlineCommentIcon, OnlineThumbsUpIcon} from "@/assets/icons"

import "./YakitPluginInfo.scss"

const {ipcRenderer} = window.require("electron")

export interface YakitPluginInfoProp {
    info: YakScript
    onBack: () => any
    index: number
    isAdmin: boolean
}

export const YakitPluginInfo: React.FC<YakitPluginInfoProp> = (props) => {
    const {info, onBack, index, isAdmin} = props

    const [commentText, setCommentText] = useState<string>("")
    const [files, setFiles, getFiles] = useGetState<{name: string; path: string | ArrayBuffer | null}[]>([])

    return (
        <div className='yakit-plugin-info-container'>
            <div
                className='plugin-info-width plugin-info-body'
                style={{padding: isAdmin ? "16px 8px 76px 0" : "16px 8px 4px 0"}}
            >
                <div className='vertical-center info-back' onClick={onBack}>
                    <ArrowLeftOutlined />
                    <span style={{marginLeft: 4}}>返回首页</span>
                </div>

                <div className='info-header'>
                    <div className='header-title-body'>
                        <span className='content-ellipsis title-body-text' title={info.ScriptName}>
                            {info.ScriptName}
                        </span>
                        {isAdmin && (
                            <div className='vertical-center'>
                                <div
                                    className={`${
                                        TagColor[["failed", "success", "not"][index % 3]].split("|")[0]
                                    } title-body-admin-tag`}
                                >
                                    {TagColor[["failed", "success", "not"][index % 3]].split("|")[1]}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='header-btn-body'>
                        <Button
                            className='btn-like'
                            icon={
                                index % 5 === 4 ? (
                                    <StarFilled className='solid-star' />
                                ) : (
                                    <StarOutlined className='empty-star' />
                                )
                            }
                        >
                            喜欢
                        </Button>
                        <Button className='btn-add' icon={<PlusCircleOutlined />}>
                            添加
                        </Button>
                    </div>
                </div>

                <div className='info-preface'>
                    <div className='preface-author'>
                        <img
                            src='https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg'
                            className='author-img'
                        />
                        <div className='vertical-center' style={{marginLeft: 8}}>
                            <span className='author-name'>{info.Author || "anonymous"}</span>
                        </div>
                    </div>

                    <Divider className='preface-divider' type='vertical' />

                    <div className='vertical-center'>
                        <div className='preface-time'>
                            <span className='time-title'>最新更新时间</span>
                            <span className='time-style'>{"2022/04/12"}</span>
                        </div>
                    </div>

                    <div className='preface-star-and-download' style={{margin: "0 24px 0 26px"}}>
                        <div className='vertical-center'>
                            <StarOutlined className='star-download-icon' />
                        </div>
                        <div className='vertical-center'>
                            <span className='star-download-num'>{index * 7 + 3}</span>
                        </div>
                    </div>

                    <div className='preface-star-and-download'>
                        <div className='vertical-center'>
                            <DownloadOutlined className='star-download-icon' />
                        </div>
                        <div className='vertical-center'>
                            <span className='star-download-num'>{index * 7 + 3}</span>
                        </div>
                    </div>
                </div>

                <div className='info-summary'>
                    <div className='summary-introduce'>
                        <div className='introduce-title'>概述</div>

                        <div className='introduce-content'>
                            <CollapseParagraph value={info.Help} isLine={true} rows={3}></CollapseParagraph>
                        </div>
                    </div>

                    {/* <div style={{marginTop: 24}}></div> */}
                </div>

                <div className='info-comment-box'>
                    <div className='box-header'>
                        <span className='header-title'>用户评论</span>
                        <span className='header-subtitle'>{index + 102}</span>
                    </div>

                    <div className='box-input'>
                        <Input.TextArea
                            className='input-stlye'
                            value={commentText}
                            autoSize={{minRows: 1, maxRows: 6}}
                            placeholder='说点什么...'
                            onChange={(e) => setCommentText(e.target.value)}
                        ></Input.TextArea>
                    </div>

                    {files.length !== 0 && (
                        <div className='box-upload'>
                            {files.map((item, index) => {
                                return (
                                    <div className='upload-img-opt'>
                                        <img key={item.name} src={item.path as any} className='opt-pic' />
                                        <div
                                            className='opt-del'
                                            onClick={() => {
                                                const arr = cloneDeep(getFiles())
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
                        <Upload
                            accept='image/jpeg,image/png,image/jpg,image/gif'
                            multiple={true}
                            disabled={getFiles().length >= 3}
                            showUploadList={false}
                            beforeUpload={(file: any) => {
                                if (file) {
                                    if (getFiles().length >= 3) return false
                                    var reader = new FileReader()
                                    reader.readAsDataURL(file)
                                    reader.onload = () => {
                                        if (reader.result) {
                                            setFiles(getFiles().concat([{name: file.name, path: reader.result}]))
                                        }
                                    }
                                }
                                return false
                            }}
                        >
                            <Button
                                type='link'
                                disabled={getFiles().length >= 3}
                                icon={
                                    <PictureOutlined
                                        className={getFiles().length >= 3 ? "btn-pic-disabled" : "btn-pic"}
                                    />
                                }
                            />
                        </Upload>

                        <Button
                            disabled={!commentText && getFiles().length === 0}
                            type={commentText ? "primary" : undefined}
                            className={commentText ? "" : "btn-submit"}
                        >
                            评论
                        </Button>
                    </div>
                </div>

                <div className='info-comment-content'>
                    {[
                        {
                            name: 1,
                            value: [
                                {name: 2, value: 1},
                                {name: 3, value: 2}
                            ]
                        },
                        {name: 4, value: 1},
                        {name: 5, value: 1}
                    ].map((item, index) => {
                        return (
                            <div key={item.name}>
                                <PluginCommentInfo info={info} value={item.value}></PluginCommentInfo>
                                {index !== [1, 2, 3].length - 1 && <div className='comment-separator'></div>}
                            </div>
                        )
                    })}
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
                                <Button className='examine-reject'>不通过</Button>
                                <Button className='examine-adopt'>通过</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

interface PluginCommentInfoProps {
    info: YakScript
    value: number | {name: number; value: number}[]
}

const PluginCommentInfo = memo((props: PluginCommentInfoProps) => {
    const {info, value} = props

    return (
        <div className='plugin-comment-opt'>
            <div className='opt-author-img'>
                <img
                    src='https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg'
                    className='author-img-style'
                />
            </div>

            <div className='opt-comment-body'>
                <div className='comment-body-name'>{info.Author || "anonymous"}</div>

                <div className='comment-body-content'>
                    <CollapseParagraph
                        value={info.Help}
                        rows={2}
                        valueConfig={{className: "content-style"}}
                    ></CollapseParagraph>
                </div>

                <div className='comment-body-time-func'>
                    <div>
                        <span>{"2022/04/04  12:30"}</span>
                    </div>
                    <div className='func-comment-and-star'>
                        <div className='comment-and-star'>
                            {/* @ts-ignore */}
                            <OnlineCommentIcon className='icon-style' />
                            <span className='num-style'>{123}</span>
                        </div>
                        <div style={{marginLeft: 18}} className='comment-and-star'>
                            {/* @ts-ignore */}
                            <OnlineThumbsUpIcon className='icon-style' />
                            <span className='num-style'>{123}</span>
                        </div>
                    </div>
                </div>

                {Array.isArray(value) && (
                    <div className='comment-body-subcomment'>
                        {value.map((item, index) => {
                            return (
                                <div key={item.name}>
                                    <PluginCommentInfo info={info} value={item.value}></PluginCommentInfo>
                                    {index !== value.length - 1 && <div className='comment-separator'></div>}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
})
