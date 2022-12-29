import { Plugin, TAbstractFile, TFile, TFolder } from 'obsidian';
import { log } from "utilities/logger";
import { tab } from "settings/tab";
import { debounceTime, Subscription, Subject } from 'rxjs';
import { validateIgnored } from 'utilities/utilities';

interface fileInterface {
	file: TFile,
	oldPath: string
}

export interface IgnoredFolder {
	// Folder string should be a path mappable back to a TFolder
	folder: string
}
export interface MusaSettings {
	dateRegex: string;
	dateString: string;
	foldersToIgnore: IgnoredFolder[]
	enable_ignored_folders: boolean
	enable_title_rewrite: boolean
}

export const DEFAULT_SETTINGS: Partial<MusaSettings> = {
	dateRegex: "modified date\: \d{4}-\d{2}-\d{2} \d{1,2}:\d{1,2}:{0,1}\d{1,2}",
	dateString: "modified date",
	foldersToIgnore: [{folder: ""}],
	enable_ignored_folders: false,
	enable_title_rewrite: true
};

export default class Musa extends Plugin {
	subject = new Subject<TFile>();
	renameSubject = new Subject<fileInterface>();
	primaryFileArray: TFile[] = [];
	dedupedFileArray: TFile[] = [];
	subArray: Subscription[] = [];
	settings: MusaSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new tab(this.app, this));

		this.subArray.push(this.buildModifySub());
		this.registerEvent(this.app.vault.on("modify", this.nextModify));

		if(this.settings.enable_title_rewrite) {
			this.registerEvent(this.app.vault.on("rename", this.nextRename));
			this.subArray.push(this.buildRenameSub());
		}
		
		log("Musa Apollonides Loaded");
	}

	onunload(): void {
		log("Unloading Musa Apollonides");
		this.app.vault.off("modify", this.nextModify);

		if(this.settings.enable_title_rewrite) {
			this.app.vault.off("rename", this.nextRename);
		}
		
		for(let i = this.subArray.length - 1; i >= 0; i--) {
			this.subArray.pop().unsubscribe();
		}
		this.unload();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	  }
	
	async saveSettings() {
		await this.saveData(this.settings);
	}

	nextRename = async (file: TAbstractFile, oldPath: string) => {
		log("file rename event");

		if(file instanceof TFolder) {
			log("event was folder, ignoring");
			return;
		}
		
		if (file instanceof TFile) {
			if(validateIgnored(file, this)) {
				log("validated file ignored: true");
				return;
			}
			let fileData:fileInterface = {"file": file, "oldPath": oldPath};
			this.renameSubject.next(fileData);
		}
	}
	
	nextModify = async (file: TAbstractFile) => {
		log("file modify event");

		if(file instanceof TFolder) {
			log("event was folder, ignoring");
			return;
		}

		if (file instanceof TFile) {
			if(validateIgnored(file, this)) {
				log("validated ignored true");
				return;
			}
			this.primaryFileArray.push(file);
			this.subject.next(file);
		}
	}

	buildModifySub() {
		let modSub = this.subject.asObservable().pipe(debounceTime(1000 * 7)).subscribe(async () => {
			// Executed on modSub.next()
			this.dedupedFileArray.push(...this.dedupeAndAssign());

			for(let i = this.dedupedFileArray.length - 1; i >= 0; i--) {
				this.fileModifiedEvent(this.dedupedFileArray.pop())
			}
		})

		return modSub;
	};

	buildRenameSub() {
		let renameSub = this.renameSubject.asObservable().pipe(debounceTime(500)).subscribe(async (fileData) => {
			// Executed on renameSub.next()
			this.fileRenameEvent(fileData.file, fileData.oldPath);
		});

		return renameSub;
	}

	async fileRenameEvent(file: TFile,oldPath: string) {
		let newTitle = file.basename.split("-").last().trim();
		let trueOldFileName = oldPath.split("/").last().split("-").last().replace(".md", "").trim();
		let pattern = "# " + trueOldFileName;
		let re = new RegExp(pattern);
		let stringFile = await this.app.vault.read(file);
		let newFile = stringFile.replace(re, "# " + newTitle);
		
		this.updateFile(newFile, file);
	}

	async fileModifiedEvent(file: TFile) {
		let stringFile = await this.app.vault.read(file);

		// Compare title to file name
		//if title does not match file name, change file name
		if(this.settings.enable_title_rewrite) {
			let trueFileName = file.path.split("/").last().split("-").last().replace(".md", "").trim();
			let fileTitle = stringFile.match('#{1} {1}.*').join("").slice(2).trim();
			if(trueFileName != fileTitle){
				let trueFilePath = file.path;
				let newFilePath = trueFilePath.replace(trueFileName, fileTitle);
				this.toggleRenameListener();
				await this.app.fileManager.renameFile(file, newFilePath);
			}
		}

		this.updateFile(stringFile, file)
	}

	updateFile = async (stringFile: string, file: TFile) => {
		log("updating file");
		// Modify data in frontmatter
		let date = this.getDate();
		
		let modifiedS = this.settings.dateString + ": " + date;
		let regex = this.settings.dateRegex;

		let re = new RegExp(this.settings.dateRegex, "g");
		
		if(re.test(stringFile)) {
			//log("new date " + modifiedS);
			let newFile = stringFile.replace(re, modifiedS);
			this.toggleModifyListener()
	
			file.vault.modify(file, newFile);
		}
		else {
			log("ERROR - No regex match");
		}
	}

	async toggleModifyListener() {
		this.app.vault.off("modify", this.nextModify);
		setTimeout(() => {
			this.app.vault.on("modify", this.nextModify);
		}, 1500);
	}

	async toggleRenameListener() {
		this.app.vault.off("rename", this.nextRename);
		setTimeout(() => {
			this.app.vault.on("rename", this.nextRename)
		}, 1500);
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

	dedupeAndAssign() {
		let copiedFileArray: TFile[] = [];
		let indexToRemove: number[] = [];
		// Remove duplicate TFiles
		this.primaryFileArray = this.primaryFileArray.filter((item,
            index) => this.primaryFileArray.indexOf(item) === index);
		
		// Copy primary array into secondary array
		copiedFileArray = this.primaryFileArray.slice();
		
		// Loop through secondary array and identify/save location of value in primary array
		// This extra step is performed incase additional TFiles are added into the array
		// Before the save can fully process, ex rapidly editing multiple files
		copiedFileArray.forEach(copyItem => {
			let i = this.primaryFileArray.findIndex((element, index2) => {
				if(copyItem === element) {
					return true
				}
			})
			indexToRemove.push(i);
		});

		// Remove copied elements from primary array by index
		indexToRemove.sort().reverse();
		indexToRemove.forEach(removeIndex => {
			this.primaryFileArray.splice(removeIndex, 1);
		});
		
		return copiedFileArray;
	}
}