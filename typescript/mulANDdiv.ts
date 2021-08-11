

/**
 * 乘法
 * @param a 被乘数（+）
 * @param b 乘数（+）
 * @return 积
 */
function mul(a: number, b: number): number {
    // 被乘数位数
    let len: number = 0
    while ((a >> len) != 0) {
        len++
    }

    // 积
    let result: number = 0
    let tmpLen: number = len

    // 被乘数低位到高位依次计算，
    // 若第n位为1，则乘数左移n位，记为此步结果；
    // 若为0，则记此步结果为0。
    while (tmpLen > 0) {
        // 当前位与1相与
        let subBit: number = (a >> (len - tmpLen)) & 1
        // 当前步结果
        let subResult: number = subBit == 1 ? (b << (len - tmpLen)) : 0

        // 每一步结果相加
        result += subResult

        tmpLen--
    }

    return result
}

/**
 * 除法
 * @param a 被除数（+）
 * @param b 除数（+）
 * @return result:商，remainder:余数
 */
function div(a: number, b: number): { result: number, remainder: number } {
    // 被除数位数
    let len: number = 0
    while ((a >> len) != 0) {
        len++
    }

    // 余数
    let remainder: number = 0
    // 商
    let result: number = 0

    // 被除数的高位到低位依次与除数进行比较，
    // 若大与等于除数，则记此步结果为1，并求得余数；
    // 若小与除数，则将上一步的余数左移一位加上余数再次比较。
    while (len > 0) {
        // 当前位与1相与
        let subBit: number = (a >> (len - 1)) & 1
        // 当前步除数
        let step: number = ((remainder << 1) + subBit)
        // 当前步结果
        let subResult: number = step < b ? 0 : 1
        // 余数
        remainder = step < b ? step : step - b

        // 每一步结果相加
        result += subResult << (--len)
    }

    return { result: result, remainder: remainder }
}