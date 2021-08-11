import fs from "fs"
import path from "path"
import * as XLSX from "songyz-xlsx"

// 导出
export { run as ParseXLSX };

var qOutfile: string[] = [];

/**
 * 执行
 */
function run(): string[] {
    // 读取当前文件夹
    readDir("./")
    console.log("解析成功")
    return qOutfile
}

/**
 * 读取文件夹
 * @param url 
 */
function readDir(url: string): void {
    let files = fs.readdirSync(url)

    for (let fname of files) {
        // 文件路径
        let fpath = url + "/" + fname
        // 文件状态
        let fstate = fs.lstatSync(fpath)

        // 判断是否是文件夹
        if (fstate.isDirectory()) {
            continue
        }

        // 判断是否是.xlsx
        let fextname = path.extname(fname)
        if (fextname == ".xlsx") {
            parseXLSX(fpath);
            continue
        }
    }
}

/**
 * 解析.xlsx文件
 * @param fpath 文件路径
 */
function parseXLSX(fpath: string): void {
    // 过滤
    if (!fpath) {
        return
    }

    try {
        // 读取文件
        let wb = XLSX.readFile(fpath, {
            type: 'file'
        });
        wb.SheetNames.forEach(sheelname => {
            let jd = XLSX.utils.sheet_to_json(wb.Sheets[sheelname])
            // 过滤
            if (!jd || jd.length <= 0) {
                return;
            }
            outputJson(jd, path.basename(sheelname, ".xlsx"))
        });
    } catch (error) {
        console.error("解析失败，", error)
    }
}

/**
 * 输出json文件
 * @param json json对象
 * @param name 输出文件名
 */
function outputJson(json: any, name: string): void {
    // 过滤
    if (!json) {
        return
    }

    // 输出json
    let fpath = "./" + name + ".json"
    let jsonString = JSON.stringify(json, null, '\t')
    if (fs.existsSync(fpath)) {
        fs.writeFileSync(fpath, jsonString)
    } else {
        let jsonStream = fs.createWriteStream(fpath)
        jsonStream.write(jsonString)
        jsonStream.close()
    }

    qOutfile.push(name + ".json")
}