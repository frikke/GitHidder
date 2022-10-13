import * as vscode from 'vscode';
import { localeString } from './i18n';
import { isArray } from 'util';
import { Highlighter } from './Highlighter';
import { KeywordItem } from './KeywordItem';
import { Path } from './KeywordItem';
var {exec} = require('child_process') ;

export type ColorInfo = {
	name: string,
	code: string,
	icon: string,
	hideicon: string
};

interface SaveList {
	color: string;
	keyword: string[];
}

/** Node's relation of Multi Color Highlighter.
 * KeywordList
 * + Highlighter
 *   + KeywordItem
 */
export class GitHidderTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	_onDidChangeTreeData:vscode.EventEmitter<vscode.TreeItem|null|undefined|undefined> = new vscode.EventEmitter<vscode.TreeItem|null|undefined|undefined> ();
	onDidChangeTreeData:vscode.Event<vscode.TreeItem|null|undefined|undefined >= this._onDidChangeTreeData.event;

	data: Highlighter[] = [];
	currentProjectPath:string=""

	_colorset: ColorInfo[] = [
		{ name: 'Red'   , code: '#FF0000', icon: this.context.asAbsolutePath('resources/red.svg'), hideicon: this.context.asAbsolutePath('resources/transparence.svg') },
		{ name: 'Green' , code: '#00FF00', icon: this.context.asAbsolutePath('resources/green.svg'), hideicon: this.context.asAbsolutePath('resources/transparence.svg') },
		{ name: 'Blue'  , code: '#0000FF', icon: this.context.asAbsolutePath('resources/blue.svg'), hideicon: this.context.asAbsolutePath('resources/transparence.svg') },
		{ name: 'Yellow', code: '#FFFF00', icon: this.context.asAbsolutePath('resources/yellow.svg'), hideicon: this.context.asAbsolutePath('resources/transparence.svg') },
		{ name: 'Pink'  , code: '#FF00FF', icon: this.context.asAbsolutePath('resources/pink.svg'), hideicon: this.context.asAbsolutePath('resources/transparence.svg') },
		{ name: 'Cyan'  , code: '#00FFFF', icon: this.context.asAbsolutePath('resources/cyan.svg'), hideicon: this.context.asAbsolutePath('resources/transparence.svg') },
	];
	ColorSet = {
		Red: this._colorset[0],
		Green: this._colorset[1],
		Blue: this._colorset[2],
		Yellow: this._colorset[3],
		Pink: this._colorset[4],
		Cyan: this._colorset[5],
	};

	/**
	 * 
	 */
    hideshow(target: Highlighter) {
		console.log("hideshow()")
		const highlighter = this.data.find(highlighter => target === highlighter);
		if (highlighter === undefined) {
			return;
		}
		highlighter.turnonoff();
		console.log("hideshow()-refresh")
		this.refresh();
	}
	
	/**
	 * 
	 * @param arg0 
	 */
	toggle(color: string) {
		console.log("toggle()")
		if (vscode.window.activeTextEditor === undefined) {
			return;
		}
		// Get selecting keyword.
		let region: vscode.Selection = vscode.window.activeTextEditor.selection;
		if (region.isEmpty) {
			return;
		}
		let keyword = vscode.window.activeTextEditor.document.getText(region);

		// Check keyword existence.
		let deleteOperation: boolean = false;

		this.data.forEach(highlighter => {
			var currentTextEditor = vscode.window.activeTextEditor;
			
			var currentTextEditorPath=""
			if (currentTextEditor) {
				currentTextEditorPath = currentTextEditor.document.fileName;
				currentTextEditorPath = currentTextEditorPath.charAt(0).toUpperCase() + currentTextEditorPath.slice(1)
				highlighter.keywordItems.forEach(KeywordItem => {
					if(keyword == KeywordItem.label){
						if(KeywordItem.getKeywordPath() == currentTextEditorPath ){
							highlighter.remove(KeywordItem).then(function () {}).catch(function () {
								vscode.window.showErrorMessage("An error has occurred while trying reveal a keyword");
								return
							});
							deleteOperation = true;
							this.refresh();
							this.refresh();
							return;
						}
					}
				});

			}
		});

		if(deleteOperation == false){
			let highlighter = this.data.find(highlighter => highlighter.colortype.name.toLowerCase() === color.toLowerCase());
			if (highlighter === undefined) {
				return;
			}
			// highlighter.add(keyword,"");
			highlighter.add(keyword,"").then(function () {}).catch(function () {
				vscode.window.showErrorMessage("An error has occurred while trying hide a keyword");
				return
			});

			this.refresh();
			this.refresh();
		}
		
	}

	/**
	 * 
	 */
	setSelect() {
		console.log("setSelect()")
		this.data.forEach(highlighter => {
			// if (highlighter.isActive) {
				this.toggle(highlighter.colortype.name);
				return;
			// }
		});
	}

	/**
	 * 
	 * @param target Highlighter
	 */
	// changeActive(target: Highlighter) {
	// 	var found: boolean = false;
	// 	this.data.forEach(highlighter => {
	// 		if (target === highlighter) {
	// 			found = true;
	// 			highlighter.isActive = true;
	// 			return;
	// 		}
	// 	});
	// 	if (found) {
	// 		this.data.forEach(highlighter => {
	// 			if (target !== highlighter) {
	// 				highlighter.isActive = false;
	// 			}
	// 		});
	// 		this.refresh();
	// 	}
	// }

	/**
	 * Save the keywordlist to workspace settings.json.
	 */
	save() {
		console.log("save()")
		var config = vscode.workspace.getConfiguration("GitHidder");
		var savelist: SaveList[] = [];
		this.data.forEach(highlighter => {
			savelist.push(<SaveList>{
				color: highlighter.colortype.name,
				keyword: highlighter.keywordItems.map(keyworditem => keyworditem.label)
			});
		});
		config.update("savelist", savelist, vscode.ConfigurationTarget.Workspace).then(
			() => vscode.window.showInformationMessage('Done'),
			(reason) => vscode.window.showErrorMessage('Error occurred' + "\n" + reason)
		);
	}

	load(): boolean {
		const GitHidderconfig = vscode.workspace.getConfiguration("GitHidder");
		if (GitHidderconfig === undefined) {
			return false;
		}
		if (GitHidderconfig.has("savelist") === false) {
			return false;
		}


		const savelist = <SaveList[]>GitHidderconfig.get("savelist");
		const implementsSaveList = function (params: any): params is SaveList[] {
			return (params !== null &&
				typeof params === "object" &&
				isArray(params) &&
				1 <= params.length &&
				typeof params[0].color === "string" &&
				typeof params[0].keyword === "object" &&
				isArray(params[0].keyword) &&
				typeof params[0].keyword[0] === "string");
		};


		if (!implementsSaveList(savelist)) {
			return false;
			
		}
		savelist.forEach(obj => {
			console.log("sfsdvfscvs")
			let highlighter = new Highlighter(this.context,this._colorset.filter(value => value.name.toLowerCase() === obj.color.toLowerCase())[0], [],"",this.currentProjectPath);
			obj.keyword.forEach(key => highlighter.add(key,""));
			this.data.push(highlighter);
		});
		// this.refresh()
		return true;
	}

	/**
	 * 
	 * @param offset 
	 */
	change(offset: vscode.TreeItem) {
		console.error("change()")
		// console.log(`Get value ${offset.label}.`);
		vscode.window.showQuickPick(this._colorset.map(item => item.name)).then(select => {
			if (select === undefined) {
				return;
			}

			// var wasActive = false;
			if (offset instanceof Highlighter) {
	
				this.data.forEach(highlighter =>{
					if(select == 'Red'){
						highlighter.changeColor(this.ColorSet.Red)
					}
					else if(select == 'Green'){
						highlighter.changeColor(this.ColorSet.Green)
					}else if(select == 'Blue'){
						highlighter.changeColor(this.ColorSet.Blue)
					}else if(select == 'Yellow'){
						highlighter.changeColor(this.ColorSet.Yellow)
					}else if(select == 'Pink'){
						highlighter.changeColor(this.ColorSet.Pink)
					}else if(select == 'Cyan'){
						highlighter.changeColor(this.ColorSet.Cyan)
					}
				})
				this.refresh()
			}

		});
	}

/**
	 * 
	 * @param offset 
	 */
   OpenFile(offset: vscode.TreeItem) {
	console.log("OpenFile")
	if (offset instanceof Path) {
		vscode.workspace.openTextDocument(offset.path).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	}
	
   }

	/**
	 * 
	 * @param offset 
	 */
	delete(offset: vscode.TreeItem) {

		console.log(`Get value delete ${offset.label}.`);

		//delete color / reveal all
		if (offset instanceof Highlighter) {
			vscode.window.showInformationMessage("Do you want reveal all the keywords from to Git?", "Yes", "No")
			.then(answer => {
				if (answer === "Yes") {
					console.log(`Get value delete1 ${offset.label}.`);
			
					offset.delete();
					this.data = this.data.filter(highlighter => highlighter !== offset);
			
					//make new Highlighter
					this.data.push(new Highlighter(this.context,this.ColorSet.Red, [],"New",this.currentProjectPath));
					console.log("del-1()-refresh")
					this.refresh();
					this.refresh();
					return;
				}else{
					return;
				}
			})
			

		}//delete keyword from a color
		else if (offset instanceof KeywordItem) {
			console.log(`Get value delete2 ${offset.label}.`);
			this.data.forEach(highlighter => {
				highlighter.remove(offset).then(function () { }).catch(function () {
                    vscode.window.showErrorMessage("An error has occurred while trying reveal a keyword");
                });
				// highlighter.keywordItems = highlighter.keywordItems.filter(keyworditem => keyworditem !== offset);
			});
			console.log("del-2()-refresh")
			this.refresh();
			this.refresh();
		}
	}

	/**
	 * 
	 * @param offset 
	 */
	add(offset?: vscode.TreeItem) {
		console.log("add()")
		if (!offset) {
			// Add the color of the highlighter
			vscode.window.showQuickPick(this._colorset.map(item => item.name)).then(select => {
				if (select !== undefined) {
					var colorinfo = this._colorset.filter(value => value.name.toLowerCase() === select.toLowerCase())[0];
					if (this.data.findIndex(highlighter => highlighter.colortype === colorinfo) < 0) {
						var newhighlighter = new Highlighter(this.context,colorinfo, [],"Start",this.currentProjectPath);
						this.data.push(newhighlighter);
						// this.changeActive(newhighlighter);
						// console.log("add-1()-refresh")
						this.refresh();
						this.refresh();
					}
				}
			});
		}
		else if (offset instanceof Highlighter) {
			// Add a keyword.
			vscode.window.showInputBox({ placeHolder: "Input keyword." }).then(async keyword => {
				if (keyword === undefined) {
					return;
				}else{
					let file = await vscode.window.showOpenDialog({
						filters: {
							'All files (*.*)': ['*']
						  },
						  canSelectFolders: false,
						  canSelectFiles: true,
						  canSelectMany: false,
						  openLabel: 'Select file',
					  });
					  if (!file || file.length < 1) {
						return;
					  }else{
						let filePath = file[0].fsPath.replace(/\//g, "\\").replace('\n', "") 
						filePath = filePath.charAt(0).toUpperCase() + filePath.slice(1)
						if(filePath.includes(this.currentProjectPath)){
							if (this.checkExistKeyword(keyword,filePath)) {
								vscode.window.showInformationMessage("This keyword with this file already exists");
								return;
							}else{
								offset.add(keyword,filePath);
								offset.refresh();
								this.refresh();
								this.refresh();
							}
						}else{
							vscode.window.showInformationMessage("This file doesn't belong in this repository");
							return;
						}
						
					
					  }
				}
			});
		}
	}
	/**
	 * 
	 * @param keywordItem 
	 */

    edit(keywordItem?: vscode.TreeItem) {
		console.log("edit()")
		if (!keywordItem) {
		}	else if (keywordItem instanceof Highlighter) {

		}else if (keywordItem instanceof KeywordItem) {

			let currentKeyword =keywordItem.label;
			vscode.window.showInputBox({placeHolder: "Input keyword.", value: currentKeyword}).then(newKeyword => {
				if (newKeyword === undefined) {
					return;
				}
				if (!this.checkExistKeyword(newKeyword,keywordItem.path)) {

					console.log("currentKeyword---->"+currentKeyword)
					console.log("newKeyword---->"+newKeyword)
					this.data.forEach(async highlighter => {
						console.log("bike1")
						let index = highlighter.keywordItems.findIndex(value => value.label === currentKeyword);
						if(index >= 0){
							console.log("highlighter.keywordItems[index]-->"+highlighter.keywordItems[index].label+"<--currentKeyword->"+currentKeyword+"<---")
							if(highlighter.keywordItems[index].label == currentKeyword){
								console.log("bike2")
								await highlighter.remove(keywordItem).then(function () {
									highlighter.add(newKeyword,keywordItem.path).then(function () {}).catch(function () {
										vscode.window.showErrorMessage("An error occurred while adding keyword");
									});
								}).catch(function () {
									vscode.window.showErrorMessage("An error occurred while deleting keyword");
								});

							}
						}
						
						// highlighter.keywordItems = highlighter.keywordItems.filter(keyworditem => keyworditem !== offset);
					});

					this.refresh();
					this.refresh();
				}
			});
		}else{
			console.log("44444()")
		}
		
		// if (keywordItem.contextValue !== "keyworditem") {
		// 	return;
		// }

		
    }



	/**
	 * 
	 * @param editors 
	 */
	refresh(editors?: vscode.TextEditor[]) {
		console.log("refresh(-1-)")
		this._onDidChangeTreeData.fire();
		this.data.forEach(highlighter => highlighter.refresh(editors));
	}

	/**
	 * 
	 * @param context 
	 */
	constructor(private context: vscode.ExtensionContext) {
		// vscode.window.showInformationMessage('GitHidderTreeDataProvider constractor.');


		if(vscode.workspace.workspaceFolders == undefined) {
			vscode.window.showInformationMessage("You need to open a project first");
		}else{
			//Path of current oriject directory
			let path = vscode.workspace.workspaceFolders[0].uri.fsPath
			path= path.charAt(0).toUpperCase() + path.slice(1)

			exec('git --version',(error:any, stdout:any, stderr:any) => {
				console.log("error->"+error);
				console.log("stderr->"+stderr);
				console.log("stdout->"+stdout);
				if(error !== null && stderr != ""){
					vscode.window.showInformationMessage("You need to download and install Git with up to 2.0 version");
				}else{
					if(stdout == `'git' is not recognized as an internal or external command,
					operable program or batch file.`){
						vscode.window.showInformationMessage("You need to download and install Git with up to 2.0 version");
					}
					else{   
						exec('cd '+path + ` && git rev-parse --show-toplevel`, (error:any, stdoutProjectDirectory:any, stderr:any) => {
							if (error != null && stderr!="") {
								vscode.window.showInformationMessage("An error occurred while trying to identify current directory");
							}else{
								if(stdoutProjectDirectory.replace(/\//g, "\\").replace('\n', "") == path){
								this.currentProjectPath = path;
								this.context = context
								var result = this.load();
								if (!result) {
									this.data.push(new Highlighter(this.context,this.ColorSet.Red, [],"Start",this.currentProjectPath));
									this.refresh();
									this.refresh();
								}
			
								}else{
									vscode.window.showInformationMessage("This directory isn't a Git repository");
								}
							}
						})
					}
				}
			})
		}

		// this.changeActive(this.data[0]);
	}

	/**
	 * 
	 * @param element 
	 */

	getTreeItem(element: KeywordItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
		return element;
	  }
	
	  getChildren(element?: KeywordItem|undefined): vscode.ProviderResult<vscode.TreeItem[]> {
		if (element === undefined) {
		  return this.data;
		}
		return element.children;
	  }

	/**
	 * 
	 * @param keyword 
	 */
	private checkExistKeyword(keyword: string, path:string,showInfo = true): boolean {
		console.log("GitHidderTree checkExistKeyword()")
		let result: boolean = false;
		this.data.forEach(highlighter => {
			if (highlighter.checkExistKeyword(keyword,path)) {
				result = true;
				return;
			}
		});
		if (result && showInfo) {
			vscode.window.showInformationMessage('This keyword already exists.');
		}
		return result;
	}


}

