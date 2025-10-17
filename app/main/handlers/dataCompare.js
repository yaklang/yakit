const { ipcMain } = require("electron");

module.exports = (win, getClient) => {
  // 存储多对比页面的token和data
  const dataMap = new Map();
  // 当前token值
  var token = "";

  var flag = ''

  // 接收http-history页面的数据对比请求,生成对映码并转发通知主页新增data-compare页面
  ipcMain.handle("add-data-compare", (e, params) => {
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
      if(flag !== infoType){
        token = "";
        flag = ''
      }
      if(infoType === 'right'){
        win.webContents.send('switch-compare-page',{
          token,
          info,
        })
      }
    } else {
      token = `compare-${new Date().getTime()}-${Math.floor(
        Math.random() * 50
      )}`;
      const info = {};
      info.type = +params.type;
      info[infoType] = params.info;
      dataMap.set(token, info);
      win.webContents.send("main-container-add-compare", {
        openFlag: infoType === 'right'
      });
      flag = infoType
    }
  });

  ipcMain.handle("reset-data-compare", () => {
    dataMap.clear();
    flag = ''
    token = ''
  })

  // 接收主页收到的对比数据，并传入数据对比页面中
  ipcMain.handle("create-compare-token", async (e) => {
    if(token){
      return { token, info: dataMap.get(token) }
    }
    if(dataMap.size === 0){
      return { token: `compare-${new Date().getTime()}-${Math.floor(
        Math.random() * 50
      )}`,}
    }
    const data = Array.from(dataMap.entries()).pop()
    return  {
      token: data[0],
      info: data[1],
    }
  });

  //渲染层之间不能直接发送消息，所以通过主进程进行转发
  ipcMain.handle("forward-data-compare", (_, params)=> {
      win.webContents.send(`${params.token}-data`, params);
  })

  ipcMain.handle("forward-switch-compare-page",(_,params)=>{
    win.webContents.send('switch-compare-page',params)
  })

  ipcMain.handle("forward-main-container-add-compare",(_,params)=>{
    win.webContents.send("main-container-add-compare", params);
  })
};
