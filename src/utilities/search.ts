import Musa from "../main"
import { log } from "utilities/logger"; 
import { TAbstractFile, TFolder, ISuggestOwner } from "obsidian";
import { find } from "../settings/find";

export class search extends find<TFolder> {
    getSuggestions(searchString: string): TFolder[] {
        const allFiles = app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        //log(searchString);
        allFiles.forEach((file: TAbstractFile) => {
            if (file instanceof TFolder && 
                file.path.contains(searchString.toLocaleLowerCase())
                ) {
                    //log(file.path);
                    folders.push(file);
                }
        });
        return folders;
    }

    renderSuggestion(file: TFolder, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFolder): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.close();
    }

}