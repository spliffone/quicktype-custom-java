#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";

import {
    InputData,
    JSONSchemaInput,
    quicktypeMultiFile,
    SerializedRenderResult,
    RendererOptions,
} from "quicktype-core";
import { CustomJavaTargetLanguage } from "./CustomJavaTargetLanguage";
import { FileInfo, getFiles } from "./Utils";


async function buildSource(jsonFiles : FileInfo[], baseUri : string) : Promise<InputData> {
    const inputData = new InputData();
    for (let info of jsonFiles) {
        console.log(`Include JSON schema ${info.relativePath}`)
        const name = path.basename(info.fileName)
        const source = { 
            name: name, 
            uris: [
                `${baseUri}/${info.relativePath.replace('\\','/')}`
            ], 
            schema: await fs.promises.readFile(info.fullPath, "utf8") };
        inputData.addSource("schema", source, () => new JSONSchemaInput(undefined));
    }

    return inputData;
}

async function main(program: string, args: string[]): Promise<void> {
    if (args.length !== 1) {
        console.error(`Usage: ${program} SCHEMA-DIR`);
        process.exit(1);
    }

    const baseUri = 'https://github.com/spliffone/quicktype-custom-java/schemas';
    const files = await getFiles(args[0], {
        excludes: ['about.json', 'dto', 'scripts'],
        fileExtension: '.json', 
    })
    const inputData = await buildSource(files, baseUri)
    const lang = new CustomJavaTargetLanguage();
    const rendererOptions: RendererOptions = {
        package: "com.world",
    };

    const r = await quicktypeMultiFile({ lang, rendererOptions, inputData })  
    r.forEach((value: SerializedRenderResult, key: string) => {
        console.log(`Create file generated/${ key }`)
        fs.writeFileSync(`generated/${ key }`, value.lines.join('\n'))
    })
}

main(process.argv[1], process.argv.slice(2)).catch(e => {
    console.error(e);
    process.exit(1);
});
