import fs from "fs"
import http from 'http'
import https from 'https'
import { zError, zLog, zWarn } from "../utils/p_utils"

export { netGet as netGet }
export { netGetJLGL as netGetJLGL }
export { netGetGGLibrary as netGetGGLibrary }
export { buildParamsUrl as buildParamsUrl }

class NetOptions {
    public protocol: string = ''
    public host: string = ''
    public path: string = ''
    public method: string = ''
    public timeout: number = 5000
    public headers: { [key: string]: string } = null
}

function netGet(host: string, path: string, params: { [key: string]: any }, callback: (data: string) => void): void {
    let options = getOptions(host, path, params)
    options.method = "GET"

    httpGet(options, callback)
}

function netGetJLGL(host: string, path: string, params: { [key: string]: any }, callback: (data: string) => void): void {
    let options = getOptions(host, path, params)
    options = getJLGLOptions(options)
    options.method = "GET"

    // https://prod.jiliguala.com/api/game/resource/byGameId

    httpGet(options, callback)
}

function netGetGGLibrary(host: string, path: string, params: { [key: string]: any }, callback: (data: string) => void): void {
    let options = getOptions(host, path, params)
    options = getGGLibraryOptions(options)
    options.method = "GET"

    // https://fatggr.jiliguala.com/resource/manifest/xxx.manifest

    httpGet(options, callback)
}

function httpGet(options: NetOptions, callback: (data: string) => void): void {
    zLog("开始请求 HTTP GET | " + options.host + options.path)

    let req = https.request(
        options,
        (res: http.IncomingMessage) => {
            var data = ""
            res.setEncoding("utf-8")

            res.on("data", (chuck) => {
                data += chuck
            })

            res.on("end", () => {
                zLog("请求结束 HTTP GET")
                callback(data)
            })
        }
    )

    req.setTimeout(options.timeout, () => {
        req.destroy(new Error("请求超时"))
    })

    req.on("error", (error: Error) => {
        zError("请求失败 HTTP GET | " + error)
        callback(null)
    })

    req.end()
}

function getOptions(host: string, path: string, params: { [key: string]: any }): NetOptions {
    let hasHttp = host.indexOf("http") == 0,
        isHttps = host.indexOf("https") == 0;

    host = hasHttp ? host.slice(isHttps ? 8 : 7) : host
    path = '/' + path + (params ? '?' + buildParamsUrl(params) : '')

    let options = new NetOptions()
    options.protocol = isHttps ? 'https:' : 'http'
    options.host = host
    options.path = path
    options.timeout = 5000
    options.headers = {
        "Content-Type": "application/json"
    }

    return options
}

function getJLGLOptions(options: NetOptions): NetOptions {
    if (options.headers == null) {
        options.headers = {}
    }

    options.headers["Authorization"] = "Basic OGI5NGE1MjAxMzQxNGY2MmI1Njk4NTA0OWYxNWM3ZGU6MzZhMzEzMGVmNzYyNDU0MDk4OTJhYTIyZDc5OWYyZjI="

    return options
}

function getGGLibraryOptions(options: NetOptions): NetOptions {
    if (options.headers == null) {
        options.headers = {}
    }

    options.headers["Authorization"] = "Basic OGI5NGE1MjAxMzQxNGY2MmI1Njk4NTA0OWYxNWM3ZGU6MzZhMzEzMGVmNzYyNDU0MDk4OTJhYTIyZDc5OWYyZjI="
    options.headers["GGHeaderMap"] = "XXB3ZNeSGVXfutsahrMz8/xIHUOzEGpkVqZWm19vew1asmpgMGz1gDdosikPL6GcPm+bCoYmw3blhVyHvYanpy6qqXfmKeP9+nLD1Frsp2mlDCqkZ5ZdWccdyitN0A/Ez13lxwPug5TAD8WgihnHjTXOpcvU7WzVYVLhf9ZR8X9yA+xcrYby2l9zxxwCMe+3UXnfBsbYDgHVGGEqg7/S8vROitYegP2hITGxTnO35aS/iAOK"

    return options
}

function buildParamsUrl(obj: any): string {
    // 如果参数的array 有值 说明是一个纯数组参数  特殊处理
    if (obj['array']) {

        let key = obj['array']
        let value = obj[key]
        let valueStr: string = ''

        value.forEach((item) => {
            if (valueStr == '') {
                valueStr = key + '=' + item
            } else {
                valueStr = valueStr + '&' + key + '=' + item
            }
        })

        let url: string = valueStr

        return url

    } else {
        let parirs: string[] = [];
        for (let i in obj) {
            let value = obj[i], key = i
            let valueStr: string = ''
            if (typeof value === 'string') {
                valueStr = value
            } else if (typeof value === 'number') {
                valueStr = value.toString()
            } else if (typeof value === 'boolean') {
                valueStr = value.toString()
            }
            if (typeof value === 'object') {
                valueStr = JSON.stringify(value)
            }

            parirs.push(key + '=' + valueStr)
        }

        let url: string = parirs.join('&')

        return url
    }
}