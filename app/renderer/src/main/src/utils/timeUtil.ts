import moment from "moment";

export const formatTimestamp = (i: number) => {
    return moment.unix(i).format("YYYY-MM-DD HH:mm:ss")
}

export const formatDate = (i: number) => {
    return moment.unix(i).format("YYYY-MM-DD")
}