// import * as utils from "./utils/p_utils"
// import * as mathjs from "mathjs"
import { mainParseDisnylandJson, mainParseDisnylandXLSX, mainParseDisnylandXLSX2 } from "./tmp"
import {
    download, saveFile, unzipFile, copyFilesTo, removeFile,
    createDir, zError, zLog, getExePath, netGetJLGL, netGetGGLibrary, buildParamsUrl
} from "./utils/p_utils"

function main(): void {
    // let exePath = getExePath()

    mainParseDisnylandXLSX()
    // mainParseDisnylandJson()
    // mainParseDisnylandXLSX2()
}

main()

// setTimeout(() => { }, 999999)