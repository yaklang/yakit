const { ipcRenderer } = window.require('electron')

ipcRenderer.on('start-child-loading', () => {
  document.getElementById('loadingText').innerText = '正在准备加载资源，请稍候...'
})

ipcRenderer.send('ready-to-load-child')
