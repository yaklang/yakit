const { ipcMain } = require("electron");

module.exports = (win, getClient) => {
  // 存储多对比页面的token和data
  const dataMap = new Map();
  // 当前token值
  var token = "";
  /**
   * 新增页面的入口
   * @type {boolean}
   * true : 其他页面的请求新增
   * false : 主页新增
   */
  var type = false;

  // 接收http-history页面的数据对比请求,生成对映码并转发通知主页新增data-compare页面
  ipcMain.handle("add-data-compare", (e, params) => {
    type = true;
    const infoType = ["", "left", "right"][+params.type];

    if (token) {
      const info = dataMap.get(token);
      info.type = +params.type;
      info[infoType] = params.info;
      dataMap.set(token, info);

      win.webContents.send(`${token}-data`, {
        token: token,
        info: info,
      });
      token = "";
      type = false;
    } else {
      token = `compare-${new Date().getTime()}-${Math.floor(
        Math.random() * 50
      )}`;
      const info = {};
      info.type = +params.type;
      info[infoType] = params.info;
      dataMap.set(token, info);
      win.webContents.send("main-container-add-compare");
    }
  });

  ipcMain.handle("created-data-compare", (e) => {
    type = true;
  });

  // 转发数据
  const sendDataCompare = () => {
    return new Promise((resolve, reject) => {
      if (type) return resolve({ token: token, info: dataMap.get(token) });
      else {
        return resolve({
          token: `compare-${new Date().getTime()}-${Math.floor(
            Math.random() * 50
          )}`,
        });
      }
    });
  };
  // 接收主页收到的对比数据，并传入数据对比页面中
  ipcMain.handle("create-compare-token", async (e) => {
    return await sendDataCompare();
  });
};
