import React from "react"
import styles from "../guide-footer.module.scss"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

interface GuideFooterProps {
    step?: number
    onPrev?: () => void
    onNext?: () => void
    onFinish?: () => void
    stopList: Array<{
        title: string
        description: string
        images?: string
    }>
}

export const GuideFooter = ({step = 1, onPrev, onNext, onFinish, stopList}: GuideFooterProps) => {
    return (
        <div className={styles.wrapper}>
            {stopList?.[step - 1]?.images && <img src={stopList[step - 1].images} alt='' style={{width: "100%"}} />}

            <div className={styles.text}>
                <div className={styles.title}>{stopList?.[step - 1]?.title}</div>
                <div className={styles.describe}>{stopList?.[step - 1]?.description}</div>
            </div>

            <div className={styles.footer}>
                <div className={styles.dots}>
                    {Array.from({length: stopList.length}).map((_, i) => (
                        <span key={i} className={`${styles.dot} ${i + 1 === step ? styles.active : ""}`} />
                    ))}
                </div>

                <div className={styles.actions}>
                    {stopList.length === 1 && (
                        <YakitButton type='primary' onClick={onFinish}>
                            开始体验
                        </YakitButton>
                    )}

                    {stopList.length === 2 && step !== stopList.length && (
                        <YakitButton type='primary' onClick={onNext}>
                            下一个
                        </YakitButton>
                    )}

                    {stopList.length === 2 && step === stopList.length && (
                        <React.Fragment>
                            <YakitButton onClick={onPrev}>上一个</YakitButton>
                            <YakitButton type='primary' onClick={onFinish}>
                                开始体验
                            </YakitButton>
                        </React.Fragment>
                    )}

                    {stopList.length > 2 && step !== stopList.length && (
                        <React.Fragment>
                            {step !== 1 && <YakitButton onClick={onPrev}>上一个</YakitButton>}
                            <YakitButton type='primary' onClick={onNext}>
                                下一个
                            </YakitButton>
                        </React.Fragment>
                    )}

                    {stopList.length > 2 && step === stopList.length && (
                        <React.Fragment>
                            {step !== 1 && <YakitButton onClick={onPrev}>上一个</YakitButton>}
                            <YakitButton type='primary' onClick={onFinish}>
                                开始体验
                            </YakitButton>
                        </React.Fragment>
                    )}
                </div>
            </div>
        </div>
    )
}
