import fs from "fs"
import path from "path"

// 导出
export { run as MergePlot }

var qVideo: {
    id: number,
    content: string,
    condition: { videos: number[], selects: number[] },
    selects: number[],
    nextVideos: number[]
}[] = []
var qSelect: {
    id: number,
    content: { CN: string, EN: string },
    condition: { videos: number[], selects: number[] },
    delay: number,
    duration: number,
}[] = []
var qFinalData: {
    id: number,
    content: string,
    condition: { videos: number[], selects: number[] },
    selects: {
        id: number,
        content: { CN: string, EN: string },
        condition: { videos: number[], selects: number[] },
        delay: number,
        duration: number,
    }[],
    nextVideos: number[]
}[] = []
var qVideoUrlData: {
    [id: number]: {
        RUS_Super: string,
        RUS_Hight: string,
        EN_Super: string,
        EN_Hight: string
    }
} = {}

/**
 * 执行
 * @param outfile
 */
function run(outfile?: string[]): void {
    // 读取当前文件夹
    readDir("./", outfile)
    console.log("合并成功")
}

/**
 * 读取文件夹
 * @param url 
 * @param outfile
 */
function readDir(url: string, outfile?: string[]): void {
    let files = outfile ? outfile : fs.readdirSync(url)

    for (let fname of files) {
        // 文件路径
        let fpath = url + "/" + fname
        // 文件状态
        let fstate = fs.lstatSync(fpath)

        // 判断是否是文件夹
        if (fstate.isDirectory()) {
            continue
        }

        // 判断是否是.json
        let fextname = path.extname(fname)
        if (fextname == ".json") {
            readJson(fpath)
            continue
        }
    }

    // 读取完毕，合并json数据
    mergeJson()
}

/**
 * 读取.json文件
 * @param fpath 文件路径
 */
function readJson(fpath: string): void {
    // 过滤
    if (!fpath) {
        return
    }

    try {
        // 读取文件
        let jd: any[] = JSON.parse(String(fs.readFileSync(fpath)))
        let basename = path.basename(fpath, ".json")

        // 视频
        if (basename == "视频") {
            let keys = {}
            for (let i = 0; i < jd.length; i++) {
                let d = jd[i]
                if (i == 0) {
                    keys = d
                    continue
                }

                let newData = {
                    id: 0,
                    content: "",
                    condition: { videos: [], selects: [] },
                    selects: [],
                    nextVideos: []
                }
                for (let j in keys) {
                    if (keys[j] == "ID") {
                        newData["id"] = Number(d[j])
                    } else if (keys[j] == "content") {
                        newData["content"] = d[j]
                    } else if (keys[j] == "videos" || keys[j] == "selects") {
                        newData["condition"][keys[j]] = d[j] ? d[j].split(",").map(x => Number(x)) : []
                    } else if (keys[j] == "selectsID") {
                        newData["selects"] = d[j] ? d[j].split(",").map(x => Number(x)) : []
                    } else if (keys[j] == "nextvideos") {
                        newData["nextVideos"] = d[j] ? d[j].split(",").map(x => Number(x)) : []
                    }
                }
                qVideo.push(newData)
            }
        }

        // 选项
        if (basename == "选项") {
            let keys = {}
            for (let i = 0; i < jd.length; i++) {
                let d = jd[i]
                if (i == 0) {
                    keys = d
                    continue
                }

                let newData = {
                    id: 0,
                    content: { CN: "", EN: "" },
                    condition: { videos: [], selects: [] },
                    delay: 0,
                    duration: 0,
                }
                for (let j in keys) {
                    if (keys[j] == "ID") {
                        newData["id"] = Number(d[j])
                    } else if (keys[j] == "CN" || keys[j] == "EN") {
                        newData["content"][keys[j]] = d[j]
                    } else if (keys[j] == "videos" || keys[j] == "selects") {
                        newData["condition"][keys[j]] = d[j] ? d[j].split(",").map(x => Number(x)) : []
                    } else if (keys[j] == "delay") {
                        newData["delay"] = Number(d[j])
                    } else if (keys[j] == "duration") {
                        newData["duration"] = Number(d[j])
                    }
                }
                qSelect.push(newData)
            }
        }

        // 链接
        if (basename == "链接") {
            for (let i = 0; i < jd.length; i++) {
                let d = jd[i]

                let id = 0
                let newData = {
                    RUS_Super: "",
                    RUS_Hight: "",
                    EN_Super: "",
                    EN_Hight: ""
                }
                for (let j in d) {
                    if (j == "视频ID") {
                        id = Number(d[j])
                    } else if (j == "俄语高清") {
                        newData["RUS_Super"] = d[j]
                    } else if (j == "俄语标清") {
                        newData["RUS_Hight"] = d[j]
                    } else if (j == "英语高清") {
                        newData["EN_Super"] = d[j]
                    } else if (j == "英语低清") {
                        newData["EN_Hight"] = d[j]
                    }
                }
                qVideoUrlData[id] = newData
            }
        }
    } catch (error) {
        console.error("解析失败，", error)
    }
}

/**
 * 合并json
 */
function mergeJson() {
    for (let i in qVideo) {
        let v = qVideo[i]
        let newData = {
            id: v.id,
            content: v.content,
            condition: v.condition,
            selects: [],
            nextVideos: v.nextVideos
        }
        for (let j in v.selects) {
            for (let k in qSelect) {
                let s = qSelect[k]
                if (s.id == v.selects[j]) {
                    newData.selects.push(s)
                }
            }
        }
        qFinalData.push(newData)
    }

    outputJson(qFinalData, "PlotJson")
    outputJson(qVideoUrlData, "VideoUrlsJson")
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
}