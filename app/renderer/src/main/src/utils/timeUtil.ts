import moment from "moment"

/** @name 将unix时间戳转换为 YYYY-MM-DD HH:mm:ss */
export const formatTimestamp = (i: number, onlyTime?: boolean) => {
    if (onlyTime) {
        return formatTime(i)
    }
    return moment.unix(i).format("YYYY-MM-DD HH:mm:ss")
}

/** @name 将unix时间戳转换为 HH:mm:ss */
export const formatTime = (i: number) => {
    return moment.unix(i).format("HH:mm:ss")
}

/** @name 将unix时间戳转换为 YYYY-MM-DD */
export const formatDate = (i: number) => {
    return moment.unix(i).format("YYYY-MM-DD")
}

/** @name 将时间戳转换为 YYYY-MM-DD HH:mm:ss */
export const formatTimeYMD = (time: number): string => {
    return moment(time).format("YYYY-MM-DD HH:mm:ss")
}

/** @name 将纳秒转换为 YYYY-MM-DD HH:mm:ss */
export const formatTimeNS = (time: number): string => {
    const timestampNs = BigInt(`${time}`)
    const divisor = BigInt(1000000) // 1e6

    const quotient = timestampNs / divisor
    const remainder = timestampNs % divisor

    const timestampMs = Number(quotient) + Number(remainder) / 1e6

    return moment(timestampMs).format("YYYY-MM-DD HH:mm:ss")
}

// 24小时内返回(X小时前) 超过返回(X天前) 再超过返回(正常日期)
export const formatTimestampJudge = (i: number) => {
    // 当前时间
    const now = moment()
    // 传入的时间戳转换为 moment 对象
    const time = moment(i)
    // 计算时间差
    const duration = moment.duration(now.diff(time))
    if (duration.asSeconds() < 60) {
        // 一分钟内
        return `${Math.floor(duration.asSeconds())} 秒前`
    } else if (duration.asMinutes() < 60) {
        // 一小时内
        return `${Math.floor(duration.asMinutes())} 分钟前`
    } else if (duration.asHours() < 24) {
        // 在24小时内
        return `${Math.floor(duration.asHours())} 小时前`
    } else if (duration.asDays() < 3) {
        // 超过24小时但少于3天
        return `${Math.floor(duration.asDays())} 天前`
    } else {
        // 超过3天
        return time.format("YYYY-MM-DD HH:mm:ss")
    }
}
