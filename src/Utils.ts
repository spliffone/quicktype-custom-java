import * as fs from "fs";
import * as path from "path";

export interface FileInfo {
    fullPath: string;
    fileName: string;
    relativePath: string;
};
export interface getOptions {
    fileExtension?: string;
    excludes?: string[];
};

export async function getFiles(inputPath : string, opt : getOptions) : Promise<Array<FileInfo>> {
    return await getFilesRecursive(inputPath, '', [], opt);
}

function exclude(path : string, opt : getOptions) {
    if(typeof(opt.excludes) !== 'undefined' 
        && opt.excludes.filter(exc => path.includes(exc)).length > 0) {
        return true;
    }
    return false;
}

async function getFilesRecursive(inputPath : string, relPath : string, results : FileInfo[], opt : getOptions) : Promise<Array<FileInfo>> {
    const dir = await fs.promises.readdir(inputPath);
    await Promise.all(dir.map(async relativePath => {
        if(exclude(relativePath, opt)) {
            return;
        }

        const info: FileInfo = {
            fullPath: path.join(inputPath, relativePath),
            fileName: path.basename(relativePath),
            relativePath: path.join(relPath, relativePath),
        };

        const stat = await fs.promises.lstat(info.fullPath);
        if(stat.isDirectory()) {

            await getFilesRecursive(info.fullPath, info.relativePath, results, opt);

        } else {

            if(typeof(opt.fileExtension) !== 'undefined'
                && opt.fileExtension.toLowerCase() !== path.extname(relativePath).toLowerCase()) {
                return;
            }

            results.push(info);
        } 
    }));

    return results;
}
