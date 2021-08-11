

/**
 * 休眠
 * @param time ms
 */
export function pri_Sleep(time: number): Promise<any> {
    return gWaitTime.Sleep(time)
}


/**等待 */
class WaitTime {
    constructor() {
    }

    /**
     * 休眠
     * @param time ms
     */
    public Sleep(time: number): Promise<any> {
        return new Promise((resolve, reject) => {
            // 过滤
            if (!time || typeof time !== "number" || time < 0) {
                resolve(null)
                return
            }

            setTimeout(() => {
                resolve(null)
            }, time)
        })
    }
}

let gWaitTime = new WaitTime()