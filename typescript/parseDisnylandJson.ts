import fs from "fs"
import jsonfile from "jsonfile"
import { zError, zLog } from "./utils/p_utils"

export { pri_ParseDisneylandJson as ParseDisneylandJson }

/** 解析迪士尼json */
class pri_ParseDisneylandJson {

    /** 标题 */
    public readonly bookInfoTitle = [
        "book", "ShowStyle（左右布局填1，上下不填）", "wordStyle（收词填1，不收空着不填）", "page", "imageID", "locstamp", "block",
        "needLoc（需要坐标填1，其余空着）", "needRecord（跟读填1，其余不填）", "audioID", "timesta+L+B:K", "Text",
        "word（在读本中出现的文本）", "词性", "word（在单词卡中出现的文本）", "wordID", "备注-备注图片拼接方法等", "配图元素参考"
    ]
    /** 默认值(key: 对应的列数,从0开始数, value: 默认值) */
    public readonly bookDef = { 1: "", 2: "", 5: "", 7: "", 8: "1", 10: "", 12: "", 13: "", 14: "", 15: "", 16: "", 17: "" }

    /** 标题 */
    public readonly csvTitle = ["Name	Start	Duration	Time Format	Type	Description"]

    /** 特殊处理text里的字符 */
    // public readonly speSigns = { "Â": "", "â": ".", "": ".", "¦": "." }

    /**
     * 解析
     * @param filepath 
     */
    public parse(
        filepath: string,
        callback: (data: { bookinfo: Array<any>[], csvinfos: { [sentenceid: string]: Array<any>[] }, zipinfo: string, bookid: string }) => void
    ): void {
        zLog("开始解析 | " + filepath)

        jsonfile.readFile(filepath, (err, jsonData: any) => {
            if (err != null) {
                zError("解析失败 | " + err)
                callback(null)
                return
            }

            let temp = this._getParseJson(jsonData)
            if (temp != null) {
                zLog("解析成功 | " + filepath)
                callback(temp)
            } else {
                zError("解析失败")
                callback(null)
            }
        })

        // fs.readFile(filepath, (err, buf: ArrayBuffer) => {
        //     if (err != null) {
        //         zError("解析失败 | " + err)
        //         callback(null)
        //         return
        //     }

        //     let str = this._ab2str(buf),
        //         data = JSON.parse(str)

        //     let temp = this._getParseJson(data)
        //     if (temp != null) {
        //         zLog("解析成功 | " + filepath)
        //         callback(temp)
        //     } else {
        //         zError("解析失败")
        //         callback(null)
        //     }
        // })
    }

    private _getParseJson(data: any): {
        bookinfo: Array<any>[],
        csvinfos: { [sentenceid: string]: Array<any>[] },
        zipinfo: string,
        bookid: string
    } {
        let bookinfo: Array<any>[] = []
        bookinfo.push(this.bookInfoTitle)
        let csvinfos: { [sentenceid: string]: Array<any>[] } = {}
        let bookid = ""

        // _id
        let result = this._getValueByPaths(data, ["data", "_id"])
        if (result.error != null) {
            zError(result.error)
            return null
        } else {
            bookid = result.data
        }

        // page
        result = this._getValueByPaths(data, ["data", "pages"])
        if (result.error != null) {
            zError(result.error)
            return null
        } else {
            // book
            let pages = result.data
            if (pages.length <= 0 || pages[0]["pageid"] == null) {
                zError("pageid获取失败")
                return null
            } else {
                let tmp = this._getListByLen(this.bookInfoTitle.length)
                tmp[0] = pages[0]["pageid"].slice(0, 7)
                bookinfo.push(tmp)
            }

            let pageresult = this._parsePages(bookinfo, csvinfos, result.data)
            if (!pageresult) {
                return null
            }
        }

        // zipinfo
        let zipinfo: string = ""
        result = this._getValueByPaths(data, ["data", "packages"])
        if (result.error != null) {
            zError(result.error)
            return null
        } else {
            zipinfo = result.data[0]
        }

        return { bookinfo: bookinfo, csvinfos: csvinfos, zipinfo: zipinfo, bookid: bookid };
    }

    private _parsePages(bookinfo: Array<any>[], csvinfos: { [sentenceid: string]: Array<any>[] }, pages: any[]): boolean {
        let curIndex = 1
        for (let i = 0, count = pages.length; i < count; i++) {
            // 获取page
            let page = pages[i]

            // 获取列
            if (curIndex >= bookinfo.length) {
                bookinfo.push(this._getListByLen(this.bookInfoTitle.length))
            }
            let list = bookinfo[curIndex]

            // pageid
            let result = this._getValueByPaths(page, ["pageid"])
            if (result.error != null) {
                zError(result.error)
                return false
            } else {
                list[3] = result.data
            }

            // imageID
            result = this._getValueByPaths(page, ["image"])
            if (result.error != null) {
                zError(result.error)
                return false
            } else {
                list[4] = result.data
            }

            // sentences
            result = this._getValueByPaths(page, ["sentences"])
            if (result.error != null) {
                zError(result.error)
                return false
            } else {
                curIndex = this._parseSentences(bookinfo, csvinfos, result.data, curIndex)
            }

            // 错误过滤
            if (curIndex == -1) {
                return false
            }

            curIndex++;
        }
        return true
    }

    private _parseSentences(bookinfo: Array<any>[], csvinfos: { [sentenceid: string]: Array<any>[] }, sentences: any[], curIndex: number): number {
        for (let i = 0, count = sentences.length; i < count; i++) {
            let csvinfo: Array<any>[] = []
            csvinfo.push(this.csvTitle)

            // 获取sentence
            let sentence = sentences[i]

            // 获取列
            if (curIndex >= bookinfo.length) {
                bookinfo.push(this._getListByLen(this.bookInfoTitle.length))
            }
            let list = bookinfo[curIndex]

            // sentenseid
            let result = this._getValueByPaths(sentence, ["sentenseid"])
            if (result.error != null) {
                zError(result.error)
                return -1
            } else {
                list[6] = result.data
            }

            // audioID
            result = this._getValueByPaths(sentence, ["audio"])
            let audioid = ''
            if (result.error != null) {
                zError(result.error)
                return -1
            } else {
                list[9] = result.data
                audioid = result.data
            }

            // Text
            result = this._getValueByPaths(sentence, ["text"])
            if (result.error != null) {
                zError(result.error)
                return -1
            } else {
                list[11] = result.data

                // // 清除一些错误字符
                // for (let j in this.speSigns) {
                //     let sign = this.speSigns[j]
                //     list[11] = list[11].replace(j, sign)
                // }
            }

            // guides
            result = this._getValueByPaths(sentence, ["guides"])
            if (result.error != null) {
                zError(result.error)
                return -1
            } else {
                let guides: any[] = result.data, guidesCount = guides.length
                for (let j = 0; j < guidesCount; j++) {
                    // timestamp
                    result = this._getValueByPaths(guides[j], ["timestamp"])
                    if (result.error != null) {
                        zError(result.error)
                        return -1
                    } else {
                        csvinfo.push([`标记 0${j}	${result.data}	0:00.000	decimal	Cue	`])
                    }
                }
            }

            csvinfos[audioid] = csvinfo

            if (i < count - 1) {
                curIndex++
            }
        }
        return curIndex
    }

    /**
     * 获取路径对应的字段值
     * @param data json数据
     * @param paths 路径列表
     * @return 字段值
     */
    private _getValueByPaths(data: any, paths: string[]): { error: string, data: any } {
        let temp = data, url = ""
        for (let i = 0, count = paths.length; i < count; i++) {
            temp = temp[paths[i]]
            url = url + "/" + paths[i]
            if (temp == null && i == count - 1) {
                return { error: url + "字段找不到", data: null }
            }
        }
        return { error: null, data: temp }
    }

    /**
     * 获取对应长度的列表
     * @param len 
     * @return 列表
     */
    private _getListByLen(len: number): string[] {
        let list: string[] = []
        for (let i = 0; i < len; i++) {
            list.push(i in this.bookDef ? this.bookDef[i] : "")
        }
        return list
    }

    /**
     * ArrayBuffer转为字符串
     * @param buf 
     * @return 字符串
     */
    private _ab2str(buf: ArrayBuffer): string {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }
}