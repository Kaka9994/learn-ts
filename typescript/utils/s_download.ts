import fs from "fs"
import https from 'https'
import { zError, zLog, zWarn } from "../utils/p_utils"

// 导出
export { download as download }
export { saveFile as saveFile }

function download(url: string, callback: (data: any) => void): void {
    zLog("开始下载 | " + url)

    let req = https.get(url, (res) => {
        var data = ""
        res.setEncoding("binary")

        res.on("data", (chunk) => {
            data += chunk
        })

        res.on("end", () => {
            zLog("下载完成")
            callback(data)
        })
    })

    req.setTimeout(5000, () => {
        req.destroy(new Error("请求超时"))
    })
    
    req.on("error", (error: Error) => {
        zError("下载失败 | " + error)
        callback(null)
    })
}

function saveFile(path: string, data: any, callback: (result: boolean) => void): void {
    if (data == null) {
        zError("保存文件失败 ｜ " + path)
        callback(false)
        return
    }

    fs.writeFileSync(path, data, 'binary')

    zLog("保存文件成功")

    callback(true)
}