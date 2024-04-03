const axios = require('axios');
const fs = require('fs');
const {throttle} = require('throttle-debounce');
const urlUtils = require('url');
const https = require("https");
const {caBundle} = require("./missedCABundle");

// 函数用于编码URL中的中文字符
function encodeChineseCharacters(url) {
    // 实现URL中中文字符的编码逻辑
    return encodeURI(url);
}

// 根据域名获取HTTPS代理配置
const getHttpsAgentByDomain = (domain) => {
    if (domain.endsWith('.yaklang.com')) {
        return new https.Agent({ca: caBundle, rejectUnauthorized: true})
    }
    return undefined
}

function requestWithProgress(downloadUrl, dest, options = {}, onProgress = undefined, onFinished = undefined, onError = undefined) {
    // 解析下载URL
    const parsedUrl = urlUtils.parse(downloadUrl);
    const agent = getHttpsAgentByDomain(parsedUrl.host);

    // 设置axios请求配置
    const config = {
        responseType: 'stream', httpsAgent: agent, // 其他axios配置...
    };


    const u = encodeChineseCharacters(downloadUrl);
    console.info(`start download ${u} to ${dest}`)
    axios.get(u, config).then(response => {
        if (response.status === 404) {
            onError && onError(new Error(`404 not found in ${downloadUrl}`))
            return
        }

        const writer = fs.createWriteStream(dest);
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;
        const startedAt = Date.now();
        let getProgressState = () => {
            const state = {
                time: {
                    elapsed: (Date.now() - startedAt) / 1000, remaining: 0
                }, speed: 0, percent: 0, size: {
                    total: Number(totalLength) || 0, transferred: downloadedLength,
                }
            }
            if (state.time.elapsed >= 1) {
                state.speed = state.size.transferred / state.time.elapsed
            }

            if (state.size.total > 0) {
                state.percent = Math.min(state.size.transferred, state.size.total) / state.size.total;
                if (state.speed > 0) {
                    state.time.remaining = state.percent !== 1 ? (state.size.total / state.speed) - state.time.elapsed : 0;
                    state.time.remaining = Math.round(state.time.remaining * 1000) / 1000;
                }
            }
            return state
        }

        const updateProgress = throttle(options.throttle || 1000, () => {
            const percentage = (downloadedLength / totalLength) * 100;
            // 你可以替换这里的逻辑来更新进度，例如发送到前端
            const state = getProgressState();
            console.log(`Downloaded: `, state.percent);
            onProgress && onProgress(state)
        });

        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            updateProgress();
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                onProgress && onProgress(100)
                resolve();
            });
            writer.on('error', reject);
        });

    }).then(() => {
        // 下载完成后的处理
        onFinished && onFinished();
    }).catch(error => {
        // 错误处理
        console.info(error.message);
        onError && onError(error)
    });
}

module.exports = {
    requestWithProgress, getHttpsAgentByDomain,
}