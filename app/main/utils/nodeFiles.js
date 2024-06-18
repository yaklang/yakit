const { app, ipcMain, dialog } = require("electron");
const FS = require("fs");
const { async } = require("node-stream-zip");
const path = require("path")

module.exports = (win, getClient) => {
    const asyncFetchFileInfoByPath = (path) => {
        return new Promise((resolve, reject) => {
            try {
                const stats = FS.statSync(path)
                resolve(stats)
            } catch (error) {
                reject(error)
            }
        })
    }
    // 获取通过文件路径获取文件信息
    ipcMain.handle("fetch-file-info-by-path", async (e, path) => {
        return await asyncFetchFileInfoByPath(path)
    })

    const asyncExportRiskHtml = (path) => {
        return new Promise(async (resolve, reject) => {
            try {
                const { htmlContent, fileName, data } = params
                const { filePath } = await dialog.showSaveDialog({
                    title: fileName,
                    defaultPath: path.join(app.getPath('desktop'), fileName),
                });

                if (filePath) {
                    const folderPath = filePath;

                    if (!FS.existsSync(folderPath)) {
                        FS.mkdirSync(folderPath);
                    }

                    const filePath1 = path.join(folderPath, `${fileName}.html`);
                    const filePath2 = path.join(folderPath, 'data.js');
                    FS.writeFileSync(filePath1, htmlContent, 'utf-8');
                    FS.writeFileSync(filePath2, `const initData = ${JSON.stringify(data)}`, 'utf-8');
                    resolve(filePath);
                } else {
                    resolve('');
                }
            } catch (error) {
                reject(error)
            }
        })
    }

    ipcMain.handle('export-risk-html', async (event, params) => {
        return await asyncExportRiskHtml(params)

    });
}
