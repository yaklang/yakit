const {ipcMain, nativeImage, Notification, app} = require("electron")
const path = require("path")
const fs = require("fs")
const grpc = require("@grpc/grpc-js")
const protoLoader = require("@grpc/proto-loader")
const {serviceName} = require("./grpc_service");

const PROTO_DIR = path.join(__dirname, "../protos/")
const PROTO_FILES = fs.readdirSync(PROTO_DIR)
    .filter((filename) => filename.endsWith(".proto"))
    .map((filename) => path.join(PROTO_DIR, filename));
const packageDefinition = protoLoader.loadSync(PROTO_FILES, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
})

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
const {ypb} = protoDescriptor

// 获取所有的 service
// for (let serviceName in ypb) {
//     // Check if this object is a service
//     if (serviceName].service) {
//         console.log(serviceName);
//     }
// }

const global = {
    defaultYakGRPCAddr: "127.0.0.1:8087",
    password: "",
    caPem: ""
}

let _clients = {}

const options = {
    "grpc.max_receive_message_length": 1024 * 1024 * 1000,
    "grpc.max_send_message_length": 1024 * 1024 * 1000,
    "grpc.enable_http_proxy": 0,
}

function newClient(apiName) {
    const md = new grpc.Metadata()
    md.set("authorization", `bearer ${global.password}`)
    let Api = ypb[apiName];  // Assuming the APIs are global
    console.log("new service ",apiName)
    if (global.caPem !== "") {
        const creds = grpc.credentials.createFromMetadataGenerator((params, callback) => {
            return callback(null, md)
        })
        return new Api(
            global.defaultYakGRPCAddr,
            // grpc.credentials.createInsecure(),
            grpc.credentials.combineChannelCredentials(
                grpc.credentials.createSsl(Buffer.from(global.caPem, "latin1"), null, null, {
                    checkServerIdentity: (hostname, cert) => {
                        return undefined
                    }
                }),
                creds
            ),
            options
        )
    } else {
        return new Api(global.defaultYakGRPCAddr, grpc.credentials.createInsecure(), options)
    }
}

function getClient(apiName, createNew) {
    if (!!createNew) {
        return newClient(apiName)
    }

    if (!_clients[apiName]) {
        _clients[apiName] = newClient(apiName)
    }

    return _clients[apiName]
}

/**
 * @name 测试远程连接引擎是否成功
 * @param {Object} params
 * @param {String} params.host 域名
 * @param {String} params.port 端口
 * @param {String} params.caPem 证书
 * @param {String} params.password 密钥
 */
function testRemoteClient(params, callback) {
    const {host, port, caPem, password} = params

    const md = new grpc.Metadata()
    md.set("authorization", `bearer ${password}`)
    const creds = grpc.credentials.createFromMetadataGenerator((params, callback) => {
        return callback(null, md)
    })
    let YakApi = ypb[serviceName.YakApi]
    const yak = !caPem
        ? new YakApi(`${host}:${port}`, grpc.credentials.createInsecure(), options)
        : new YakApi(
            `${host}:${port}`,
            // grpc.credentials.createInsecure(),
            grpc.credentials.combineChannelCredentials(
                grpc.credentials.createSsl(Buffer.from(caPem, "latin1"), null, null, {
                    checkServerIdentity: (hostname, cert) => {
                        return undefined
                    }
                }),
                creds
            ),
            options
        )

    yak.Echo({text: "hello yak? are u ok?"}, callback)
}

module.exports = {
    testRemoteClient,
    clearing: () => {
        require("./handlers/yakLocal").clearing()
    },
    registerIPC: (win) => {
        ipcMain.handle("relaunch", () => {
            app.relaunch({})
            app.exit(0)
        })

        ipcMain.handle("yakit-connect-status", () => {
            return {
                addr: global.defaultYakGRPCAddr,
                isTLS: !!global.caPem
            }
        })

        // asyncEcho wrapper
        const asyncEcho = (params) => {
            return new Promise((resolve, reject) => {
                getClient(serviceName.YakApi).Echo(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("Echo", async (e, params) => {
            return await asyncEcho(params)
        })

        /** 获取 yaklang引擎 配置参数 */
        ipcMain.handle("fetch-yaklang-engine-addr", () => {
            return {
                addr: global.defaultYakGRPCAddr,
                isTLS: !!global.caPem
            }
        })

        /** 登录相关监听 */
        require("./handlers/userInfo")(win)


        /** 注册本地缓存数据查改通信 */
        require("./localCache").register()
        /** 启动、连接引擎 */
        require("./handlers/engineStatus")(
            win,
            (addr, pem, password) => {
                // 清空老数据
                for (let apiName in _clients) {
                    if (_clients[apiName]) {
                        console.log("close ", apiName)
                        _clients[apiName].close();
                    }
                }
                _clients = {};

                // 设置新引擎参数
                global.defaultYakGRPCAddr = addr
                global.caPem = pem
                global.password = password
            },
            () => getClient(serviceName.YakApi),
            () => newClient(serviceName.YakApi),
        )

        require("./handlers/misc_handles")(win)
        require("./handlers/file_operation")(win)

        require("./handlers/exec_yak_script_api")(win, () => getClient(serviceName.ExecYakScriptApi))

        require("./handlers/open_port_api")(win, () => getClient(serviceName.YakApi))

        require("./handlers/mitm_api")(win,
            () => getClient(serviceName.MITMApi),
            () => getClient(serviceName.MITMReplacerApi),
            () => getClient(serviceName.MITMExtractedDataApi),
            () => getClient(serviceName.MITMFilterApi)
        )
        require("./handlers/http_flow_api")(win, () => getClient(serviceName.HTTPFlowApi))
        require("./handlers/fuzzer_api")(win, () => getClient(serviceName.FuzzerApi))
        require("./handlers/analyzer_api")(win, () => getClient(serviceName.AnalyzerApi))
        require("./handlers/codec_api")(win, () => getClient(serviceName.CodecApi))
        require("./handlers/yakLocal").register()
        require("./handlers/openWebsiteByChrome")()
        require("./handlers/yak_script_api")(win, () => getClient(serviceName.YakScriptApi))
        require("./handlers/payloads_api")(win, () => getClient(serviceName.PayloadsApi))
        require("./handlers/completion_api")(win, () => getClient(serviceName.CompletionApi))
        try {
            require("./handlers/port_scan_api")(win, () => getClient(serviceName.PortScanApi))
        } catch (e) {
            console.log(e)
        }
        require("./handlers/brute_api")(win, () => getClient(serviceName.BruteApi))
        // start chrome manager
        try {
            require("./handlers/chromelauncher")()
        } catch (e) {
            console.info("Import chrome launcher failed")
            console.error(e)
        }

        //assets
        require("./handlers/assets_api")(win, () => getClient(serviceName.AssetsApi))

        // 加载更多的 menu
        require("./handlers/menu_api")(win, () => getClient(serviceName.MenuApi))

        // 管理 yak 引擎版本 / 升级等
        const upgradeUtil = require("./handlers/upgradeUtil")
        upgradeUtil
            .initial()
            .then(() => {
                upgradeUtil.register(win)
            })
            .catch((e) => {
                new Notification({
                    title: "Loading upgradeUtil.js failed",
                    body: `${e}`,
                    icon: nativeImage.createEmpty(),
                    urgency: "critical"
                }).show()
            })

        // require("./handlers/version")(win, getClient)
        // attach
        require("./handlers/attach_api")(win, () => getClient(serviceName.AttachApi))
        // chaos maker
        require("./handlers/chaos_maker_api")(win, () => getClient(serviceName.ChaosMakerApi))
        // crawler
        require("./handlers/crawler_api")(win, () => getClient(serviceName.CrawlerApi))
        // cve
        require("./handlers/cve_api")(win, () => getClient(serviceName.CVEApi))
        // document
        require("./handlers/document_api")(win, () => getClient(serviceName.DocumentApi))
        // ysoserial
        require("./handlers/ysoserial_go_api")(win, () => getClient(serviceName.YsoSerialGoApi))
        // generate code
        require("./handlers/generate_code_api")(win, () => getClient(serviceName.GenerateCodeApi))
        // proxy
        require("./handlers/proxy_api")(win, () => getClient(serviceName.ProxyApi))
        // report
        require("./handlers/report_api")(win, () => getClient(serviceName.ReportApi))
        // risks
        require("./handlers/risks_api")(win, () => getClient(serviceName.RisksApi))
        // screen recorder
        require("./handlers/screen_recorder_api")(win, () => getClient(serviceName.ScreenRecorderApi))
        // system proxy
        require("./handlers/system_proxy_api")(win, () => getClient(serviceName.SystemProxyApi))
        // update
        require("./handlers/update_api")(win, () => getClient(serviceName.UpdateApi))
        // websocket
        require("./handlers/websocket_api")(win, () => getClient(serviceName.WebSocketApi))
        // yak shell
        require("./handlers/yak_shell_api")(win, () => getClient(serviceName.YakShellApi))
        // misc
        require("./handlers/misc_api")(win, () => getClient(serviceName.MiscApi))
        // store
        require("./handlers/store_api")(win, () => getClient(serviceName.StoreApi))
        // license
        require("./handlers/license_api")(win, () => getClient(serviceName.LicenseApi))

        // project
        require("./handlers/project_api")(win, () => getClient(serviceName.ProjectApi))

        // 数据对比
        require("./handlers/dataCompare")(win)

        // 增加一个通用的导出功能
        require("./handlers/export_api")(win, () => getClient(serviceName.ExportApi))

        // facades server
        require("./handlers/facades_api")(win, () => getClient(serviceName.FacadesApi))
        // 小工具插件
        require("./handlers/online_api")(win, () => getClient(serviceName.OnlineApi))

        // terminal
        require("./handlers/terminal")(win)

        // 通信
        require("./handlers/communication")(win)

        // reverse logger
        require("./handlers/tunnel_api")(win, () => getClient(serviceName.TunnelApi))
        require("./handlers/tunnel_register_api").register(win, () => getClient(serviceName.TunnelApi))

        // 接口注册
        const api = fs.readdirSync(path.join(__dirname, "./api"))
        api.forEach((item) => {
            require(path.join(__dirname, `./api/${item}`))()
        })

        // 各类UI层面用户操作
        const uiOp = fs.readdirSync(path.join(__dirname, "./uiOperate"))
        uiOp.forEach((item) => {
            require(path.join(__dirname, `./uiOperate/${item}`))(win)
        })

        // start chrome manager
        require("./handlers/chromelauncher")()
    }
}
