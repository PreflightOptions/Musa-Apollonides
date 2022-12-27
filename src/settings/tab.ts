import { IgnoredFolder } from "../main"
import Musa from "../main";
import { log } from "utilities/logger"; 
import { AbstractTextComponent, App, ButtonComponent, PluginSettingTab, Setting, FuzzySuggestModal } from "obsidian";
import { search } from "utilities/search";
import { validateSettings } from "utilities/utilities";
import { find } from "settings/find";
import { createPopper, popper } from "@popperjs/core";
import { fromEvent, debounceTime, Observable, map, Subscription} from 'rxjs';
import { text } from "stream/consumers";

export class tab extends PluginSettingTab {
    plugin: Musa;
    regexEventListener: Observable<Event>;
    regexSub: Subscription;

    constructor(app: App, plugin: Musa) {
      super(app, plugin);
      this.plugin = plugin;
    }
    
    display(): void {
        log("displaying settings");
        //log(this.plugin.settings.foldersToIgnore);
        let { containerEl } = this;
    
        containerEl.empty();
    
        this.add_regex_settings();
        this.add_ignored_folders();

        //log("ignored " + this.plugin.settings.enable_ignored_folders);
    }

    hide(): void {
        log("hiding settings");
        if(validateSettings(this.plugin.settings)) {
            this.plugin.saveSettings();
        }
        if(!this.regexSub.closed) {
            log("unsubscribing hooks")
            this.regexSub.unsubscribe();
        }
        
    }

    async saveAndDisplay(): Promise<void> {
        await this.plugin.saveSettings();
        this.display();
    }

    add_regex_settings(): void {
        new Setting(this.containerEl)
            .setName("Date regex")
            .setDesc("Default regex matching example: modified date: 2022-10-07 17:19:15")
            .addText((text) => {
    
                text.setPlaceholder("modified date\: \d{4}-\d{2}-\d{2} \d{1,2}:\d{1,2}:\d{1,2}")
                .setValue(this.plugin.settings.dateRegex)

                // register debounce Observable
                this.regexEventListener = fromEvent(text.inputEl, "input");

                this.regexSub = this.regexEventListener.pipe(map((i: any) => i.currentTarget.value), 
                debounceTime(1000))
                .subscribe(value => {
                    console.log("Saving: " + value);
                    this.plugin.settings.dateRegex = value;
                    this.plugin.saveSettings();
                    //this.display(); 
                });
 
            })
            .then(cb => {
                //log(cb.infoEl.innerHTML);
                

            });

        new Setting(this.containerEl).setName("Date key")
            .setDesc("Name of the date key to replace, 'modified date' in modified date: 2022-10-07 17:19:15")
            .addText((text) => 
            text
                .setPlaceholder("modified date")
                .setValue(this.plugin.settings.dateString)
                .onChange(async (value) => {
                    this.plugin.settings.dateString = value;
                    await this.plugin.saveSettings();
                    //this.display();
                })
            );
    }
    
    add_ignored_folders(): void {
        new Setting(this.containerEl)
        .setName("Enable Ignored Folders")
        .setDesc("Folders to ignore for observation")
        .addToggle((toggle) => {
            toggle
                .setValue(this.plugin.settings.enable_ignored_folders)
                .onChange((use_ignored_folders) => {
                    this.plugin.settings.enable_ignored_folders =
                    use_ignored_folders;
                    this.saveAndDisplay();
                });
        });

        if(!this.plugin.settings.enable_ignored_folders) {
            return;
        }

        new Setting(this.containerEl).setName("Ignored Folders")
            .setDesc("Folders to ignore by Musa")
            .addButton((button: ButtonComponent) => {
                button 
                    .setButtonText("+")
                    .setTooltip("add ignored folder")
                    .setCta()
                    .onClick(() => {
                        this.plugin.settings.foldersToIgnore.push({folder: ""});
                        this.saveAndDisplay();
                    });        
            });

        this.plugin.settings.foldersToIgnore.forEach((ignoredFolder: IgnoredFolder, index: number) => {
            //log(ignoredFolder + " " + index);
            const s = new Setting(this.containerEl)
                .addSearch((component) => {
                    new search(component.inputEl);
                    //let finder = new find(component.inputEl);
                    component.onChange((new_thing) => {
                        //let new_ignore: IgnoredFolder;  
                        let ignore: IgnoredFolder = { folder: new_thing }
                        this.plugin.settings.foldersToIgnore.push(ignore);
                        this.plugin.saveSettings();
                    });
                    component.setPlaceholder("99 - Meta")
                        .setValue(ignoredFolder.folder);
                })
    
                .addExtraButton((component) => {
                    component.setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.foldersToIgnore.splice(
                                index, 1
                            );
                            log("delete ignored folder");
                            this.saveAndDisplay();
                        });
                });
            });
    }
        
}