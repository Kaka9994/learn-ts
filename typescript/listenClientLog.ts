import fs from "fs"
import * as http from "http";

function run(): void {
    // curl -d "kaka=123" http://127.0.0.1:9527
    const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
        // 超时处理函数
        let doTimeout = () => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write("timeout!");
            res.end();
        }

        // 开启计时函数
        let timer: number = -1;
        let startTimer = (enable: boolean) => {
            if (timer != -1) {
                clearTimeout(timer);
                timer = -1;
            }

            if (enable) {
                timer = <any>setTimeout(() => {
                    doTimeout();
                }, 5000);
            }
        }

        req.once("data", (data: string) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(data);
            res.end();

            // 关闭计时
            startTimer(false);

            // 输出日志
            outLog(data);
        })

        // 开启计时
        startTimer(true);

    });
    server.listen(9527);
}

let wStream: fs.WriteStream = null;
let logLenght: number = 0;

/** 输出日志 */
function outLog(data): void {
    let dateStr = formatDate();

    // 创建流
    if (wStream == null) {
        wStream = fs.createWriteStream(dateStr + ".txt");
        logLenght = 0;

        // 错误监听
        wStream.once("error", () => {
            // 关闭流
            wStream.close();
            wStream = null;
        });
    }

    // 写入文件
    wStream.write(`${dateStr}| ${data} \r\n`);
    logLenght++;

    // 文件超长，关闭流，下次新建文件
    const limitLenght = 1000;
    if (limitLenght < logLenght) {
        wStream.close();
        wStream = null;
    }
}

/**
 * 格式化时间
 * @param d 时间对象
 * @param fmt 时间格式
 * @return string:应答结果
 */
function formatDate(d?: Date, fmt?: string): string {
    // 处理时间
    let date = d ? d : new Date()
    let out = fmt ? fmt : "yyyy-MM-dd hh:mm:ss"

    // 格式
    let o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        "S": date.getMilliseconds() //毫秒
    }

    if (/(y+)/.test(out)) {
        out = out.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length))
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(out)) {
            out = out.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)))
        }
    }

    return out
}