import fs from "fs"
import * as xlsxtool from "songyz-xlsx"
import { zError, zLog, netGetJLGL, download, unzipFile, saveFile, createDir, copyFilesTo, removeFile } from "./utils/p_utils"

export { pri_ParseDisneylandXLSX as ParseDisneylandXLSX }

/** 解析迪士尼xlsx */
class pri_ParseDisneylandXLSX {

    private _round: number = 0
    private get round(): number {
        if (this._round >= 0xFFFFFF) {
            this._round = 0
        }
        return this._round
    }

    public parseXLSX(path: string): { bookid: string }[] {
        zLog("开始解析 ｜ " + path)

        // 过滤
        if (!path) {
            zLog("解析结束 ｜ 过滤解析路径")
            return
        }

        try {
            // 读取文件
            let wb = xlsxtool.readFile(path, {
                type: 'file'
            })

            // 解析第一个sheet
            let sheelname = wb.SheetNames && wb.SheetNames.length > 0 ? wb.SheetNames[0] : null
            let jd: any[] = sheelname ? xlsxtool.utils.sheet_to_json(wb.Sheets[sheelname]) : null

            zLog("解析结束")
            return jd
        } catch (error) {
            zError("解析失败 ｜ " + error)
            return null
        }
    }

    public reqConfig(
        bookid: string,
        callback: (data: any) => void): void {

        netGetJLGL(
            "https://fat.jiliguala.com",
            "api/game/resource/byGameId",
            { cocosEnv: "prod", gameId: bookid + "5" },
            (data: string) => {
                let json = null
                if (data != null) {
                    json = JSON.parse(data)
                }

                callback(json)
            }
        )
    }

    public reqConfig2(
        bookid: string,
        callback: (data: any) => void): void {

        netGetJLGL(
            "https://fat.jiliguala.com",
            "api/game/resource/byGameId",
            { cocosEnv: "prod", gameId: bookid + "2" },
            (data: string) => {
                let json = null
                if (data != null) {
                    json = JSON.parse(data)
                }

                callback(json)
            }
        )
    }

    public parseJson(data: any): {
        data: { id: string, words: string[], sentence: string[] },
        package: string,
        images: string[],
        sounds: string[]
    } {
        zLog("开始解析JSON")

        let script = data && data.gameConfig && data.gameConfig.script
        let pkgName = script && script.package
        let pkgConfig = pkgName && data[pkgName]

        // 过滤
        if (script == null || pkgConfig == null) {
            zError("解析JSON失败")
            return null
        }

        let bookinfo: { id: string, words: string[], sentence: string[] } =
            { id: "", words: [], sentence: [] },
            images: string[] = [], sounds: string[] = []

        // id 
        bookinfo.id = script.id

        // sections
        let sections: any[] = script.sections
        for (let i = 0; i < sections.length; i++) {
            let sec = sections[i], item = null
            if (sec.type == "Speak") {
                item = sec.speakItem

                // text
                let text: string = item.readText
                if (text.match(/\s+/g) == null) {
                    bookinfo.words.push(text)
                } else {
                    bookinfo.sentence.push(text)
                }

                // image
                images.push(item.image)

                // sound
                sounds.push(item.sound)
            }
        }

        // package url
        let pkgKeys = Object.keys(pkgConfig.assets)
        let pkgUrl = pkgConfig.packageUrl + pkgKeys[0]

        zLog("解析JSON成功")
        return { data: bookinfo, package: pkgUrl, images: images, sounds: sounds }
    }

    public parseJson2(data: any): {
        data: { bookid: string, resultImage: string[], sound: string[] },
        package: string,
        images: string[],
        sounds: string[]
    } {
        zLog("开始解析JSON")

        let script = data && data.gameConfig && data.gameConfig.script
        let pkgName = script && script.package
        let pkgConfig = pkgName && data[pkgName]

        // 过滤
        if (script == null || pkgConfig == null) {
            zError("解析JSON失败")
            return null
        }

        let bookinfo: { bookid: string, resultImage: string[], sound: string[] } =
            { bookid: "", resultImage: [], sound: [] },
            images: string[] = [], sounds: string[] = []

        // id 
        bookinfo.bookid = script.id

        // sections
        let sections: any[] = script.sections
        for (let i = 0; i < sections.length; i++) {
            let sec = sections[i], items = null
            if (sec.type == "Tap") {
                items = sec.tapItems
                for (let j = 0; j < items.length; j++) {
                    let item = items[j]

                    // resultImage
                    let resultImage: string = item.resultImage
                    bookinfo.resultImage.push(resultImage)
                    images.push(resultImage)
    
                    // sound
                    bookinfo.sound.push(item.sound)
                    sounds.push(item.sound)
                }
            }
        }

        // package url
        let pkgKeys = Object.keys(pkgConfig.assets)
        let pkgUrl = pkgConfig.packageUrl + pkgKeys[0]

        zLog("解析JSON成功")
        return { data: bookinfo, package: pkgUrl, images: images, sounds: sounds }
    }

    public downloadPkg2(path: string, bookid: string, url: string, images: string[], sounds: string[], callback: (result: boolean) => void): void {
        download(url, data => {
            if (data == null) {
                callback(false)
                return
            }

            let r = "tmpfile" + this.round, filename = r,
                matchResult = url.match(/package\/[A-Za-z0-9]+\_P\.zip\?/g)
            if (matchResult != null) {
                filename = matchResult[0].replace("package/", "").replace(".zip?", "")
            }

            // 保存zip
            let zipPath = path + "/" + filename + ".zip"
            saveFile(zipPath, data, result => {
                if (!result) {
                    callback(false)
                    return
                }

                // 解压zip
                let unzipPath = path + "/" + bookid
                unzipFile(zipPath, unzipPath, result => {
                    if (!result) {
                        callback(false)
                        return
                    }

                    let mp3Path = path + "/mp3",
                        pngPath = path + "/png"

                    let mp3FilePaths: string[] = [], pngFilePath: string[] = []
                    for (let i in images) {
                        pngFilePath.push(unzipPath + "/" + filename + "/image/" + images[i] + ".png")
                    }
                    for (let i in sounds) {
                        mp3FilePaths.push(unzipPath + "/" + filename + "/audio/" + sounds[i] + ".mp3")
                    }

                    // 创建MP3文件夹
                    createDir(mp3Path, result => {
                        if (!result) {
                            callback(false)
                            return
                        }

                        // 创建MP3文件夹
                        createDir(pngPath, result => {
                            if (!result) {
                                callback(false)
                                return
                            }

                            // copy mp3
                            copyFilesTo(mp3FilePaths, mp3Path, () => {
                                // copy png
                                copyFilesTo(pngFilePath, pngPath, () => {
                                    removeFile(zipPath)
                                    removeFile(unzipPath)
                                    callback(true)
                                })
                            })
                        })
                    })
                })
            })
        })
    }

    public downloadPkg(path: string, bookid: string, url: string, images: string[], sounds: string[], callback: (result: boolean) => void): void {
        download(url, data => {
            if (data == null) {
                callback(false)
                return
            }

            let r = "tmpfile" + this.round, filename = r,
                matchResult = url.match(/package\/[A-Za-z0-9]+\_P\.zip\?/g)
            if (matchResult != null) {
                filename = matchResult[0].replace("package/", "").replace(".zip?", "")
            }

            // 保存zip
            let zipPath = path + "/" + filename + ".zip"
            saveFile(zipPath, data, result => {
                if (!result) {
                    callback(false)
                    return
                }

                // 解压zip
                let unzipPath = path + "/" + bookid
                unzipFile(zipPath, unzipPath, result => {
                    if (!result) {
                        callback(false)
                        return
                    }

                    let mp3Path = unzipPath + "/MP3",
                        pngPath = unzipPath + "/PNG"

                    let mp3FilePaths: string[] = [], pngFilePath: string[] = []
                    for (let i in images) {
                        pngFilePath.push(unzipPath + "/" + filename + "/image/" + images[i] + ".png")
                    }
                    for (let i in sounds) {
                        mp3FilePaths.push(unzipPath + "/" + filename + "/audio/" + sounds[i] + ".mp3")
                    }

                    // 创建MP3文件夹
                    createDir(mp3Path, result => {
                        if (!result) {
                            callback(false)
                            return
                        }

                        // 创建MP3文件夹
                        createDir(pngPath, result => {
                            if (!result) {
                                callback(false)
                                return
                            }

                            // copy mp3
                            copyFilesTo(mp3FilePaths, mp3Path, () => {
                                // copy png
                                copyFilesTo(pngFilePath, pngPath, () => {
                                    // removeFile(zipPath)
                                    removeFile(unzipPath + "/__MACOSX")
                                    removeFile(unzipPath + "/" + filename)
                                    callback(true)
                                })
                            })
                        })
                    })
                })
            })
        })
    }

    public outputJson(path: string, data: { id: string, words: string[], sentence: string[] }[], callback: Function): void {
        zLog("JSON 开始生成")

        // 过滤
        if (data == null) {
            zError("JSON 文件生成失败 | " + path + " | 过滤数据")
            callback()
            return
        }

        let str = ""
        try {
            str = JSON.stringify(data)
        } catch (error) {
            zError("JSON 文件生成失败 | " + path + " | " + error)
            callback()
            return
        }

        fs.writeFile(path, str, (error) => {
            if (error != null) {
                zError("JSON 文件生成失败 | " + path + " | " + error)
                callback()
                return
            }

            zLog("JSON 文件生成成功")
            callback()
        })
    }
}