import fs from "fs"
import gm from "gm"
import path from "path"
import plist from "plist"
import * as waittime from "./s_waittime"
import * as copyfile from "./s_copyfile"

/**
 * 更改图片尺寸
 * @param jsonPath 
 * @return 是否成功
 */
export function pri_ChangeImgSize(jsonPath: string): Promise<any> {
    return gChangeImgSize.Run(jsonPath)
}

/**更改图片尺寸 */
class ChangeImgSize {
    private handleQueue: { plist: string, img: string, size: number[] }[] = []  // 处理队列
    private errlist: { url: string, info: string }[] = []  // 错误信息列表
    private successlist: { url: string, rate: number, type: string }[] = []  // 成功列表
    private filterlist: { url: string, type: string }[] = []  // 过滤列表
    private outLogPath: string = ""  // 日志输出目录
    private outErrName: string = "change_img_size_err"  // 图片信息输出文件名
    private outSuccessName: string = "change_img_size_success"  // 图片信息输出文件名
    private compFlag: boolean = false  // 完成标志

    constructor() {
    }

    /**
     * 运行
     * @param jsonPath
     * @return 是否成功
     */
    public Run(jsonPath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            // 设置日志输出目录
            this.outLogPath = path.dirname(jsonPath)

            // 读取json
            let fjson = fs.readFileSync(jsonPath, "utf-8")
            let data: { url: string, size: number[] }[] = JSON.parse(fjson)

            // 读取根目录
            for (let i in data) {
                this.readDir(data[i].url, data[i].size)
            }
            console.log(`搜索到需要处理的文件数:${this.handleQueue.length}`)

            // 处理队列
            if (this.handleQueue.length > 0) {
                this.doHandleQueue()
            } else {
                this.readComplete()
            }

            // 构造检测完成函数
            let doCheckComp = () => {
                if (this.compFlag) {
                    resolve(this.errlist.length ? false : true)
                    return
                }

                setTimeout(() => {
                    doCheckComp()
                }, 100);
            }

            // 执行
            doCheckComp()
        }).catch((err) => {
            console.error(err)
            return false
        })
    }

    /**
     * 读取文件夹
     * @param url 
     * @param size 
     */
    private readDir(url: string, size: number[]) {
        let dirpath = path.dirname(url)
        let targetext = path.extname(url)
        let targetname = path.basename(url, targetext)
        let files = fs.readdirSync(dirpath)
        let fplist = ""

        for (let fname of files) {
            let fextname = path.extname(fname)
            let fbasename = path.basename(fname, fextname)

            // 判断是否是plist文件
            if (fextname == ".plist" && targetname == fbasename) {
                // plist路径
                fplist = dirpath + "/" + fname
                break
            }
        }

        // 保存路径
        this.handleQueue.push({
            plist: fplist,
            img: url,
            size: size
        })
    }

    /**
     * 处理队列
     */
    private doHandleQueue() {
        // // 拷贝文件
        // if (this.handleQueue.length > 0) {
        //     let d = this.handleQueue.shift()
        //     copyfile.pri_CopyFile(d.img, "./res")
        //         .then(() => {
        //             return !d.plist ? true : copyfile.pri_CopyFile(d.plist, "./res")
        //         })
        //         .then(() => {
        //             this.doHandleQueue()
        //         })
        // } else {
        //     this.compFlag = true
        //     console.log("拷贝完成")
        // }
        // return

        try {
            let d = this.handleQueue.shift()
            if (d.plist) {
                // this.readPlist(d)
                // plist手动调整
                this.filterlist.push({ url: d.img, type: "atlas" })
                if (this.handleQueue.length > 0) {
                    this.doHandleQueue()
                } else {
                    this.readComplete()
                }
            } else {
                this.setSingleScale(d.img, d.size)
            }
        } catch (err) {
            // 加入错误列表
            if (err.url && err.info) {
                this.errlist.push({ url: err.url, info: err.info })
            } else {
                this.errlist.push({ url: "", info: err })
            }
            this.readComplete()
        }
    }

    /**
     * 读取plist
     * @param data
     */
    private readPlist(data: { plist: string, img: string, size: number[] }) {
        let fxml = fs.readFileSync(data.plist, "utf-8")
        let fplist = plist.parse(fxml)

        let frames = fplist["frames"]
        let metadata = fplist["metadata"]

        // 缩放比例
        let oriSize = this.getArrayFromStr(metadata["size"])
        let rate = oriSize[0] > oriSize[1] ? oriSize[0] / 2048 : oriSize[1] / 2048
        rate = Math.ceil(rate)

        // 过滤
        if (rate <= 1) {
            // 抛出错误
            throw { url: data.img, info: `缩放比例错误: ${rate}` }
        }

        // 设置合图尺寸
        metadata["size"] = this.setStrFromArray(oriSize.map(x => x / rate))

        // 设置纹理信息
        for (let i in frames) {
            let f = frames[i]

            // 旋转
            let rotated: boolean = f["rotated"]

            // 设置frame
            let frame: number[][] = this.getArrayFromStr(f["frame"])
            frame = frame.map((arg: number[]) => {
                return arg.map(x => x / rate)
            })
            // 修正frame值(旋转为true且尺寸有小数需要偏移)
            if (rotated && frame[1][0] % 1 != 0) {
                frame[0][0] += 1
            } else if (!rotated && frame[1][1] % 1 != 0) {
                frame[0][1] -= 1
            }
            f["frame"] = this.setStrFromArray(frame)

            // 设置sourceColorRect
            let sourceColorRect: number[][] = this.getArrayFromStr(f["sourceColorRect"])
            sourceColorRect = sourceColorRect.map((arg: number[]) => {
                return arg.map(x => x / rate)
            })
            f["sourceColorRect"] = this.setStrFromArray(sourceColorRect)

            // 设置尺寸
            let sourceSize = this.getArrayFromStr(f["sourceSize"])
            sourceSize = sourceSize.map(x => x / rate)
            f["sourceSize"] = this.setStrFromArray(sourceSize)

            // 设置offset
            let x1 = sourceColorRect[0][0] + sourceColorRect[1][0] / 2
            let y1 = sourceSize[1] - sourceColorRect[0][1] - sourceColorRect[1][1] / 2
            let x2 = sourceSize[0] / 2
            let y2 = sourceSize[1] / 2
            let offset = [x1 - x2, y1 - y2]
            f["offset"] = this.setStrFromArray(offset)
        }

        // 缩放图片
        this.setAtlasScale(data.plist, data.img, rate, fplist)
    }

    /**
     * 设置图集缩放
     * @param plistUrl
     * @param imgUrl
     * @param rate
     * @param fplist
     */
    private setAtlasScale(plistUrl: string, imgUrl: string, rate: number, fplist: plist.PlistValue) {
        gm(imgUrl)
            .minify(rate)
            .quality(100)
            .write(imgUrl, (err: Error) => {
                if (err) {
                    // 抛出错误
                    throw { url: imgUrl, info: `图片缩放失败: ${err}` }
                } else {
                    // 输出plist
                    let plistStream = fs.createWriteStream(plistUrl)
                    plistStream.write(plist.build(fplist))
                    plistStream.close()

                    // 加入成功列表
                    let dirpath = path.dirname(imgUrl)
                    let targetext = path.extname(imgUrl)
                    let targetname = path.basename(imgUrl, targetext)
                    this.successlist.push({ url: dirpath + "/" + targetname, rate: rate, type: "atlas" })
                }

                console.log(`执行完毕，${err ? "失败" : "成功"}！ 成功:${this.successlist.length}  失败:${this.errlist.length}  剩余:${this.handleQueue.length}`)

                // 检测图集队列是否为空
                if (this.handleQueue.length == 0) {
                    this.readComplete()
                } else { // 继续执行
                    setTimeout(() => {
                        this.doHandleQueue()
                    }, 0)
                }
            })
    }

    /**
     * 设置单图缩放
     * @param imgUrl 
     * @param size 
     */
    private setSingleScale(imgUrl: string, size: number[]) {
        // 缩放比例
        let rate = size[0] > size[1] ? size[0] / 2048 : size[1] / 2048
        rate = Math.ceil(rate)

        // 过滤
        if (rate <= 1) {
            // 抛出错误
            throw { url: imgUrl, info: `缩放比例错误: ${rate}` }
        }

        gm(imgUrl)
            .minify(rate)
            .quality(100)
            .write(imgUrl, (err: Error) => {
                if (err) {
                    // 抛出错误
                    throw { url: imgUrl, info: `图片缩放失败: ${err}` }
                } else {
                    // 加入成功列表
                    let dirpath = path.dirname(imgUrl)
                    let targetext = path.extname(imgUrl)
                    let targetname = path.basename(imgUrl, targetext)
                    this.successlist.push({ url: dirpath + "/" + targetname, rate: rate, type: "img" })
                }

                console.log(`执行完毕，${err ? "失败" : "成功"}！ 成功:${this.successlist.length} 失败:${this.errlist.length} 剩余:${this.handleQueue.length} `)

                // 检测图集队列是否为空
                if (this.handleQueue.length == 0) {
                    this.readComplete()
                } else { // 继续执行
                    setTimeout(() => {
                        this.doHandleQueue()
                    }, 0)
                }
            })
    }

    /**
     * 读取完毕
     */
    private async readComplete() {
        // 错误信息输出文件流
        let errStream = fs.createWriteStream(this.outLogPath + "/" + this.outErrName + ".txt")
        for (let i in this.errlist) {
            errStream.write(`${this.errlist[i].url}  错误信息: ${this.errlist[i].info} \r\n`)
        }
        errStream.close()

        // 成功信息输出文件流
        let successStream = fs.createWriteStream(this.outLogPath + "/" + this.outSuccessName + ".txt")
        for (let i in this.successlist) {
            successStream.write(`${this.successlist[i].url}  文件类型: ${this.successlist[i].type}  缩小倍数: ${this.successlist[i].rate} \r\n`)
        }
        if (this.successlist.length > 0) {
            successStream.write("\r\n\r\n\r\n")
        }
        if (this.filterlist.length > 0) {
            successStream.write("以下这些需要手动处理:\r\n")
            for (let i in this.filterlist) {
                successStream.write(`${this.filterlist[i].url}  文件类型: ${this.filterlist[i].type} \r\n`)
            }
        }
        successStream.close()

        console.log(`文件读取完毕，${this.errlist.length} 个错误！`)

        // 休眠1s，等待文本保存
        await waittime.pri_Sleep(1000)

        // 设置完成标志
        this.compFlag = true
    }

    /**
     * 将{a, b}字符串转换成[a, b]数组
     * @param str 
     */
    private getArrayFromStr(str: string): any[] {
        let newStr = ""
        try {
            for (var i = 0; i < str.length; i++) {
                let char = str[i]
                if (str[i] == '{') {
                    char = '['
                } else if (str[i] == '}') {
                    char = ']'
                }
                newStr += char
            }
        } catch (err) {
            console.error("function run wrong:getArrayFromStr, Error:", err)
            return null
        }

        return JSON.parse(newStr)
    }

    /**
     * 将[a, b]数组转换成{a, b}字符串
     * @param arg 
     */
    private setStrFromArray(arg: any[]): string {
        let str = "{"
        for (let i = 0; i < arg.length; i++) {
            str += Array.isArray(arg[i]) ? this.setStrFromArray(arg[i]) : arg[i]
            str += i < arg.length - 1 ? "," : ""
        }
        str += "}"
        return str
    }
}

let gChangeImgSize: ChangeImgSize = new ChangeImgSize()