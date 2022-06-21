import htmlDocx from "html-docx-js/dist/html-docx";
import saveAs from "file-saver";

const { ipcMain } = require("electron");
const juice = require("juice");

module.exports= (win, getClient) => {
    ipcMain.handle("html-to-word", async (event, page) => {
        const html = juice.inlineContent(page, "http://192.168.101.109:8080/antd.css");
        console.log('html',html);
      });
}

