import React, {memo, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {setRemoteValue} from "@/utils/kv"
import {Image} from "antd"
import {TextareaForImage} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType"
import {OutlineXIcon} from "@/assets/icon/outline"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import useListenWidth from "../hooks/useListenWidth"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"

import classNames from "classnames"
import styles from "./UtilsTemplate.module.scss"

interface RecycleOptFooterExtraProps {
    visible: boolean
    title: string
    content: string
    cacheKey: string
    onCallback: (isOk: boolean, cache: boolean) => any
}
/** @name 带不再提示选项的二次确认弹框*/
export const NoPromptHint: React.FC<RecycleOptFooterExtraProps> = memo((props) => {
    const {visible, title, content, cacheKey, onCallback} = props

    const [checked, setChecked] = useState<boolean>(false)
    const handleCallback = useMemoizedFn((isOK: boolean) => {
        const check = !!checked
        setChecked(false)
        if (isOK) {
            if (cacheKey && checked) {
                setRemoteValue(cacheKey, `${checked}`)
            }
            onCallback(true, check)
        } else {
            onCallback(false, false)
        }
    })

    const handleOK = useMemoizedFn(() => {
        handleCallback(true)
    })
    const handleCancel = useMemoizedFn(() => {
        handleCallback(false)
    })

    return (
        <YakitHint
            visible={visible}
            title={title || ""}
            content={content || ""}
            onOk={handleOK}
            onCancel={handleCancel}
            footerExtra={
                <YakitCheckbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
                    下次不再提醒
                </YakitCheckbox>
            }
        />
    )
})

interface ImagePreviewListProps {
    /** 图片资源集合 */
    imgs: TextareaForImage[]
    setImgs?: React.Dispatch<React.SetStateAction<TextareaForImage[]>>
    /** 是否带删除功能 */
    isDel?: boolean
    /** 返回执行删除操作的状态 */
    setDelLoading?: (loading: boolean) => void
    onDel?: (url: string) => Promise<void>
}
/** @name 图片列表预览组件(横向排列) */
export const ImagePreviewList: React.FC<ImagePreviewListProps> = memo((props) => {
    const {isDel, imgs, setImgs, setDelLoading, onDel} = props

    const wrapperRef = useRef<HTMLDivElement>(null)
    const width = useListenWidth(wrapperRef)
    const imgList = useMemo(() => {
        const imgLength = imgs.length
        const col = Math.floor(width / 72)
        if (imgLength <= col) {
            return {
                show: [...imgs],
                surplus: []
            }
        } else {
            return {
                show: imgs.slice(0, col - 1),
                surplus: imgs.slice(col - 1)
            }
        }
    }, [width, imgs])

    // 正在删除的图片队列
    const [delImgs, setDelImgs] = useState<string[]>([])
    const handleDel = useMemoizedFn((url: string) => {
        if (!isDel) return
        if (!onDel) return
        const find = delImgs.includes(url)
        if (find) {
            setDelLoading && setDelLoading(true)
            return
        }

        let isLoading = true
        setDelImgs((arr) => arr.concat([url]))
        onDel(url)
            .then(() => {
                setDelImgs((pre) => {
                    const arr = pre.filter((item) => item !== url)
                    isLoading = !!arr.length
                    return [...arr]
                })
                setImgs && setImgs((pre) => pre.filter((item) => item.url !== url))
            })
            .catch(() => {
                setDelImgs((pre) => {
                    const arr = pre.filter((item) => item !== url)
                    isLoading = !!arr.length
                    return [...arr]
                })
            })
            .finally(() => {
                setDelLoading && setDelLoading(isLoading)
            })
    })

    // 预览
    const [preview, setPreview] = useState<boolean>(false)
    const current = useRef<number>(0)
    const handlePreview = useMemoizedFn((index: number) => {
        if (preview) return
        current.current = index
        setPopoverVisible(false)
        setPreview(true)
    })

    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)

    return (
        <>
            <div ref={wrapperRef} className={styles["image-preview-list"]}>
                {imgList.show.map((item, index) => {
                    const isLoading = isDel && delImgs.includes(item.url)
                    return (
                        <div
                            key={`${item.url}`}
                            className={classNames(styles["image-preview-list-opt"], {
                                [styles["loading"]]: isLoading
                            })}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        >
                            <Image key={item.url} src={item.url} className={styles["img-style"]} preview={false} />
                            <div className={styles["mask-spin"]}>
                                <YakitSpin spinning={true} tip='' wrapperClassName={styles["spin-style"]} />
                            </div>
                            <div
                                className={styles["mask-box"]}
                                onClick={() => {
                                    handlePreview(index)
                                }}
                            >
                                预览
                            </div>
                            {isDel && (
                                <div
                                    className={styles["img-close"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDel(item.url)
                                    }}
                                >
                                    <OutlineXIcon />
                                </div>
                            )}
                        </div>
                    )
                })}
                {imgList.surplus.length > 0 && (
                    <YakitPopover
                        trigger='click'
                        visible={popoverVisible}
                        content={
                            <div className={styles["popover-preview-list"]}>
                                {imgList.surplus.map((item, index) => {
                                    const isLoading = isDel && delImgs.includes(item.url)
                                    return (
                                        <div
                                            key={`${item.url}`}
                                            className={classNames(styles["image-preview-list-opt"], {
                                                [styles["loading"]]: isLoading
                                            })}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                        >
                                            <Image
                                                key={item.url}
                                                src={item.url}
                                                className={styles["img-style"]}
                                                preview={false}
                                            />
                                            <div className={styles["mask-spin"]}>
                                                <YakitSpin
                                                    spinning={true}
                                                    tip=''
                                                    wrapperClassName={styles["spin-style"]}
                                                />
                                            </div>
                                            <div
                                                className={styles["mask-box"]}
                                                onClick={() => {
                                                    handlePreview(index)
                                                }}
                                            >
                                                预览
                                            </div>
                                            {isDel && (
                                                <div
                                                    className={styles["img-close"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDel(item.url)
                                                    }}
                                                >
                                                    <OutlineXIcon />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        }
                        onVisibleChange={(visible) => {
                            setPopoverVisible(visible)
                        }}
                    >
                        <div className={classNames(styles["image-preview-list-opt-surplus"])}>
                            {imgList.surplus.length}
                        </div>
                    </YakitPopover>
                )}
            </div>

            {/* 图片预览 */}
            <div style={{display: "none"}}>
                <Image.PreviewGroup
                    preview={{
                        visible: preview,
                        onVisibleChange: (show) => {
                            setPreview(show)
                        },
                        current: current.current
                    }}
                >
                    {imgs.map((item) => {
                        return <Image src={item.url} />
                    })}
                </Image.PreviewGroup>
            </div>
        </>
    )
})
