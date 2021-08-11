import fs from "fs"
import path from "path"
import imagesizeof from "image-size"
import * as waittime from "./s_waittime"


/**
 * 获取图片信息
 * @param rootPath 
 * @param outPath 
 * @return 是否成功
 */
export function pri_GetImageInfo(rootPath: string, outPath: string): Promise<any> {
    return gGetImageInfo.Run(rootPath, outPath)
}

/**获取图片信息 */
class GetImageInfo {
    private rootPath: string = ""  // 搜索根目录
    private outPath: string = ""  // 输出目录
    private errlist: { url: string, info: string }[] = [] // 错误信息列表
    private outImgName: string = "big_imgs"  // 图片信息输出文件名
    private outErrName: string = "get_img_err"  // 图片信息输出文件名
    private imageExtname: { [extname: string]: boolean } = {  // 图片信息输出文件名
        ".png": true,
        ".jpg": true
    }
    private bigimgs: { url: string, size: { h: number, w: number } }[] = []  // 图片尺寸大于2048 * 2048的图片集合
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
        this.rootPath = rootPath
        this.outPath = outPath

        return new Promise((resolve: Function, reject: Function) => {
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
            this.readComplete()
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
                this.readImage(fpath)
                continue
            }
        }
    }

    /**
     * 读取图片
     * @param url 
     */
    private readImage(url: string) {
        try {
            let imgsize = imagesizeof.imageSize(url)

            // 添加到图片集合里
            if (imgsize.height > 2048 || imgsize.width > 2048) {
                this.bigimgs.push({ url: url, size: { h: imgsize.height, w: imgsize.width } })
            }
        } catch (err) {
            // 加入错误列表
            this.errlist.push({ url: url, info: err.toString() })
        }
    }

    /**
     * 读取完毕
     */
    private async readComplete() {
        // 图片信息输出文件流
        let imgTxtStream = fs.createWriteStream(this.outPath + "/" + this.outImgName + ".txt")
        let imgJson = []
        for (let i in this.bigimgs) {
            imgTxtStream.write(`${this.bigimgs[i].url}   size(${this.bigimgs[i].size.h}, ${this.bigimgs[i].size.w})\r\n`)
            imgJson.push({
                url: this.bigimgs[i].url,
                size: [this.bigimgs[i].size.h, this.bigimgs[i].size.w]
            })
        }
        imgTxtStream.write(`\r\n\r\n文件数量: ${Object.keys(this.bigimgs).length}`)
        imgTxtStream.close()

        // 输出json
        let imgJsonStream = fs.createWriteStream(this.outPath + "/" + this.outImgName + ".json")
        imgJsonStream.write(JSON.stringify(imgJson, null, '\t'))
        imgJsonStream.close()

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

let gGetImageInfo: GetImageInfo = new GetImageInfo()