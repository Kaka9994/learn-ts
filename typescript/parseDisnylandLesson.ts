import fs from "fs"
import readline from "readline"
import { zError, zLog } from "./utils/p_utils"

export { pri_ParseDisnylandLesson as ParseDisnylandLesson }

/** 解析迪士尼课程 */
class pri_ParseDisnylandLesson {

    private _rl: readline.Interface = null
    private _jsonList: any[] = []

    public parseLesson(path: string, callback: (data: string[][]) => void): void {
        if (this._rl != null) {
            zError("请创建新的解析工具")
            return
        }

        zLog("开启读取")

        this._rl = readline.createInterface(fs.createReadStream(path))
        this._jsonList = []
        let arr: string[] = []

        // 匹配/* xxx */
        let reg1 = /\/\*\s[0-9]{1,}\s\*\//g
        // 匹配NumberLong(xxx)
        let reg2 = /NumberLong\([0-9]{1,}\)/g
        let isok = false

        // 读取监听
        this._rl.on("line", (data: string) => {
            let result = data.match(reg1)
            if (result != null) {
                let json = this._mergeStrListToJson(arr)
                if (json != null) {
                    this._jsonList.push(json)
                }
                arr.length = 0
                return
            }

            result = data.match(reg2)
            if (result != null) {
                data = data.replace("NumberLong(", "").replace(")", "")
            }

            arr.push(data)
        })

        // 关闭监听
        this._rl.once("close", () => {
            zLog("关闭读取")
            this._rl.removeAllListeners()
            this._rl = null

            let json = this._mergeStrListToJson(arr)
            if (json != null) {
                this._jsonList.push(json)
            }
            arr.length = 0

            let output: string[][] = [["bookid", "title", "CHNtitle"]]
            for (let i in this._jsonList) {
                let obj = this._jsonList[i]
                if (obj != null) {
                    output.push([obj["_id"], obj["ttl"], obj["cttl"]])
                }
            }
            
            callback(output)
        })
    }

    private _mergeStrListToJson(arr: string[]): any {
        if (arr.length <= 0) {
            return null
        }

        let jsonStr = arr.join("")
        return jsonStr ? JSON.parse(jsonStr) : null
    }
}