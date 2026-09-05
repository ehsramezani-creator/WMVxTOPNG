import fs from "node:fs";
import path from "node:path";

import SkinIdResolver from "../loaders/SkinIdResolver.js";

const ROOT =
    "C:\\Users\\ehsra\\Documents\\GitHub\\WMVxTOPNG\\ModelsTree";

const TESTS = [
    {
        id: 1,
        directory: "World\\ArtTest\\Boxtest",
    },
    {
        id: 2,
        directory: "World\\AZEROTH\\BOOTYBAY\\PASSIVEDOODAD\\FishingBox",
    },
    {
        id: 3,
        directory: "World\\OUTLAND\\PASSIVEDOODADS\\Dam",
    },
    {
        id: 4,
        directory: "Creature\\ALLIANCERIDER",
    },
    {
        id: 5,
        directory: "Creature\\GryphonPet",
    },
    {
        id: 6,
        directory: "Creature\\FelGolem",
    },
    {
        id: 7,
        directory: "Creature\\SHARK",
    },
];

function buildFilesMap(root) {
    const files = new Map();

    function walk(directory) {
        for (const entry of fs.readdirSync(directory, {
            withFileTypes: true,
        })) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            const relative = path
                .relative(root, fullPath)
                .replaceAll("\\", "/")
                .toLowerCase();

            files.set(relative, fullPath);
        }
    }

    walk(root);

    return files;
}

function findFile(files, name) {
    const target = name.toLowerCase();

    for (const [key, filePath] of files) {
        if (key.endsWith(target)) {
            return filePath;
        }
    }

    return null;
}

async function main() {
    console.log("========================================");
    console.log(" WMVxTOPNG - Skin IDs Test");
    console.log("========================================");
    console.log(`ModelsTree: ${ROOT}`);
    console.log();

    console.log("Building ModelsTree file map...");
    const files = buildFilesMap(ROOT);
    console.log(`Files indexed: ${files.size}`);
    console.log();

    const displayInfoPath =
        findFile(files, "creaturedisplayinfo.dbc");

    const modelDataPath =
        findFile(files, "creaturemodeldata.dbc");

    console.log("DBC files:");
    console.log("CreatureDisplayInfo.dbc:", displayInfoPath);
    console.log("CreatureModelData.dbc:", modelDataPath);
    console.log();

    const resolver = SkinIdResolver.createDefault({
        files,
    });

    for (const test of TESTS) {
        const directory = path.join(ROOT, test.directory);

        console.log("----------------------------------------");
        console.log(`TEST ${String(test.id).padStart(2, "0")}`);
        console.log(`Directory: ${directory}`);

        try {
            const entries = fs.readdirSync(directory, {
                withFileTypes: true,
            });

            const modelEntry = entries.find(entry =>
                entry.isFile() &&
                /\.(m2|mdx)$/i.test(entry.name)
            );

            if (!modelEntry) {
                console.log("No M2/MDX model found.");
                console.log();
                continue;
            }

            const modelPath = path.join(
                directory,
                modelEntry.name
            );

            console.log(`Model: ${modelPath}`);

            const result = await resolver.resolve(
                {
                    filePath: modelPath,
                },
                {
                    creatureDisplayInfoPath: displayInfoPath,
                    creatureModelDataPath: modelDataPath,
                }
            );

            console.log("Result:");
            console.dir(result, {
                depth: null,
                colors: false,
            });
        } catch (error) {
            console.log("ERROR:");
            console.error(error);
        }

        console.log();
    }
}

main();