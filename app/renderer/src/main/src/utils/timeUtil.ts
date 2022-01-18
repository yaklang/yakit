import moment from "moment";

export const formatTimestamp = (i: number, onlyTime?: boolean) => {
    if (onlyTime) {
        return formatTime(i)
    }
    return moment.unix(i).format("YYYY-MM-DD HH:mm:ss")
}

export const formatTime = (i: number) => {
    return moment.unix(i).format("HH:mm:ss")
}

export const formatDate = (i: number) => {
    return moment.unix(i).format("YYYY-MM-DD")
}