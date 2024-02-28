import React from "react"
import styles from "./SpaceEnginePage.module.scss"
import fingerprint from "./fingerprint.png"

export const ZoomeyeHelp: React.FC = React.memo(() => {
    return (
        <div className={styles["zoomeye-help-body"]}>
            <h1>一、搜索指南</h1>
            <ol>
                <li>
                    搜索范围覆盖设备(IPv4、IPv6)及网站(域名)，可以提交 URL 参数 t 进行指定类型 t=v4 为 IPv4，t=v6 为
                    IPv6，t=web 为域名（或可通过搜索结果侧栏点击对应搜索内容）。
                </li>

                <li>搜索字符串不区分大小写，直接输入搜索字符串会认定为“全局”进行匹配。</li>
                <li>搜索关键词，会从 http 等协议内容(包括 http 头、html 内容等)、ssl 证书、组件名等进行匹配搜索。</li>
                <li>
                    搜索字符串请使用引号（如"Cisco Systems"或'Cisco Systems'）， 如不然空格会认定为逻辑 or
                    运算符，如果搜索字符串里存在引号可以使用 \ 进行转义 比如: "a\"b",如果搜索字符串里存在括号可以使用 \
                    进行转义 比如: portinfo\(\)。
                </li>
            </ol>
            <h1>二、逻辑运算 </h1>
            <ol>
                <li>
                    <span className={styles["text-red"]}>"空格"表示"或" </span>，service:"ssh"
                    service:"http"搜索ssh或http协议的数据。
                </li>
                <li>
                    <span className={styles["text-red"]}>"+"表示"且" </span>，
                    device:"router"+after:"2020-01-01"搜索2020-01-01后路由器的数据。
                </li>
                <li>
                    <span className={styles["text-red"]}>"-"表示"非" </span>
                    ，country:"CN"-subdivisions:"beijing"搜索中国地区内除北京的数据。
                </li>
                <li>
                    <span className={styles["text-red"]}>"()"表示"优先处理" </span>，(country:"CN" -port:80)
                    (country:"US" -title:"404 Not Found")搜索中国排除port:80或美国排除"404 Not Found"的数据。
                </li>
            </ol>
            <h1>三、地理位置 </h1>
            <ol>
                <li>
                    搜索<span className={styles["text-red"]}>国家地区</span>资产：
                    <span className={styles["text-red"]}>country:"CN"</span>
                    （可以使用国家缩写，也可以使用中/英文全称如country:"中国"、country:"china"）
                </li>
                <li>
                    搜索相关<span className={styles["text-red"]}>指定行政区</span>的资产：
                    <span className={styles["text-red"]}>subdivisions:"sichuan"</span>
                    （中国省会支持中文及英文描述搜索如subdivisions:"四川" 、subdivisions:"sichuan"）
                </li>
                <li>
                    搜索相关<span className={styles["text-red"]}>城市</span>资产：
                    <span className={styles["text-red"]}>city:"chengdu"</span>
                    （中国城市支持中文及英文描述搜索如city:"chengdu"、city:"成都"）
                </li>
            </ol>
            <h1>四、证书搜索</h1>
            <p>
                搜索<span className={styles["text-red"]}>ssl证书</span>存在"google"字符串的资产：
                <span className={styles["text-red"]}>ssl："google"</span>（常常用来提过产品名及公司名搜索对应目标）
            </p>
            <h1>五、IP及域名信息相关搜索</h1>
            <ol>
                <li>
                    搜索指定<span className={styles["text-red"]}>IPv4地址</span>相关资产：
                    <span className={styles["text-red"]}>ip:"8.8.8.8"</span>
                </li>
                <li>
                    搜索指定<span className={styles["text-red"]}>IPv6</span>地址相关资产：
                    <span className={styles["text-red"]}>ip:"2600:3c00::f03c:91ff:fefc:574a"</span>
                </li>
                <li>
                    搜索相关<span className={styles["text-red"]}>端口</span>资产：
                    <span className={styles["text-red"]}>port:80</span>（目前不支持同时开放多端口目标搜索）
                </li>
                <li>
                    搜索<span className={styles["text-red"]}>域名</span>相关的资产：
                    <span className={styles["text-red"]}>site:baidu.com</span>（常常使用来搜索子域名匹配）
                </li>
                <li>
                    搜索相关<span className={styles["text-red"]}>组织</span>(Organization)的资产：
                    <span className={styles["text-red"]}>org:"北京大学" 或者organization:"北京大学"</span>
                    （常常用来定位大学、结构、大型互联网公司对应IP资产）
                </li>
            </ol>
            <h1>六、指纹相关搜索</h1>
            <ol>
                <li>
                    搜索思科ASA-SSL-VPN的设备：app："Cisco ASA SSL VPN"
                    （更多的app规则请参考"zoomeye.org/component"，导航功能为用户提供了已经收录好的常用网关、专用交换机、工控设备等常用设备的搜索语法。
                    在搜索框输入cisco等关键词会有相关app提示）
                </li>
                <img src={fingerprint} alt='指纹搜索' />
                <li>
                    搜索<span className={styles["text-red"]}>对应服务协议</span>的资产：
                    <span className={styles["text-red"]}>service:"ssh"</span>
                    （常见服务协议包括：http、ftp、ssh、telnet等等(其他服务可参考搜索结果域名侧栏聚合展示)）
                </li>
                <li>
                    搜索<span className={styles["text-red"]}>路由器</span>相关的设备类型：
                    <span className={styles["text-red"]}>device:"router"</span>
                    （常见类型包括router(路由器)、switch(交换机)、storage-misc(存储设备)等等（其他类型可参考搜索结果域名侧栏聚合展示））
                </li>
                <li>
                    搜索相关<span className={styles["text-red"]}>操作系统：os:"RouterOS"</span>
                    （常见系统包括Linux、Windows、RouterOS、IOS、JUNOS等等（其他系统可参考搜索结果域名侧栏聚合展示））
                </li>
                <li>搜索html内容里标题中存在"Cisco"的数据：title:"Cisco"</li>
                <li>
                    搜索<span className={styles["text-red"]}>行业类型</span>相关的资产：
                    <span className={styles["text-red"]}>industry:"政府"</span>
                    （常见的行业类型包括科技、能源、金融制造业等等（其他类型可结合org数据相互补充））
                </li>
            </ol>
            <h1>七、Iconhash </h1>
            <ol>
                <li>
                    通过 md5
                    方式对目标数据进行解析，根据图标搜索相关内容的资产：iconhash:"f3418a443e7d841097c714d69ec4bcb8"（搜索包含“google”图标的相关资产）
                </li>
                <li>
                    通过 mmh3
                    方式对目标数据进行解析，根据图标搜索相关内容的资产：iconhash:"1941681276"（搜索包含“amazon”图标的相关资产）
                </li>
            </ol>
        </div>
    )
})
