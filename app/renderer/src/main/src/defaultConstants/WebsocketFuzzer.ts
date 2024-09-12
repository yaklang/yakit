import {WebsocketFuzzerPageInfoProps} from "@/store/pageInfo"
import {StringToUint8Array} from "@/utils/str"

export const defaultWebsocketFuzzerPageInfo: WebsocketFuzzerPageInfoProps = {
    wsTls: false,
    wsRequest: StringToUint8Array(`GET / HTTP/1.1
Host: echo.websocket.org
Accept-Language: zh-CN,zh;q=0.9
Sec-WebSocket-Key: zpRVZDnNfCd+sYVS/DnNug==
Accept-Encoding: gzip, deflate, br, zstd
Connection: Upgrade
Sec-WebSocket-Version: 13
Upgrade: websocket`),
    wsToServer: new Uint8Array()
}
