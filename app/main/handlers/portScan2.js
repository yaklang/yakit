const { ipcMain } = require('electron')
const FS = require('fs')
const { parseXlsx } = require('./portScan')

module.exports = {
  registerNewIPC: (win, getClient, ipcEventPre) => {
    const asyncFetchFileContent = (params) => {
      return new Promise((resolve, reject) => {
        const type = params.split('.').pop().toLowerCase()
        const typeArr = ['csv', 'xls', 'xlsx']

        // 读取Excel
        if (typeArr.includes(type)) {
          try {
            // ❗ xls 不支持
            if (type === 'xls') {
              return reject(new Error('暂不支持 .xls，请转为 .xlsx'))
            }

            // csv 直接读
            if (type === 'csv') {
              FS.readFile(params, 'utf-8', (err, data) => {
                if (err) return reject(err)

                const rows = data.split(/\r?\n/).map((line) => line.split(','))

                resolve([
                  {
                    name: 'Sheet1',
                    data: rows,
                  },
                ])
              })
              return
            }

            // xlsx 解析
            const result = parseXlsx(params)
            resolve(result)
          } catch (err) {
            reject(err)
          }
        }
        // 读取txt
        else {
          FS.readFile(params, 'utf-8', function (err, data) {
            if (err) {
              reject(err)
            } else {
              resolve(data)
            }
          })
        }
      })
    }

    // 获取URL的IP地址
    ipcMain.handle(ipcEventPre + 'fetch-file-content', async (e, params) => {
      return await asyncFetchFileContent(params)
    })
  },
}
