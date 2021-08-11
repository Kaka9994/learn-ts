import fs from "fs"
import compressing from "compressing"
import { zError, zLog, zWarn } from "../utils/p_utils"

export { unzipFile as unzipFile }
export { copyFilesTo as copyFilesTo }
export { removeFile as removeFile }
export { createDir as createDir }
export { getExePath as getExePath }

function getExePath(): string {
    // return "./111"
    let exePath = process.execPath, exeIndex = exePath.lastIndexOf("/")
    exePath = exePath.slice(0, exeIndex)
    return exePath
}

function unzipFile(path: string, unzipPath: string, callback: (result: boolean) => void): void {
    zLog("开始解压文件 ｜ " + path)

    compressing.zip.uncompress(path, unzipPath)
        .then(() => {
            zLog("解压文件成功")
            callback(true)
        })
        .catch(err => {
            zLog("解压文件失败 ｜ " + err)
            callback(false)
        })
}

function copyFilesTo(paths: string[], target: string, callback: Function): void {
    zLog("拷贝文件开始")

    let index = 0
    let func = (err) => {
        if (err != null) {
            zLog("拷贝文件失败 | " + err)
            callback()
            return
        }

        if (index == paths.length) {
            zLog("拷贝文件完成")
            callback()
            return
        }

        let path = paths[index++]
        let filename = path.slice(path.lastIndexOf("/"), path.length)
        fs.copyFile(path, target + "/" + filename, func)
    }

    func(null)
}

function removeFile(url) {
    // 读取原路径
    const STATUS = fs.statSync(url);

    // 如果原路径是文件
    if (STATUS.isFile()) {
        // 删除原文件
        fs.unlinkSync(url);
    } 
    // 如果原路径是目录
    else if (STATUS.isDirectory()) {

        // 如果原路径是非空目录,遍历原路径
        // 空目录时无法使用forEach
        fs.readdirSync(url).forEach(item => {
            //递归调用函数，以子文件路径为新参数
            removeFile(`${url}/${item}`)
        })

        //删除空文件夹
        fs.rmdirSync(url)
    }
}

function createDir(path: string, callback: (result) => void): void {
    if (!fs.existsSync(path)) {
        fs.mkdir(path, (error) => {
            if (error != null) {
                zError("创建文件夹失败 | " + path)
                callback(false)
                return
            }
            callback(true)
        })
        return
    }

    callback(true)
}