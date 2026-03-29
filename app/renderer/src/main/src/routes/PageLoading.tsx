import React, {memo} from "react"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "./PageLoading.module.scss"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

interface PageLoadingProps {}

export const PageLoading: React.FC<PageLoadingProps> = memo((props) => {
    const {t} = useI18nNamespaces(["layout"])
    return (
        <div className={styles["page-loading-wrapper"]}>
            <div className={styles["page-loading-body"]}>
                <div className={styles["spin-body"]}>
                    <YakitSpin spinning={true} size='large'>
                        <div className={styles["page-loading-wrapper"]}></div>
                    </YakitSpin>
                </div>
                <div className={styles["spin-title-body"]}>{t("PageLoading.loading")}</div>
            </div>
        </div>
    )
})
