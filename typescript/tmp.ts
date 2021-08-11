import fs from "fs"
import pathtool from "path"
import { outputCSV } from "./OutPutXLSX/outputCSV"
import { outputXLSX } from "./OutPutXLSX/outputXLSX"
import { ParseDisneylandJson } from "./parseDisnylandJson"
import { ParseDisnylandLesson } from "./parseDisnylandLesson"
import { ParseDisneylandXLSX } from "./parseDisnylandXLSX"
import { download, saveFile, unzipFile, copyFilesTo, removeFile, createDir, zError, zLog, getExePath } from "./utils/p_utils"

let gParseJson = new ParseDisneylandJson()
let gParseLesson = new ParseDisnylandLesson()
let gParseXLSX = new ParseDisneylandXLSX()

export function mainParseDisnylandJson(): void {
    let exePath = getExePath()
    // 创建xlsx文件夹
    createDir(exePath + "/xlsx", result => {
        if (!result) {
            return
        }
        // 创建page文件夹
        createDir(exePath + "/page", result => {
            if (!result) {
                return
            }
            // 创建cover文件夹
            createDir(exePath + "/cover", result => {
                if (!result) {
                    return
                }
                let jsonPaths = getPaths(exePath, ".json")
                loadJson(jsonPaths)
            })
        })
    })
}

export function mainParseDisnylandLesson(): void {
    let exePath = getExePath()
    gParseLesson.parseLesson(exePath + "/disneyLesson", (data: string[][]) => {
        outputXLSX(exePath + "/tmp", [{ sheetname: "sheet1", data: data }], () => { })
    })
}

export function mainParseDisnylandXLSX(): void {
    zLog("开始执行")

    let exePath = getExePath()
    let inputDatas: { bookid: string }[] = []
    let outputDatas: { id: string, words: string[], sentence: string[] }[] = []

    let doEnd = () => {
        // 整理顺序
        let newOutputDatas: { id: string, words: string[], sentence: string[] }[] = []
        for (let i in inputDatas) {
            if (!inputDatas[i].bookid) {
                continue
            }

            newOutputDatas.push(
                outputDatas.find((value, index) => {
                    if (value.id == inputDatas[i].bookid) {
                        return true
                    }
                    return false
                })
            )
        }

        // 生成json
        gParseXLSX.outputJson(exePath + "/output.json", newOutputDatas, () => {
            zLog("执行结束")
        })
    }

    // 查找xlsx文件
    let xlsxFilePath = ""
    let files = fs.readdirSync(exePath)

    for (let fname of files) {
        // 判断是否是.xlsx
        let fextname = pathtool.extname(fname)
        if (fextname == ".xlsx") {
            xlsxFilePath = exePath + "/" + fname
            break
        }
    }

    // 过滤
    if (!xlsxFilePath) {
        zError("当前目录下找不到 XLSX 文件")
        doEnd()
        return
    }

    parseDisnylandXLSX(exePath, xlsxFilePath, inputDatas, outputDatas, doEnd)
}

export function mainParseDisnylandXLSX2(): void {
    zLog("开始执行")

    let exePath = getExePath()
    let inputDatas: { bookid: string }[] = []
    let outputDatas: { bookid: string, resultImage: string[], sound: string[] }[] = []

    let doEnd = () => {
        // 整理顺序
        let newOutputDatas: { bookid: string, resultImage: string[], sound: string[] }[] = []
        for (let i in inputDatas) {
            if (!inputDatas[i].bookid) {
                continue
            }

            newOutputDatas.push(
                outputDatas.find((value, index) => {
                    if (value.bookid == inputDatas[i].bookid) {
                        return true
                    }
                    return false
                })
            )
        }

        // 整理xlsx数据
        let xlsxData: string[][] = []
        xlsxData.push(["bookid", "resultImage", "sound"])
        for (let i in newOutputDatas) {
            let tmp = newOutputDatas[i], len = Math.max(tmp.resultImage.length, tmp.sound.length)
            for (let j = 0; j < len; j++) {
                let bookid = "", resultImage = "", sound = ""

                if (j == 0) {
                    bookid = tmp.bookid
                }
                if (j < tmp.resultImage.length) {
                    resultImage = tmp.resultImage[j]
                }
                if (j < tmp.sound.length) {
                    sound = tmp.sound[j]
                }

                xlsxData.push([bookid, resultImage, sound])
            }
        }

        // 生成xlsx
        outputXLSX(exePath + "/对应关系", [{sheetname: "sheet1", data: xlsxData}], () => {
            zLog("执行结束")
        })
    }

    // 查找xlsx文件
    let xlsxFilePath = ""
    let files = fs.readdirSync(exePath)

    for (let fname of files) {
        // 判断是否是.xlsx
        let fextname = pathtool.extname(fname)
        if (fextname == ".xlsx") {
            xlsxFilePath = exePath + "/" + fname
            break
        }
    }

    // 过滤
    if (!xlsxFilePath) {
        zError("当前目录下找不到 XLSX 文件")
        doEnd()
        return
    }

    // 创建mp3文件夹
    createDir(exePath + "/mp3", result => {
        if (!result) {
            return
        }
        // 创建png文件夹
        createDir(exePath + "/png", result => {
            if (!result) {
                return
            }

            parseDisnylandXLSX2(exePath, xlsxFilePath, inputDatas, outputDatas, doEnd)
        })
    })
}

// ----------------------------------------------------------------------------------------------------

function parseDisnylandXLSX2(
    exePath: string,
    xlsxFilePath: string,
    inputDatas: { bookid: string }[],
    outputDatas: { bookid: string, resultImage: string[], sound: string[] }[],
    callback: Function): void {

    // 解析xlsx
    let bookinfo = gParseXLSX.parseXLSX(xlsxFilePath)
    let failbookinfo: { bookid: string }[] = [], lastFailCount = 0, retryCount = 3
    inputDatas.push(...bookinfo)

    // 过滤
    if (bookinfo == null) {
        callback()
        return
    }

    // 创建处理书本函数
    let index = 0
    let func = () => {
        let bookid = bookinfo[index].bookid

        zLog("START 处理书本 ｜ " + bookid)

        // 请求获取config
        gParseXLSX.reqConfig2(bookid, (data) => {
            // 过滤
            if (data == null || data.data == null) {
                zLog("END 处理书本 ｜ " + bookid)

                // 记录失败书本
                failbookinfo.push(bookinfo[index])

                // 处理下一个
                index++
                if (bookinfo[index] && bookinfo[index].bookid) {
                    func()
                } else {
                    if (failbookinfo.length <= 0 ||
                        (lastFailCount == failbookinfo.length && retryCount <= 0)) {
                        callback()
                    } else {
                        retryFunc()
                    }
                }
                return
            }

            // 解析json
            let result = gParseXLSX.parseJson2(data.data)

            if (result != null) {
                // 添加数据
                result.data.bookid = result.data.bookid.slice(0, 7)
                outputDatas.push(result.data)

                // 下载zip
                gParseXLSX.downloadPkg2(
                    exePath,
                    bookid,
                    result.package,
                    result.images,
                    result.sounds,
                    (downloadRes: boolean) => {
                        zLog("END 处理书本 ｜ " + bookid)

                        // 记录失败书本
                        if (!downloadRes) {
                            failbookinfo.push(bookinfo[index])
                        }

                        // 处理下一个
                        index++
                        if (bookinfo[index] && bookinfo[index].bookid) {
                            func()
                        } else {
                            if (failbookinfo.length <= 0 ||
                                lastFailCount == failbookinfo.length && retryCount <= 0) {
                                callback()
                            } else {
                                retryFunc()
                            }
                        }
                    }
                )
            }

        })
    }

    // 创建重试失败书本函数
    let retryFunc = () => {
        zLog("重试失败书单")

        if (lastFailCount == failbookinfo.length) {
            retryCount--
        } else {
            retryCount = 0
        }

        [lastFailCount, bookinfo, failbookinfo, index] =
            [failbookinfo.length, failbookinfo, [], 0]

        func()
    }

    // 处理书本
    func()
}

function parseDisnylandXLSX(
    exePath: string,
    xlsxFilePath: string,
    inputDatas: { bookid: string }[],
    outputDatas: { id: string, words: string[], sentence: string[] }[],
    callback: Function): void {

    // 解析xlsx
    let bookinfo = gParseXLSX.parseXLSX(xlsxFilePath)
    let failbookinfo: { bookid: string }[] = [], lastFailCount = 0, retryCount = 3
    inputDatas.push(...bookinfo)

    // 过滤
    if (bookinfo == null) {
        callback()
        return
    }

    // 创建处理书本函数
    let index = 0
    let func = () => {
        let bookid = bookinfo[index].bookid

        zLog("START 处理书本 ｜ " + bookid)

        // 请求获取config
        gParseXLSX.reqConfig(bookid, (data) => {
            // 过滤
            if (data == null || data.data == null) {
                zLog("END 处理书本 ｜ " + bookid)

                // 记录失败书本
                failbookinfo.push(bookinfo[index])

                // 处理下一个
                index++
                if (bookinfo[index] && bookinfo[index].bookid) {
                    func()
                } else {
                    if (failbookinfo.length <= 0 ||
                        (lastFailCount == failbookinfo.length && retryCount <= 0)) {
                        callback()
                    } else {
                        retryFunc()
                    }
                }
                return
            }

            // 解析json
            let result = gParseXLSX.parseJson(data.data)

            if (result != null) {
                // 添加数据
                result.data.id = result.data.id.slice(0, 7)
                outputDatas.push(result.data)

                // 下载zip
                gParseXLSX.downloadPkg(
                    exePath,
                    bookid,
                    result.package,
                    result.images,
                    result.sounds,
                    (downloadRes: boolean) => {
                        zLog("END 处理书本 ｜ " + bookid)

                        // 记录失败书本
                        if (!downloadRes) {
                            failbookinfo.push(bookinfo[index])
                        }

                        // 处理下一个
                        index++
                        if (bookinfo[index] && bookinfo[index].bookid) {
                            func()
                        } else {
                            if (failbookinfo.length <= 0 ||
                                lastFailCount == failbookinfo.length && retryCount <= 0) {
                                callback()
                            } else {
                                retryFunc()
                            }
                        }
                    }
                )
            }

        })
    }

    // 创建重试失败书本函数
    let retryFunc = () => {
        zLog("重试失败书单")

        if (lastFailCount == failbookinfo.length) {
            retryCount--
        } else {
            retryCount = 0
        }

        [lastFailCount, bookinfo, failbookinfo, index] =
            [failbookinfo.length, failbookinfo, [], 0]

        func()
    }

    // 处理书本
    func()
}

function getPaths(startPath: string, ext: string): { path: string, filename: string }[] {
    let files = fs.readdirSync(startPath)
    let jsonPaths: { path: string, filename: string }[] = []

    for (let fname of files) {
        // 文件路径
        let fpath = startPath + "/" + fname

        // 判断是否是ext
        let fextname = pathtool.extname(fname)
        if (fextname == ext) {
            jsonPaths.push({ path: startPath, filename: fname.replace(ext, "") })
        }
    }

    return jsonPaths
}

function loadJson(jsonPaths: { path: string, filename: string }[]): void {
    zLog("开始任务")

    let index = 0
    let doLoad = () => {
        if (index == jsonPaths.length) {
            zLog("结束任务")
            return
        }

        let jsonpath = jsonPaths[index++]
        loadOneJson(jsonpath.path, jsonpath.filename, () => {
            // 延迟500ms，主要是因为下载zip包的是时候频繁请求会被服务器拒绝
            setTimeout(() => {
                doLoad()
            }, 500)
        })
    }

    doLoad()
}

function loadOneJson(path: string, filename: string, callback: Function): void {
    if (gParseJson == null) {
        zError("json解析器失效")
        return
    }

    gParseJson.parse(
        path + "/" + filename + ".json",
        (data: { bookinfo: Array<any>[], csvinfos: { [sentenceid: string]: Array<any>[] }, zipinfo: string, bookid: string }) => {
            if (data == null) {
                callback()
                return
            }

            let bookname = data.bookid ? data.bookid.slice(0, 7) : filename,
                newPath = path + "/" + bookname,
                mp3Parth = newPath + "/mp3",
                pagePath = path + "/page/" + bookname

            // 创建书本文件夹文件夹
            createDir(newPath, result => {
                if (!result) {
                    callback()
                    return
                }
                // 创建书本文件夹下的mp3文件夹
                createDir(mp3Parth, result => {
                    if (!result) {
                        callback()
                        return
                    }
                    // 创建page下的文件夹
                    createDir(pagePath, result => {
                        if (!result) {
                            callback()
                            return
                        }
                        outputFile(newPath, bookname, data, callback)
                    })
                })
            })
        }
    )
}

function outputFile(
    path: string,
    filename: string,
    data: { bookinfo: Array<any>[], csvinfos: { [sentenceid: string]: Array<any>[] }, zipinfo: string },
    callback: Function): void {

    let xlsxParh = path.slice(0, path.lastIndexOf("/")) + "/xlsx/" + filename

    // 输出XLSX
    outputXLSX(xlsxParh, [{ sheetname: "sheet1", data: data.bookinfo }], () => {
        // 输出CSV
        outputCSV(path, data.csvinfos, () => {
            // 下载zip
            download(data.zipinfo, data => {
                if (data == null) {
                    callback()
                    return
                }

                // 保存zip
                let zipPath = path + "/" + filename + ".zip"
                saveFile(zipPath, data, result => {
                    if (!result) {
                        callback()
                        return
                    }

                    // 解压zip
                    let unzipPath = path.replace(".zip", "") + "temp"
                    unzipFile(zipPath, unzipPath, result => {
                        if (!result) {
                            callback()
                            return
                        }

                        let files = fs.readdirSync(unzipPath)
                        let mp3Paths: string[] = [],
                            pngPaths: string[] = []

                        for (let fname of files) {
                            // 文件路径
                            let fpath = unzipPath + "/" + fname

                            let fextname = pathtool.extname(fname)

                            // 判断是否是mp3
                            if (fextname == ".mp3") {
                                mp3Paths.push(fpath)
                            }
                            // 判断是否是png
                            if (fextname == ".png") {
                                pngPaths.push(fpath)
                            }
                        }

                        // xxx_P00.png放cover文件夹，其余放page文件夹下对应的文件夹
                        let coverPng = ""
                        for (let i = 0, pngCount = pngPaths.length; i < pngCount; i++) {
                            let tmp = pngPaths[i]
                            if (tmp.indexOf("_P00.png") != -1) {
                                coverPng = tmp
                                pngPaths.splice(i, 1)
                                break
                            }
                        }

                        // 拷贝路径
                        let charIndex = path.lastIndexOf("/"),
                            outMp3Path = path + "/mp3",
                            outPngPagePath = path.slice(0, charIndex) + "/page" + path.slice(charIndex),
                            outPngCoverPath = path.slice(0, charIndex) + "/cover"

                        // copy mp3 to bookid/mp3
                        copyFilesTo(mp3Paths, outMp3Path, () => {
                            // copy png to page/bookid
                            copyFilesTo(pngPaths, outPngPagePath, () => {
                                // copy png to cover
                                copyFilesTo([coverPng], outPngCoverPath, () => {
                                    removeFile(unzipPath)
                                    removeFile(zipPath)
                                    callback()
                                })
                            })
                        })
                    })
                })
            })
        })
    })
}