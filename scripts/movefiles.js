const shell = require("shelljs");
const pkg = require("../package.json");
const DEST_DIR = "./build";
const OBSIDIAN_DIR = "~/Documents/obsidianmd/Apollo/.obsidian/plugins/Musa-Apollonides";
const srcFilePaths = pkg.files;


function movefiles() {
    shell.echo("Moving files to Obsidian");
    if(!shell.test("-d", DEST_DIR)) {
        shell.mkdir("-p", DEST_DIR);
    }
    if(!shell.test("-d", DEST_DIR)) {
        shell.echo("Obsidian DIR Not Found");
    }

    
    srcFilePaths.forEach(function (srcPath) {
        if(!shell.test("-e", srcPath)) {
            shell.echo("Error: Cannot find files listed in package.json: %s", srcPath);
            process.exit(1);
        }
        shell.cp(srcPath, DEST_DIR);
        shell.cp(srcPath, OBSIDIAN_DIR);
    });
    shell.echo("File move complete");
}
module.exports = { movefiles };
