import { registerMainMethod } from './ipc/index'
import { resourcePath } from './paths'
import { nativeImage, Notification, app, type BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
const PROTO_PATH = resourcePath('grpc.proto')
const { HttpSetting } = require('./state')
import * as grpc from '@grpc/grpc-js'
import type { ProtoGrpcType, YakClient, EchoResposne__Output } from '../shared/generated/grpc/types'
import * as protoLoader from '@grpc/proto-loader'
const { printLogOutputFile } = require('./logFile')
const { assertTrustedAppSender, normalizeHttpBaseUrl } = require('./security')
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType
const { ypb } = protoDescriptor
const { Yak } = ypb

const global = {
  defaultYakGRPCAddr: '127.0.0.1:8087',
  password: '',
  caPem: '',
}

let _client: YakClient | null = null

function createGrpcInterceptor(): grpc.Interceptor {
  return (options, nextCall) => {
    const requester: grpc.Requester = {
      // 请求前
      start(metadata, listener, next) {
        // 请求前（等价 axios request interceptor）
        const newListener: grpc.Listener = {
          ...listener,
          // 响应后
          onReceiveStatus(status) {
            // console.log("[GRPC Status-----------]",options.method_definition?.path, status);
            // 响应后（等价 axios response interceptor）
            if (status.code !== grpc.status.OK) {
              printLogOutputFile(
                `[GRPC ERRO] => ${JSON.stringify({
                  method: options.method_definition?.path,
                  code: status.code,
                  codeName: grpc.status[status.code],
                  details: status.details,
                })}`,
              )
            }
            // 向下传递
            listener.onReceiveStatus?.(status)
          },
        }

        next(metadata, newListener)
      },
    }

    return new grpc.InterceptingCall(nextCall(options), requester)
  }
}

const options = {
  'grpc.max_receive_message_length': 1024 * 1024 * 1000,
  'grpc.max_send_message_length': 1024 * 1024 * 1000,
  'grpc.enable_http_proxy': 0,
  interceptors: [createGrpcInterceptor()],
}

function newClient() {
  const md = new grpc.Metadata()
  md.set('authorization', `bearer ${global.password}`)
  if (global.caPem !== '') {
    const creds = grpc.credentials.createFromMetadataGenerator((params, callback) => {
      return callback(null, md)
    })
    return new Yak(
      global.defaultYakGRPCAddr,
      // grpc.credentials.createInsecure(),
      grpc.credentials.combineChannelCredentials(
        grpc.credentials.createSsl(Buffer.from(global.caPem, 'latin1'), null, null, {
          checkServerIdentity: (hostname, cert) => {
            return undefined
          },
        }),
        creds,
      ),
      options,
    )
  } else if (global.password && global.password !== '') {
    // 非 TLS 连接（可能需要密码认证，例如 secret-local 模式）
    // 对于非 TLS 连接，不能使用 combineChannelCredentials
    // 需要通过拦截器在每次调用时添加 metadata
    const optionsWithInterceptors: grpc.ClientOptions = {
      ...options,
      interceptors: [
        (options, nextCall) => {
          return new grpc.InterceptingCall(nextCall(options), {
            start: function (metadata, listener, next) {
              metadata.set('authorization', `bearer ${global.password}`)
              next(metadata, listener)
            },
          })
        },
        createGrpcInterceptor(),
      ],
    }
    return new Yak(global.defaultYakGRPCAddr, grpc.credentials.createInsecure(), optionsWithInterceptors)
  } else {
    // 普通非 TLS 连接（无密码）
    return new Yak(global.defaultYakGRPCAddr, grpc.credentials.createInsecure(), options)
  }
}

function getClient(createNew?: boolean): YakClient {
  if (!!createNew) {
    return newClient()
  }

  if (_client) {
    return _client
  }

  _client = newClient()
  return getClient()
}

/**
 * @name 测试远程连接引擎是否成功
 * @param {Object} params
 * @param {String} params.host 域名
 * @param {String} params.port 端口
 * @param {String} params.caPem 证书
 * @param {String} params.password 密钥
 */
function testRemoteClient(
  params: { host: string; port: string | number; caPem?: string; password?: string },
  callback: grpc.requestCallback<EchoResposne__Output>,
) {
  const { host, port, caPem, password } = params

  const md = new grpc.Metadata()
  md.set('authorization', `bearer ${password}`)
  const creds = grpc.credentials.createFromMetadataGenerator((params, callback) => {
    return callback(null, md)
  })
  const yak = !caPem
    ? new Yak(`${host}:${port}`, grpc.credentials.createInsecure(), options)
    : new Yak(
        `${host}:${port}`,
        // grpc.credentials.createInsecure(),
        grpc.credentials.combineChannelCredentials(
          grpc.credentials.createSsl(Buffer.from(caPem, 'latin1'), null, null, {
            checkServerIdentity: (hostname, cert) => {
              return undefined
            },
          }),
          creds,
        ),
        options,
      )

  return yak.Echo({ text: 'hello yak? are u ok?' }, md, { deadline: Date.now() + 10_000 }, (error, data) => {
    try {
      callback(error, data)
    } finally {
      yak.close()
    }
  })
}

/**
 * @name 测试引擎进程是否适用版本软件
 * @param {Object} params
 * @param {String} params.port 端口
 * @param {String} params.version  版本
 */
function testEngineAvaiableVersion(params: { port: string | number; version: string }) {
  return new Promise<boolean>((resolve, reject) => {
    try {
      const { port, version } = params
      const yak = new Yak(`127.0.0.1:${port}`, grpc.credentials.createInsecure(), options)
      const deadline = new Date()
      // 设置超时时间为3秒
      deadline.setSeconds(deadline.getSeconds() + 3)
      yak.Handshake({ Name: version }, { deadline }, (err, data) => {
        yak.close()
        if (err) {
          reject(err)
          return
        }
        try {
          if (!data) throw new Error('Handshake returned no response')
          resolve(data.Success)
        } catch (error) {
          reject(error)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

function configureEngine(addr: string, pem: string, password: string) {
  require('./ipc/index').engineChanged()
  _client?.close()
  _client = null
  global.defaultYakGRPCAddr = addr
  global.caPem = pem
  global.password = password
}

export = {
  getClient,
  testRemoteClient,
  testEngineAvaiableVersion,
  clearing: () => {
    require('./services/processes').clearing()
  },
  registerMainServices: (win: BrowserWindow) => {
    registerMainMethod('yakit-connect-status', () => {
      return {
        addr: global.defaultYakGRPCAddr,
        isTLS: !!global.caPem,
      }
    })

    /** 获取 yaklang引擎 配置参数 */
    registerMainMethod(
      'fetch-yaklang-engine-addr',
      () => {
        return {
          addr: global.defaultYakGRPCAddr,
          isTLS: !!global.caPem,
        }
      },
      ['main', 'link'],
    )

    /** 登录相关监听 */
    require('./services/account').registerAccountServices(win)

    /** 注册本地缓存数据查改通信 */
    /** 启动、连接引擎 */
    require('./services/engine').registerEngineServices(win, configureEngine, getClient, newClient)
    /** 远程控制 */
    require('./services/control').registerControlServices()

    require('./services/files').registerFileServices(win)
    require('./services/processes').register()

    // IM 远程控制：启动/停止/查询 IM Engine（聊天即控制）
    require('./services/imControl').registerIMControl(getClient, () => global.defaultYakGRPCAddr)

    // start chrome manager
    try {
      require('./services/browser').registerBrowserServices()
    } catch (e) {
      console.info('Import chrome launcher failed')
      console.error(e)
    }

    //assets
    require('./services/reports').registerReportServices()

    const upgradeUtil: typeof import('./services/updates') = require('./services/updates')
    const upgradesReady = upgradeUtil.initial()
    upgradeUtil.registerUpdates(win, upgradesReady)
    void upgradesReady.catch((error: unknown) => {
      new Notification({
        title: 'Engine resource initialization failed',
        body: String(error),
        icon: nativeImage.createEmpty(),
        urgency: 'critical',
      }).show()
    })

    //

    // 通信
    require('./services/rendererEvents').registerRendererEvents(win)

    // 辅助窗口（引擎 Console / AI Chat Log + app-sync）
    require('./services/auxWindows').registerAuxWindows(win)

    // register open new child window
    require('./services/childWindows').registerChildWindows(win)

    // 接口注册
    require('./services/transfers').registerTransferServices()

    // 各类UI层面用户操作
    require('./services/windowEvents').registerWindowOperations(win)
    require('./services/versions').registerVersions(win)

    // 日志
    try {
      require('./services/logs').register()
    } catch (error) {
      console.log('error:', error)
    }

    // ai-agent
    try {
      require('./services/ai').registerAIServices()
    } catch (error) {
      console.log('ai-agent.js-error', error)
    }
  },
  // Link 窗口仅组装其启动任务；共用接口在主服务中注册一次。
  registerLinkServices: (win: BrowserWindow) => {
    /** 注册本地缓存数据查改通信 */

    // 各类UI层面用户操作
    require('./services/windowEvents').registerWindowOperations(win)

    /** 启动、连接引擎 */
    require('./services/startup').registerStartupTasks(win, configureEngine, newClient)

    /** 获取 yaklang引擎 配置参数 */
  },
}
