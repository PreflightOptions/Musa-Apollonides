import { App, Editor, editorEditorField, EventRef, MarkdownView, MetadataCache, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder, Vault } from 'obsidian';
import { log } from "utilities/logger";

export default class Musa extends Plugin {
	private modifyFileEvent: EventRef;
	private modifyFileNameEvent: EventRef;
	private actionInProgress : boolean;
	
	async onload() {
		log("Musa Apollonides Loaded");
		this.modifyFileEvent = this.app.vault.on("modify", (file: TFile) => this.fileModifiedEvent(file));
		this.modifyFileNameEvent = this.app.vault.on("rename", (file: TFile, oldPath: string) => this.fileNameChanged(file, oldPath));
		this.registerEvent(this.modifyFileEvent);
		this.registerEvent(this.modifyFileNameEvent);
		
	}
	onunload(): void {
		log("Unloading Musa Apollonides");
		this.unload();
	}

	async fileNameChanged(file: TFile, oldPath: string) {
		if(this.actionInProgress == true) {
			log("Action in progress, skipping"); 
			return;
		};
		this.startMusaActions();
		log("File name changed, renaming title");
		let stringFile = await this.app.vault.read(file);
		let newTitle = file.basename.split("-").last().trim();
		let trueOldFileName = oldPath.split("/").last().split("-").last().replace(".md", "").trim();
		let pattern = "# " + trueOldFileName;
		let re = new RegExp(pattern);
		let newFile = stringFile.replace(re, "# " + newTitle);
		await this.updateDate(newFile, file);
		//await file.vault.modify(file, newFile);
		this.stopMusaActions();
	}

	startMusaActions() {
		this.actionInProgress = true;
	}
	stopMusaActions() {
		this.actionInProgress = false;
	}

	getDate() {
		let dateObj = new Date();
		let days = ("0" + dateObj.getDate()).slice(-2);
		let month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
		let year = dateObj.getFullYear();
		let hours = dateObj.getHours();
		let minutes = dateObj.getMinutes();
		let seconds = dateObj.getSeconds();
		let date = year + "-" + month + "-" + days + " " + hours + ":" + minutes + ":" + seconds;

		return date;
	}

	async updateDate(stringFile: string, file: TFile){
		// Modify data in frontmatter
		log("Update modified date");
		let date = this.getDate();
		
		let modifiedS = "modified date: " + date;
		let re = new RegExp('(modified date.*)');
		let newFile = stringFile.replace(re, modifiedS);
		await file.vault.modify(file, newFile);
	}

	async fileModifiedEvent(file: TFile) {
		if(this.actionInProgress == true) {
			log("Action in progress, skipping"); 
			return;
		};
		if(file.path.contains("04 - ")) { 
			log("File is template, skipping file"); 
			return;
		};

		this.startMusaActions();
		let stringFile = await this.app.vault.read(file);
		let trueFileName = file.path.split("/").last().split("-").last().replace(".md", "").trim();

		// Compare title to file name
		let fileTitle = stringFile.match('#{1} {1}.*').join("").slice(2).trim();
		if(trueFileName != fileTitle){
			let trueFilePath = file.path;
			let newFilePath = trueFilePath.replace(trueFileName, fileTitle);
			log("Title changed, renaming file");
			await this.app.fileManager.renameFile(file, newFilePath);
		}
		await this.updateDate(stringFile, file)
		this.stopMusaActions();
	}


}