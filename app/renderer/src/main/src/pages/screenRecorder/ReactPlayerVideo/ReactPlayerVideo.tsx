import {FastForwardIcon, RewindIcon} from "@/assets/newIcon"
import {Tooltip} from "antd"
import React, {useEffect, useRef, useState} from "react"

import {
    Player,
    ControlBar,
    BigPlayButton,
    PlayToggle, // PlayToggle 播放/暂停按钮 若需禁止加 disabled
    ReplayControl, // 后退按钮
    ForwardControl, // 前进按钮
    CurrentTimeDisplay,
    TimeDivider,
    PlaybackRateMenuButton, // 倍速播放选项
    VolumeMenuButton
} from "video-react"
import "video-react/dist/video-react.css" // import css
import styles from "./ReactPlayerVideo.module.scss"
import classNames from "classnames"
import 'hint.css';

interface ReactPlayerVideoProps {
    title: string
    url: string
    isPre?: boolean
    isNext?: boolean
    onPreClick?: () => void
    onNextClick?: () => void
}
export const ReactPlayerVideo: React.FC<ReactPlayerVideoProps> = React.memo((props) => {
    const {url, title, isPre, isNext, onPreClick, onNextClick} = props
    const [error, setError] = useState<string>()
    const playerRef = useRef<any>()
    useEffect(() => {
        if (!playerRef.current) return
        playerRef.current.load()
        setTimeout(() => {
            setError(playerRef.current?.getState()?.player?.error)
        }, 100)
    }, [url])
    return (
        <div className={styles["player-wrapper"]}>
            <div className={styles["player-title"]}>
                <div className='content-ellipsis'>{title}</div>
            </div>
            <Player
                ref={playerRef}
                autoPlay={true}
                playsInline={true}
                src={url}
                // poster='https://video-react.js.org/assets/poster.png'
                className={styles["player-video"]}
            >
                <BigPlayButton position='center' />
                {error && <div className={styles["player-video-tip"]}>该视频文件不可播放</div>}
                <ControlBar autoHide={true} disableDefaultControls={false} className={styles["player-control-bar"]}>
                    <div className={isPre ? "hint--top-right" : ""} aria-label='上一个'>
                        <RewindIcon
                            className={classNames(styles["bar-icon"], {
                                [styles["not-allowed-icon"]]: !isPre
                            })}
                            onClick={() => {
                                if (!isPre) return
                                if (onPreClick) onPreClick()
                            }}
                        />
                    </div>
                    <PlayToggle
                        className={classNames({
                            [styles["not-allowed-icon"]]: error
                        })}
                    />
                    <div className={isNext ? "hint--top" : ""} aria-label='下一个'>
                        <FastForwardIcon
                            className={classNames(styles["bar-icon"], {
                                [styles["not-allowed-icon"]]: !isNext
                            })}
                            onClick={() => {
                                if (!isNext) return
                                if (onNextClick) onNextClick()
                            }}
                            style={{marginRight: "0.5em"}}
                        />
                    </div>
                    <CurrentTimeDisplay order={4.1} />
                    <TimeDivider order={4.2} />
                    <PlaybackRateMenuButton rates={[3, 2.5, 2, 1.5, 1, 0.75, 0.5]} order={7.1} />
                    <VolumeMenuButton disabled />
                </ControlBar>
            </Player>
        </div>
    )
})
