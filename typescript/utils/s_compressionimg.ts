import fs from "fs"
import path from "path"
import * as waittime from "./s_waittime"

/**
 * 更改图片尺寸
     * @param rootPath 
     * @param outPath 
 * @return 是否成功
 */
export function pri_CompressionImg(rootPath: string, outPath: string): Promise<any> {
    return gCompressionImg.Run(rootPath, outPath)
}

/**压缩图片 */
class CompressionImg {
    private rootPath: string = ""  // 搜索根目录
    private outPath: string = ""  // 输出目录
    private handleQueue: string[] = []  // 处理队列
    private successlist : {url: string}[] = []  // 成功列表
    private errlist: { url: string, info: string }[] = []  // 错误信息列表
    private outErrName: string = "compression_img_err"  // 图片信息输出文件名
    private imageExtname: { [extname: string]: boolean } = {  // 图片信息输出文件名
        ".png": true,
        ".jpg": true
    }
    private compFlag: boolean = false // 完成标志

    constructor() {
    }

    /**
     * 运行
     * @param rootPath 
     * @param outPath 
     * @return 是否成功
     */
    public Run(rootPath: string, outPath: string): Promise<any> {
        // 设置搜索根目录
        this.rootPath = rootPath
        // 设置日志输出目录
        this.outPath = path.dirname(outPath)

        return new Promise((resolve, reject) => {
            // 读取根目录
            this.readDir(this.rootPath)

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

            // 检测等待队列是否为空
            if (this.handleQueue.length == 0) {
                this.readComplete()
            } else {
                this.doHandleQueue()
            }
        }).catch((err) => {
            console.error(err)
            return false
        })
    }

    /**
     * 读取文件夹
     * @param url 
     */
    private readDir(url: string) {
        let files = fs.readdirSync(url)

        for (let fname of files) {
            // 文件路径
            let fpath = url + "/" + fname
            // 文件状态
            let fstate = fs.lstatSync(fpath)

            // 判断是否是文件夹
            if (fstate.isDirectory()) {
                this.readDir(fpath)
                continue
            }

            // 判断是否是图片
            let fextname = path.extname(fname)
            if (this.imageExtname[fextname]) {
                // 添加到处理队列
                this.handleQueue.push(fpath)        
                continue
            }
        }
    }

    /**
     * 处理队列
     */
    private doHandleQueue() {
        try {
            let d = this.handleQueue.shift()
            this.compressionImg(d)
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
     * 压缩图片
     * @param url 
     */
    private compressionImg(url: string) {
        // 检测图集队列是否为空
        if (this.handleQueue.length == 0) {
            this.readComplete()
        } else { // 继续执行
            setTimeout(() => {
                this.doHandleQueue()
            }, 0)
        }
    }

    /**
     * 读取完毕
     */
    private async readComplete() {
        // 错误信息输出文件流
        let errStream = fs.createWriteStream(this.outPath + "/" + this.outErrName + ".txt")
        for (let i in this.errlist) {
            errStream.write(`${this.errlist[i].url}   ${this.errlist[i].info}\r\n`)
        }
        errStream.close()

        console.log(`文件读取完毕，${this.errlist.length}个错误！`)

        // 休眠1s，等待文本保存
        await waittime.pri_Sleep(1000)

        // 设置完成标志
        this.compFlag = true
    }
}

let gCompressionImg = new CompressionImg()