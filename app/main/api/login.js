const { service, httpApi } = require("../httpServer");
const { ipcMain } = require("electron");

module.exports = (win, getClient) => {
  ipcMain.handle("fetch-login-url", async (e, params) => {
    return 123
  });
};
