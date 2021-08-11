import fs from "fs"
import { getExePath } from "./s_filetool"

export function zLog(str: string): void {
    gLog.outLog(`[LOG]   ${str}`)
}
export function zWarn(str: string): void {
    gLog.outLog(`[Warn]  ${str}`)
}
export function zError(str: string): void {
    gLog.outLog(`[Error] ${str}`)
}

class pri_Log {
    /** 限制行数 */
    public readonly limit: number = 500

    /** 当前文件流对象 */
    private _curStream: fs.WriteStream = null

    /** 当前长度 */
    private _curLen: number = 0

    /** 日志队列 */
    private _logQueue: string[] = []

    /** 输出根路径 */
    private _rootPath: string = null

    private _isRunning: boolean = false

    /** 输出日志 */
    public outLog(str: string): void {
        if (this._rootPath == null) {
            this._rootPath = getExePath()
        }

        let dateStr = this.formatDate();
        let tmpstr = `${dateStr}| ${str} \r\n`

        console.log(tmpstr)
        this._logQueue.push(tmpstr)

        this._output()
    }

    /**
     * 格式化时间
     * @param d 时间对象
     * @param fmt 时间格式
     * @return string:应答结果
     */
    public formatDate(d?: Date, fmt?: string): string {
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

    /** 输出 */
    private _output(): void {
        if (this._isRunning) {
            return
        }

        this._isRunning = true

        let func = () => {
            if (this._logQueue.length <= 0) {
                this._isRunning = false
                return
            }

            let str = this._logQueue.shift()

            // 创建流
            if (this._curStream == null) {
                let filedatestr = this.formatDate(null, "yyyy-MM-dd hh·mm·ss")
                this._curStream = fs.createWriteStream(this._rootPath + "/LOG " + filedatestr + ".txt")
                this._curLen = 0

                // 错误监听
                this._curStream.once("error", () => {
                    // 关闭流
                    this._curStream.close()
                    this._curStream = null
                });
            }

            // 写入文件
            this._curStream.write(str)
            this._curLen++

            // 文件超长，关闭流，下次新建文件
            if (this.limit < this._curLen) {
                this._curStream.close()
                this._curStream = null
            }

            func()
        }

        func()
    }
}
let gLog = new pri_Log()