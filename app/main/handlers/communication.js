const { ipcMain } = require("electron");
const isDev = require("electron-is-dev");

module.exports = (win, getClient) => {
  // 刷新主页面左侧菜单内容 / refresh the menu content on the right side of the main page
  ipcMain.handle("change-main-menu", async (e) => {
    win.webContents.send("fetch-new-main-menu");
  });
  // 远程打开一个工具页面 / open a tool page remotely
  ipcMain.handle("send-to-tab", async (e, params) => {
    win.webContents.send("fetch-send-to-tab", params);
  });
  // 发送专项漏洞页面目标和类型参数
  ipcMain.handle("send-to-bug-test", async (e, params) => {
    win.webContents.send("fetch-send-to-bug-test", params);
  });
  // 请求包通过通信打开一个数据包插件执行弹窗
  ipcMain.handle("send-to-packet-hack", async (e, params) => {
    win.webContents.send("fetch-send-to-packet-hack", params);
  });
  // 缓存fuzzer内数据和配置通信
  ipcMain.handle("send-fuzzer-setting-data", async (e, params) => {
    win.webContents.send("fetch-fuzzer-setting-data", params);
  });
  // 发送插件信息到YakRunning页面
  ipcMain.handle("send-to-yak-running", async (e, params) => {
    win.webContents.send("fetch-send-to-yak-running", params);
  });


  // 本地环境(打包/开发)
  ipcMain.handle("is-dev", () => {return isDev});
};
