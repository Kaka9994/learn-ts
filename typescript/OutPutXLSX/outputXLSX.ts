import fs from "fs"
import nodexlsx from "node-xlsx"
import { zError, zLog, zWarn } from "../utils/p_utils"

// 导出
export { run as outputXLSX }

/**
 * 执行
 * @param filename
 * @param outdata
 * @param callback
 */
function run(filename: string, outdata: { sheetname: string, data: Array<any>[] }[], callback: Function): void {
    // 过滤
    if (outdata == null) {
        zWarn("空数据，过滤生成XLSX | " + filename)
        return;
    }

    zLog("开始生成XLSX | " + filename)

    // 组装数据
    let tmp = []
    for (let i in outdata) {
        tmp.push({
            name: outdata[i].sheetname,
            data: outdata[i].data
        })
    }

    // 生成buffer
    let buffer = nodexlsx.build(tmp)

    // 写入
    fs.writeFile(filename + ".xlsx", <any>buffer, (err) => {
        if (err != null) {
            zError("生成XLSX失败 | " + err)
        }
        zLog("生成XLSX成功")
        callback()
    })
}