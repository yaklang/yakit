const { ipcMain } = require("electron");

module.exports = (win, getClient) => {
  ipcMain.handle("main-bug-test", async (e, flag) => {
    win.webContents.send("bug-test-hidden", flag);
  });

  ipcMain.handle("change-main-menu", async (e) => {
    win.webContents.send("fetch-new-main-menu");
  });
};
