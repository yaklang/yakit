const {ipcMain} = require("electron")
const FS = require("fs")
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser({ ignoreAttributes: false });

// 列名转索引（A → 0, B → 1）
function columnToIndex(col) {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

// 解析 sharedStrings
function parseSharedStrings(xml) {
  if (!xml) return [];
  const json = parser.parse(xml);
  const si = json?.sst?.si || [];
  const arr = Array.isArray(si) ? si : [si];

  return arr.map((item) => {
    if (item.t) return item.t;
    if (item.r) return item.r.map(r => r.t).join('');
    return '';
  });
}

// 解析 sheet
function parseSheetData(sheetXml, sharedStrings) {
  const json = parser.parse(sheetXml);
  const rows = json?.worksheet?.sheetData?.row || [];
  const rowArr = Array.isArray(rows) ? rows : [rows];

  const result = [];

  rowArr.forEach((row) => {
    const rowData = [];
    const cells = row.c || [];
    const cellArr = Array.isArray(cells) ? cells : [cells];

    cellArr.forEach((cell) => {
      const ref = cell['@_r']; // A1
      if (!ref) return;

      const col = ref.replace(/\d/g, '');
      const colIndex = columnToIndex(col);

      let value = cell.v ?? '';

      // sharedStrings
      if (cell['@_t'] === 's') {
        value = sharedStrings[value] || '';
      }

      rowData[colIndex] = value;
    });

    // 补空位
    for (let i = 0; i < rowData.length; i++) {
      if (rowData[i] === undefined) rowData[i] = '';
    }

    result.push(rowData);
  });

  return result;
}

// 解析 xlsx
function parseXlsx(filePath) {
  const zip = new AdmZip(filePath);

  // sharedStrings
  let sharedStrings = [];
  const sharedEntry = zip.getEntry('xl/sharedStrings.xml');
  if (sharedEntry) {
    sharedStrings = parseSharedStrings(sharedEntry.getData().toString());
  }

  // workbook
  const workbookXml = zip.getEntry('xl/workbook.xml').getData().toString();
  const workbookJson = parser.parse(workbookXml);

  const sheets = workbookJson?.workbook?.sheets?.sheet || [];
  const sheetList = Array.isArray(sheets) ? sheets : [sheets];

  const result = [];

  for (let i = 0; i < sheetList.length; i++) {
    const sheet = sheetList[i];
    const name = sheet['@_name'];

    const sheetPath = `xl/worksheets/sheet${i + 1}.xml`;
    const sheetEntry = zip.getEntry(sheetPath);
    if (!sheetEntry) continue;

    const sheetXml = sheetEntry.getData().toString();
    const data = parseSheetData(sheetXml, sharedStrings);

    result.push({
      name,
      data,
    });
  }

  return result;
}

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext")

    const streamPortScanMap = new Map()
    ipcMain.handle("cancel-PortScan", handlerHelper.cancelHandler(streamPortScanMap))
    ipcMain.handle("PortScan", (e, params, token) => {
        let stream = getClient().PortScan(params)
        handlerHelper.registerHandler(win, stream, streamPortScanMap, token)
    })



    const asyncFetchFileContent = (params) => {
        return new Promise((resolve, reject) => {
            const type = params.split(".").pop().toLowerCase()
            const typeArr = ["csv", "xls", "xlsx"]

            // 读取Excel
            if (typeArr.includes(type)) {
                try {
                    // ❗ xls 不支持
                    if (type === "xls") {
                        return reject(new Error("暂不支持 .xls，请转为 .xlsx"))
                    }

                    // csv 直接读
                    if (type === "csv") {
                        FS.readFile(params, "utf-8", (err, data) => {
                            if (err) return reject(err)

                            const rows = data.split(/\r?\n/).map((line) => line.split(","))

                            resolve([
                                {
                                    name: "Sheet1",
                                    data: rows
                                }
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
                FS.readFile(params, "utf-8", function (err, data) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                })
            }
        })
    }

    // 获取证书(ps:asyncFetchFileContent此方法读取有误)
    const asyncFetchCertificate = (params) => {
        return new Promise((resolve, reject) => {
            // 读取 .pfx 文件
            FS.readFile(params, (err, data) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }

                // 处理 .pfx 文件的内容，例如解析证书
                // 这里可能需要使用 `crypto` 模块进行进一步的处理
                // 例如：crypto.createCredentials
            })
        })
    }

    const streamSimpleDetectMap = new Map()

    ipcMain.handle("cancel-SimpleDetect", handlerHelper.cancelHandler(streamSimpleDetectMap))

    ipcMain.handle("SimpleDetect", (e, params, token) => {
        let stream = getClient().SimpleDetect(params)
        handlerHelper.registerHandler(win, stream, streamSimpleDetectMap, token)
    })

    const streamSimpleDetectCreatReportMap = new Map()

    ipcMain.handle("cancel-SimpleDetectCreatReport", handlerHelper.cancelHandler(streamSimpleDetectCreatReportMap))

    ipcMain.handle("SimpleDetectCreatReport", (e, params, token) => {
        let stream = getClient().SimpleDetectCreatReport(params)
        handlerHelper.registerHandler(win, stream, streamSimpleDetectCreatReportMap, token)
    })

    const asyncSaveCancelSimpleDetect = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveCancelSimpleDetect(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveCancelSimpleDetect", async (e, params) => {
        return await asyncSaveCancelSimpleDetect(params)
    })

    const asyncGetSimpleDetectUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectUnfinishedTask", async (e, params) => {
        return await asyncGetSimpleDetectUnfinishedTask(params)
    })

    const asyncGetSimpleDetectUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectUnfinishedTaskByUid", async (e, params) => {
        return await asyncGetSimpleDetectUnfinishedTaskByUid(params)
    })

    const asyncPopSimpleDetectUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PopSimpleDetectUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PopSimpleDetectUnfinishedTaskByUid", async (e, params) => {
        return await asyncPopSimpleDetectUnfinishedTaskByUid(params)
    })

    const streamRecoverSimpleDetectUnfinishedTaskMap = new Map()
    ipcMain.handle(
        "cancel-RecoverSimpleDetectUnfinishedTask",
        handlerHelper.cancelHandler(streamRecoverSimpleDetectUnfinishedTaskMap)
    )
    ipcMain.handle("RecoverSimpleDetectUnfinishedTask", (e, params, token) => {
        let stream = getClient().RecoverSimpleDetectUnfinishedTask(params)
        handlerHelper.registerHandler(win, stream, streamRecoverSimpleDetectUnfinishedTaskMap, token)
    })

    // 获取URL的IP地址
    ipcMain.handle("fetch-file-content", async (e, params) => {
        return await asyncFetchFileContent(params)
    })

    // 获取证书内容
    ipcMain.handle("fetch-certificate-content", async (e, params) => {
        return await asyncFetchCertificate(params)
    })

    const asyncQuerySimpleDetectUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySimpleDetectUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QuerySimpleDetectUnfinishedTask", async (e, params) => {
        return await asyncQuerySimpleDetectUnfinishedTask(params)
    })

    const asyncGetSimpleDetectRecordRequestById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectRecordRequestById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectRecordRequestById", async (e, params) => {
        return await asyncGetSimpleDetectRecordRequestById(params)
    })

    const asyncDeleteSimpleDetectUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSimpleDetectUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteSimpleDetectUnfinishedTask", async (e, params) => {
        return await asyncDeleteSimpleDetectUnfinishedTask(params)
    })

    const streamRecoverSimpleDetectTaskMap = new Map()
    ipcMain.handle("cancel-RecoverSimpleDetectTask", handlerHelper.cancelHandler(streamRecoverSimpleDetectTaskMap))
    ipcMain.handle("RecoverSimpleDetectTask", (e, params, token) => {
        let stream = getClient().RecoverSimpleDetectTask(params)
        handlerHelper.registerHandler(win, stream, streamRecoverSimpleDetectTaskMap, token)
    })
}
