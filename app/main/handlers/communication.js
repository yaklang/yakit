const { ipcMain } = require("electron");

module.exports = (win, getClient) => {
  // 刷新主页面右侧菜单内容 / refresh the menu content on the right side of the main page
  ipcMain.handle("change-main-menu", async (e) => {
    win.webContents.send("fetch-new-main-menu");
  });
  // 远程打开一个fuzzer工具页面 / open a fuzzer tool page remotely
  ipcMain.handle("send-to-fuzzer", async (e, params) => {
    win.webContents.send("fetch-send-to-fuzzer", params);
  });
  // 请求包通过通信打开一个数据包插件执行弹窗
  ipcMain.handle("send-to-packet-hack", async (e, params) => {
    win.webContents.send("fetch-send-to-packet-hack", params);
  });
};
