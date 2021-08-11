import fs from "fs"
import path from "path"


/**
 * 剪切文件
 * @param rootPath 
 * @param outPath 
 * @return 是否成功
 */
export function pri_CutFile(rootPath: string, outPath: string): Promise<any> {
    return gCopyFile.Cut(rootPath, outPath)
}

/**
 * 拷贝文件
 * @param rootPath 
 * @param outPath 
 * @return 是否成功
 */
export function pri_CopyFile(rootPath: string, outPath: string): Promise<any> {
    return gCopyFile.Copy(rootPath, outPath)
}

/**拷贝文件 */
class CopyFile {
    constructor() {
    }

    /**
     * 剪切
     * @param rootPath 
     * @param outPath 
     */
    public Cut(rootPath: string, outPath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let fbasename = path.basename(rootPath)
            fs.rename(rootPath, outPath + "/" + fbasename, (err) => {
                if (err) {
                    console.error(err)
                    resolve(false)
                    return
                }
                resolve(true)
            })
        }).catch((err) => {
            console.error(err)
            return false
        })
    }

    /**
     * 拷贝
     * @param rootPath 
     * @param outPath 
     */
    public Copy(rootPath: string, outPath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let fbasename = path.basename(rootPath)
            fs.copyFile(rootPath, outPath + "/" + fbasename, (err) => {
                if (err) {
                    console.error(err)
                    resolve(false)
                    return
                }
                resolve(true)
            })
        }).catch((err) => {
            console.error(err)
            return false
        })
    }
}

let gCopyFile = new CopyFile()