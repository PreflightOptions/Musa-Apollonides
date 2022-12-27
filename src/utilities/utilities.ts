import Musa from "main";
import { IgnoredFolder, MusaSettings, DEFAULT_SETTINGS } from "../main"
import { Setting, TFile } from "obsidian";
import { log } from "./logger";
import { isEmpty } from "rxjs";

export function validateIgnored(file: TFile, musa: Musa): boolean {
    let valid = false; 
    musa.settings.foldersToIgnore.forEach((folder: IgnoredFolder, index: number) => {
        //log(file.path);
        //log(folder.folder);
        if(file.path.startsWith(folder.folder)) {
            log("matched " + folder.folder + ":" + file.path);
            valid = true; 
        }
    });
    //log(valid);
    return valid;
}

export function validateSettings(settings: MusaSettings): boolean {
    let reset = false;
    if(settings.dateRegex.length < 1) {
        reset = true
        log("Date regex was empty: " + settings.dateRegex);
        settings.dateRegex = DEFAULT_SETTINGS.dateRegex;
    }
    if(settings.dateString.length < 1) {
        reset = true
        log("Date string was empty: " + settings.dateString);
        settings.dateString = DEFAULT_SETTINGS.dateString;
    }
    let itemToRemove: number[] = [];
    let removing; 
    settings.foldersToIgnore.forEach((folder: IgnoredFolder, index: number) => {
        if(folder.folder.length < 1 || folder.folder === " ") {
            reset = true
            removing = true
            log("ignore folder is empty: " + folder.folder);
            itemToRemove.push(index);
            //settings.foldersToIgnore.splice(index, 1);
        }
    });
    if(itemToRemove != undefined) {
        while(itemToRemove.length > 0) {
            log("removing item from folder to ignore");
            settings.foldersToIgnore.splice(itemToRemove.pop(), 1);
        }
    }

    
    return reset; 
}