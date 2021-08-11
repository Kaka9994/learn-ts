import { ParseXLSX } from "./parseXLSX"
import { MergePlot } from "./mergePlot"
import { Sleep } from "../utils/p_utils";

async function main() {
    let outfile = ParseXLSX();
    await Sleep(1000)
    MergePlot(outfile);
}

main()
Sleep(999999)

// 打包pkg -t win package.json