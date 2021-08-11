import fs from "fs"
import { createDir, zError, zLog, zWarn } from "../utils/p_utils"

// 导出
export { run as outputCSV }

/**
 * 执行
 * @param path
 * @param sheetnames
 * @param outdata
 * @param callback
 */
function run(path: string, csvinfos: { [sentenceid: string]: Array<any>[] }, callback: Function): void {
    // 过滤
    if (csvinfos == null) {
        zWarn("空数据，过滤生成CSV | " + path)
        callback()
        return
    }

    let dirPath = path + "/csv"
    let keys = Object.keys(csvinfos)

    zLog("开始生成CSV | " + dirPath)

    // 创建文件夹
    createDir(dirPath, result => {
        if (!result) {
            callback()
            return
        }
        outputOneCSV(dirPath, 0, keys, csvinfos, callback)
    })
}

function outputOneCSV(dirPath: string, index: number, keys: string[], csvinfos: { [sentenceid: string]: Array<any>[] }, callback: Function): void {
    if (index == keys.length) {
        zLog("CSV文件生成完毕 | " + dirPath)
        callback()
        return
    }

    let key = keys[index]
    let csvinfo = csvinfos[key]

    // 生成表头 ( \ufeff --> 防止乱码 )
    var csvContent = '\ufeff';

    for (let i in csvinfo) {
        csvContent += csvinfo[i] + "\n"
    }

    // 生成csv文件
    let path = dirPath + "/" + key + ".csv"
    fs.writeFile(path, csvContent, (error) => {
        if (error != null) {
            zError("CSV文件生成失败 | " + path + " | " + error)
            callback()
            return
        }

        outputOneCSV(dirPath, ++index, keys, csvinfos, callback)
    })
}