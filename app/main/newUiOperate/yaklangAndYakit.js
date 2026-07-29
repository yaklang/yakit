const { ipcMain, app } = require('electron')
const fs = require('fs')
const https = require('https')
const { getLocalYaklangEngine } = require('../filePath')
const {
  fetchLatestYakEngineVersion,
  fetchLatestYakitEEVersion,
  fetchLatestYakitVersion,
  fetchLatestYakitIRifyVersion,
  fetchLatestYakitIRifyEEVersion,
  getAvailableOSSDomain,
  fetchSpecifiedYakVersionHash,
  fetchLatestYakitMemfitVersion,
} = require('../handlers/utils/network')

module.exports = {
  registerNewIPC: (win, getClient, ipcEventPre) => {
    /** yaklang引擎是否安装 */
    ipcMain.handle(ipcEventPre + 'is-yaklang-engine-installed', () => {
      /** @returns {Boolean} */
      return fs.existsSync(getLocalYaklangEngine())
    })
    /** 获取Yaklang引擎最新版本号 */
    const asyncFetchLatestYaklangVersion = () => {
      return new Promise((resolve, reject) => {
        fetchLatestYakEngineVersion()
          .then((version) => {
            resolve(`${version}`.trim())
          })
          .catch((err) => {
            reject(err)
          })
      })
    }
    /** 获取Yaklang引擎最新版本号 */
    ipcMain.handle(ipcEventPre + 'fetch-latest-yaklang-version', async (e) => {
      return await asyncFetchLatestYaklangVersion()
    })

    ipcMain.handle(ipcEventPre + 'get-available-oss-domain', async () => {
      return await getAvailableOSSDomain()
    })

    /** 获取Yakit本地版本号 */
    ipcMain.handle(ipcEventPre + 'fetch-yakit-version', async (e) => {
      return app.getVersion()
    })

    /** 获取Yakit最新版本号 */
    const asyncFetchLatestYakitVersion = (params) => {
      const { config, releaseEditionName } = params
      return new Promise((resolve, reject) => {
        const versionFetchers = {
          Yakit: fetchLatestYakitVersion,
          EnpriTrace: fetchLatestYakitEEVersion,
          IRify: fetchLatestYakitIRifyVersion,
          'IRify-EnpriTrace': fetchLatestYakitIRifyEEVersion,
          'Memfit AI': fetchLatestYakitMemfitVersion,
        }
        const fetchPromise = versionFetchers[releaseEditionName]
          ? versionFetchers[releaseEditionName]
          : fetchLatestYakitVersion
        fetchPromise(config)
          .then((version) => {
            resolve(version)
          })
          .catch((e) => {
            reject(e)
          })
      })
    }

    /** 获取Yakit最新版本号 */
    ipcMain.handle(ipcEventPre + 'fetch-latest-yakit-version', async (e, params) => {
      return await asyncFetchLatestYakitVersion(params)
    })

    /** 校验Yaklang来源是否正确 */
    ipcMain.handle(ipcEventPre + 'fetch-check-yaklang-source', async (e, version, requestConfig) => {
      return await fetchSpecifiedYakVersionHash(version, requestConfig)
    })

    /** 获取Yaklang所有版本 */
    const asyncFetchYaklangVersionList = async () => {
      return new Promise(async (resolve, reject) => {
        const domain = await getAvailableOSSDomain()
        let rsp = https.get(`https://${domain}/yak/version-info/active_versions.txt`)
        rsp.on('response', (rsp) => {
          rsp
            .on('data', (data) => {
              resolve(Buffer.from(data).toString('utf8'))
            })
            .on('error', (err) => reject(err))
        })
        rsp.on('error', reject)
      })
    }
    /** 获取Yaklang所有版本 */
    ipcMain.handle(ipcEventPre + 'fetch-yaklang-version-list', async (e) => {
      return await asyncFetchYaklangVersionList()
    })
  },
}
