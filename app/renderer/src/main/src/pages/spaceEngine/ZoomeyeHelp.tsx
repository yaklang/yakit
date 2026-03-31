import React from "react"
import styles from "./SpaceEnginePage.module.scss"
import fingerprint from "./fingerprint.png"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export const ZoomeyeHelp: React.FC = React.memo(() => {
    const {t} = useI18nNamespaces(["spaceEngine"])
    return (
        <div className={styles["zoomeye-help-body"]}>
            <h1>{t("ZoomeyeHelp.searchGuideTitle")}</h1>
            <ol>
                <li>{t("ZoomeyeHelp.searchGuideItem1")}</li>
                <li>{t("ZoomeyeHelp.searchGuideItem2")}</li>
                <li>{t("ZoomeyeHelp.searchGuideItem3")}</li>
                <li>{t("ZoomeyeHelp.searchGuideItem4")}</li>
            </ol>
            <h1>{t("ZoomeyeHelp.logicTitle")}</h1>
            <ol>
                <li>
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.logicOr")}</span>
                    {t("ZoomeyeHelp.logicOrDesc")}
                </li>
                <li>
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.logicAnd")}</span>
                    {t("ZoomeyeHelp.logicAndDesc")}
                </li>
                <li>
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.logicNot")}</span>
                    {t("ZoomeyeHelp.logicNotDesc")}
                </li>
                <li>
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.logicPriority")}</span>
                    {t("ZoomeyeHelp.logicPriorityDesc")}
                </li>
            </ol>
            <h1>{t("ZoomeyeHelp.geoTitle")}</h1>
            <ol>
                <li>
                    {t("ZoomeyeHelp.geoItem1Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.geoCountry")}</span>
                    {t("ZoomeyeHelp.geoItem1Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.geoCountryQuery")}</span>
                    {t("ZoomeyeHelp.geoItem1Note")}
                </li>
                <li>
                    {t("ZoomeyeHelp.geoItem2Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.geoRegion")}</span>
                    {t("ZoomeyeHelp.geoItem2Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.geoRegionQuery")}</span>
                    {t("ZoomeyeHelp.geoItem2Note")}
                </li>
                <li>
                    {t("ZoomeyeHelp.geoItem3Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.geoCity")}</span>
                    {t("ZoomeyeHelp.geoItem3Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.geoCityQuery")}</span>
                    {t("ZoomeyeHelp.geoItem3Note")}
                </li>
            </ol>
            <h1>{t("ZoomeyeHelp.certTitle")}</h1>
            <p>
                {t("ZoomeyeHelp.certPrefix")}
                <span className={styles["text-red"]}>{t("ZoomeyeHelp.certSsl")}</span>
                {t("ZoomeyeHelp.certSuffix1")}
                <span className={styles["text-red"]}>{t("ZoomeyeHelp.certQuery")}</span>
                {t("ZoomeyeHelp.certSuffix2")}
            </p>
            <h1>{t("ZoomeyeHelp.ipDomainTitle")}</h1>
            <ol>
                <li>
                    {t("ZoomeyeHelp.ipDomainItem1Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.ipv4")}</span>
                    {t("ZoomeyeHelp.ipDomainItem1Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.ipv4Query")}</span>
                </li>
                <li>
                    {t("ZoomeyeHelp.ipDomainItem2Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.ipv6")}</span>
                    {t("ZoomeyeHelp.ipDomainItem2Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.ipv6Query")}</span>
                </li>
                <li>
                    {t("ZoomeyeHelp.ipDomainItem3Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.port")}</span>
                    {t("ZoomeyeHelp.ipDomainItem3Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.portQuery")}</span>
                    {t("ZoomeyeHelp.ipDomainItem3Note")}
                </li>
                <li>
                    {t("ZoomeyeHelp.ipDomainItem4Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.site")}</span>
                    {t("ZoomeyeHelp.ipDomainItem4Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.siteQuery")}</span>
                    {t("ZoomeyeHelp.ipDomainItem4Note")}
                </li>
                <li>
                    {t("ZoomeyeHelp.ipDomainItem5Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.org")}</span>
                    {t("ZoomeyeHelp.ipDomainItem5Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.orgQuery")}</span>
                    {t("ZoomeyeHelp.ipDomainItem5Note")}
                </li>
            </ol>
            <h1>{t("ZoomeyeHelp.fingerprintTitle")}</h1>
            <ol>
                <li>{t("ZoomeyeHelp.fingerprintItem1")}</li>
                <img src={fingerprint} alt={t("ZoomeyeHelp.fingerprintAlt")} />
                <li>
                    {t("ZoomeyeHelp.fingerprintItem2Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.serviceProtocol")}</span>
                    {t("ZoomeyeHelp.fingerprintItem2Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.serviceQuery")}</span>
                    {t("ZoomeyeHelp.fingerprintItem2Note")}
                </li>
                <li>
                    {t("ZoomeyeHelp.fingerprintItem3Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.router")}</span>
                    {t("ZoomeyeHelp.fingerprintItem3Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.routerQuery")}</span>
                    {t("ZoomeyeHelp.fingerprintItem3Note")}
                </li>
                <li>
                    {t("ZoomeyeHelp.fingerprintItem4Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.os")}</span>
                    {t("ZoomeyeHelp.fingerprintItem4Suffix")}
                    {t("ZoomeyeHelp.fingerprintItem4Note")}
                </li>
                <li>{t("ZoomeyeHelp.fingerprintItem5")}</li>
                <li>
                    {t("ZoomeyeHelp.fingerprintItem6Prefix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.industry")}</span>
                    {t("ZoomeyeHelp.fingerprintItem6Suffix")}
                    <span className={styles["text-red"]}>{t("ZoomeyeHelp.industryQuery")}</span>
                    {t("ZoomeyeHelp.fingerprintItem6Note")}
                </li>
            </ol>
            <h1>{t("ZoomeyeHelp.iconhashTitle")}</h1>
            <ol>
                <li>{t("ZoomeyeHelp.iconhashItem1")}</li>
                <li>{t("ZoomeyeHelp.iconhashItem2")}</li>
            </ol>
        </div>
    )
})
