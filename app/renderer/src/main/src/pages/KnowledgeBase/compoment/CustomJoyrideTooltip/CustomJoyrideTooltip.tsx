import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {TooltipRenderProps} from "react-joyride"
import styles from "./custom-joyride-tooltip.module.scss"
import {YakitCloseSvgIcon} from "@/components/basics/icon"

export const CustomJoyrideTooltip = (props: TooltipRenderProps) => {
    const {index, size, step, backProps, primaryProps, closeProps, tooltipProps} = props

    return (
        <div {...tooltipProps} className={styles.customJoyrideTooltipContainer}>
            {/* Header / Title */}
            <div className={styles.joyrideStepsHeader}>
                <div className={styles.joyrideStepsHeaderBox}>
                    <div className={styles.joyrideStepsHeaderTitle}>{step.title}</div>
                    {/* 关闭按钮 */}
                    <YakitButton type='text2' {...closeProps}>
                        <YakitCloseSvgIcon />
                    </YakitButton>
                </div>
            </div>

            {/* Content */}
            <div className={styles.joyrideStepsContent}>{step.content}</div>

            {/* Footer */}
            <div className={styles.joyrideStepsFooter}>
                {/* 右下角：步骤 */}
                <div className={styles.joyrideStepsCounter}>
                    {index + 1}/{size}
                </div>

                {/* 左下角：按钮 */}
                <div className={styles.joyrideStepsButtons}>
                    {index > 0 && (
                        <YakitButton type='outline2' {...backProps}>
                            上一步
                        </YakitButton>
                    )}

                    <YakitButton {...primaryProps}>{index === size - 1 ? "开始创建" : "下一步"}</YakitButton>
                </div>
            </div>
        </div>
    )
}
