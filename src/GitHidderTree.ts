import * as vscode from 'vscode';
import { Highlighter } from './Highlighter';
import { KeywordItem } from './KeywordItem';
var {exec} = require('child_process') ;
const fs = require("fs");

export type ColorInfo = {
	name: string,
	code: string,
	icon: string,
};

interface SaveList {
	color: string;
	keyword: string[];
}


export class GitHidderTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	_onDidChangeTreeData:vscode.EventEmitter<vscode.TreeItem|null|undefined|undefined> = new vscode.EventEmitter<vscode.TreeItem|null|undefined|undefined> ();
	onDidChangeTreeData:vscode.Event<vscode.TreeItem|null|undefined|undefined >= this._onDidChangeTreeData.event;

	data: Highlighter[] = [];
	currentProjectPath:string=""
	

	_colorset: ColorInfo[] = [
		{ name: 'Red'   , code: '#FF0000', icon: this.context.asAbsolutePath('resources/File-Red.svg') },
		{ name: 'Green' , code: '#00FF00', icon: this.context.asAbsolutePath('resources/File-Green.svg')},
		{ name: 'Blue'  , code: '#0000FF', icon: this.context.asAbsolutePath('resources/File-Blue.svg')},
		{ name: 'Yellow', code: '#FFFF00', icon: this.context.asAbsolutePath('resources/File-Yellow.svg')},
		{ name: 'Pink'  , code: '#FF00FF', icon: this.context.asAbsolutePath('resources/File-Pink.svg')},
		{ name: 'Cyan'  , code: '#00FFFF', icon: this.context.asAbsolutePath('resources/File-Cyan.svg')},
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
		this.refresh();
	}
	
	//this method is called when user select from right click "Hide/Reveal this text"
	async toggle():Promise<boolean>  {
		console.log("---toggle()---")
		if(vscode.workspace.workspaceFolders == undefined) {
			vscode.window.showInformationMessage("You need to open a project first.");
			return new Promise((resolve, reject) => {
				return resolve(true)}
			);
		}
		if (vscode.window.activeTextEditor === undefined) {
			return new Promise((resolve, reject) => {
				return reject(false)}
			);
		}
		// Get selecting keyword.
		let region: vscode.Selection = vscode.window.activeTextEditor.selection;
		if (region.isEmpty) {
			return new Promise((resolve, reject) => {
				return reject(false)}
			);
		}
		let selectedKeyword = vscode.window.activeTextEditor.document.getText(region);

		var editor = vscode.window.activeTextEditor;
		let filePath=""
		let fileName= ""
        if (editor) {
			filePath = editor.document.fileName;
            filePath=filePath.charAt(0).toUpperCase() + filePath.slice(1)
			fileName=filePath.replace(this.currentProjectPath,'')
			if(fileName.split("\\").length - 1 == 1){
				fileName = fileName.substring(1);
			}
		}

		//check commit status
		await this.check_Git_status(filePath).then(function () {}).catch(function () {
			return new Promise((resolve, reject) => {
				return reject(false)}
			);
		});

		//if list has no saved keywords yet 
		if(this.data.length == 0){

			let highlighter = new Highlighter(this.context,this.ColorSet.Red, [],filePath,fileName)
			highlighter.add(selectedKeyword,filePath).then(function () {}).catch(function () {});
			this.data.push(highlighter);

			await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() =>{
				this.undo_insertion(filePath,selectedKeyword)
				return new Promise((resolve, reject) => {return reject(false)});
			});

			await this.Make_gitattribute_File().then(function () {}).catch(()=> {
				this.undo_insertion(filePath,selectedKeyword)
				return new Promise((resolve, reject) => {return reject(false)});
			});
			
		//if list has at least one keyword
		}else{
			let index = this.data.findIndex(value => value.path === filePath);
			//path doesn't exists
			if(index == -1){

				let highlighter = new Highlighter(this.context,this.ColorSet.Red, [],filePath,fileName)
				highlighter.add(selectedKeyword,filePath).then(function () {}).catch(function () {});
				this.data.push(highlighter);

				await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
					this.undo_insertion(filePath,selectedKeyword)
					return new Promise((resolve, reject) => {return reject(false)});
				});


				await this.Make_gitattribute_File().then(function () {}).catch(()=> {
					this.undo_insertion(filePath,selectedKeyword)
					this.Execute_Keywords_and_Paths_filter()
					return new Promise((resolve, reject) => {return reject(false)});
				});
				
			}else {//path exists
				let found = this.data[index].keywordItems.find(value => value.label === selectedKeyword);
				//keyword exists
				if (found !== undefined) {
	
					//parse to a temporary var the path
					let tmpHighlighter = this.data[index];
					//clone to a temporary array keywords of the path
					let tmpHighlighterKeywords : KeywordItem[];
					tmpHighlighterKeywords = [...this.data[index].keywordItems]

					//remove keyword from primary array
					this.data[index].remove(found);
	

					if(this.data[index].keywordItems.length == 0){
						this.data.splice(index,1)
					}

					await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
						this.undo_deletion(tmpHighlighter.path,tmpHighlighter.fileName,tmpHighlighterKeywords)
						return new Promise((resolve, reject) => {return reject(false)});
					});
					

					await this.Make_gitattribute_File().then(function () {}).catch(()=> {
						this.undo_deletion(tmpHighlighter.path,tmpHighlighter.fileName,tmpHighlighterKeywords)
						this.Execute_Keywords_and_Paths_filter()
						return new Promise((resolve, reject) => {
							return reject(false)}
						);
					});

				}
				else{//keyword doesn't exists
	
					this.data[index].add(selectedKeyword,filePath).then(function () {}).catch(function () {});

					await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
						this.undo_insertion(filePath,selectedKeyword)
						return new Promise((resolve, reject) => {return reject(false)});
					});

					await this.Make_gitattribute_File().then(function () {}).catch(()=> {
						this.undo_insertion(filePath,selectedKeyword)
						this.Execute_Keywords_and_Paths_filter()
						return new Promise((resolve, reject) => {return reject(false)});
					});

				}
			}
		}
		this.refresh();
		this.refresh();
		
		return new Promise((resolve, reject) => {
			return resolve(true)}
		);
	}


	//this method is called when user has select a text with one or more characters inside
	async setSelect() {
		console.log("setSelect()")
		await this.toggle().then(function () {}).catch(function () {});
		return;
	}


	/**
	 * 
	 * @param offset 
	 */
	//this method is called when user want to change color at keywords in the text editor
	change(offset: vscode.TreeItem) {
		console.log("---change()---")
		vscode.window.showQuickPick(this._colorset.map(item => item.name)).then(select => {
			if (select === undefined) {
				return;
			}

			if (offset instanceof Highlighter) {
	
				let index = this.data.findIndex(value => value.path === offset.path);

				if(select == 'Red'){
					this.data[index].changeColor(this.ColorSet.Red)
				}else if(select == 'Green'){
					this.data[index].changeColor(this.ColorSet.Green)
				}else if(select == 'Blue'){
					this.data[index].changeColor(this.ColorSet.Blue)
				}else if(select == 'Yellow'){
					this.data[index].changeColor(this.ColorSet.Yellow)
				}else if(select == 'Pink'){
					this.data[index].changeColor(this.ColorSet.Pink)
				}else if(select == 'Cyan'){
					this.data[index].changeColor(this.ColorSet.Cyan)
				}
				this.refresh()
			}

		});
	}

/**
	 * 
	 * @param offset 
	 */
	//this method is called when user want to open a file from list
   OpenFile(offset: vscode.TreeItem) {
		console.log("---OpenFile()---")
		if (offset instanceof Highlighter) {
			vscode.workspace.openTextDocument(offset.path).then(doc => {
				vscode.window.showTextDocument(doc);
			});
		}
   }

	/**
	 * 
	 * @param offset 
	 */
	//this method is called when user want to delete a path/file with his keywords OR he wants to delete/reveal a keyword "X" icon
	delete(offset: vscode.TreeItem):Promise<boolean> {
		console.log("----delete()-----")

		//delete this path with keywords
		if (offset instanceof Highlighter) {
			vscode.window.showInformationMessage("Do you want reveal on Git all those keywords from: " +offset.path+ " ?", "Yes", "No")
			.then(async answer => {
				if (answer === "Yes") {

					await this.check_Git_status(offset.path).then(function () {}).catch(function () {
						return new Promise((resolve, reject) => {
							return reject(false)}
						);
					});
		
					let tmpHighlighter = offset;
					offset.delete();
					this.data = this.data.filter(highlighter => highlighter !== offset);
		

					await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
						this.undo_deletion(tmpHighlighter.path,tmpHighlighter.fileName,tmpHighlighter.keywordItems)
						return new Promise((resolve, reject) => {return reject(false)});
					});

					await this.Make_gitattribute_File().then(function () {}).catch(() => {
						this.undo_deletion(tmpHighlighter.path,tmpHighlighter.fileName,tmpHighlighter.keywordItems)
						this.Execute_Keywords_and_Paths_filter()
						return new Promise((resolve, reject) => {return reject(false)});
					});
				}
			})
			
		}//delete keyword from a path
		else if (offset instanceof KeywordItem) {
			this.delete_Keyword(offset)
			this.refresh();
		}
		this.refresh();
		this.refresh();
		return new Promise((resolve, reject) => {
			return resolve(true)}
		);
	}

	//this method is called when user want to delete/reveal a keyword
	async delete_Keyword(offset:KeywordItem):Promise<boolean>{
		let index = this.data.findIndex(value => value.path === offset.path);
		await this.check_Git_status(this.data[index].path).then(function () {}).catch(function () {
			return new Promise((resolve, reject) => {return reject(false)});
		});

		//parse to a temporary var the path
		let tmpHighlighter = this.data[index];
		//clone to a temporary array keywords of the path
		let tmpHighlighterKeywords : KeywordItem[];
		tmpHighlighterKeywords = [...this.data[index].keywordItems]
		this.data[index].remove(offset)

		if(this.data[index].keywordItems.length == 0){
			this.data.splice(index,1)
		}

		this.refresh();
		await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
			this.undo_deletion(tmpHighlighter.path,tmpHighlighter.fileName,tmpHighlighterKeywords)
			return new Promise((resolve, reject) => {return reject(false)});
		});

		await this.Make_gitattribute_File().then(function () {}).catch(() =>{
			this.undo_deletion(tmpHighlighter.path,tmpHighlighter.fileName,tmpHighlighterKeywords)
			this.Execute_Keywords_and_Paths_filter()
			return new Promise((resolve, reject) => {return reject(false)});
		});
		this.refresh();
		this.refresh();
		return new Promise((resolve, reject) => {
			return resolve(true)}
		);
	}

	//this method is called when user want to reveal all the hidden keywords
	reveal_All():Promise<boolean>{
		console.log("---reveal_All()---")
		if(vscode.workspace.workspaceFolders != undefined) {
			vscode.window.showInformationMessage("Do you want reveal all the keywords from to Git?", "Yes", "No")
			.then(async answer => {
				if (answer === "Yes") {
					//parse to a temporary var this.data in case off error on Execute_Keywords_and_Paths_filter() or Make_gitattribute_File()
					let tmpData = this.data;
					for(let i=this.data.length-1;i>=0;i--){	
						let filePath = this.data[i].path
						await this.check_Git_status(this.data[i].path).then(function () {}).catch(function () {
							vscode.window.showInformationMessage("You need to make at least one change in this file:"+filePath);
							return new Promise((resolve, reject) => {return reject(false)});
						});
						this.data[i].keywordItems.forEach(async KeywordItem =>{
							this.data[i].remove(KeywordItem)
						})
						this.data.pop();
					}
	
					await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
						tmpData.forEach(Highlighter =>{
							this.undo_deletion(Highlighter.path,Highlighter.fileName,Highlighter.keywordItems)
						})
						return new Promise((resolve, reject) => {return reject(false)});
					});
	
					await this.Make_gitattribute_File().then(function () {}).catch(() => {
						tmpData.forEach(Highlighter =>{
							this.undo_deletion(Highlighter.path,Highlighter.fileName,Highlighter.keywordItems)
						})
						return new Promise((resolve, reject) => {return reject(false)});
					});
				}
			})
		}else{
			vscode.window.showInformationMessage("You need to open a project first.");
		}

		this.refresh();
		return new Promise((resolve, reject) => {return resolve(true)});
	}

	//this method is called when user want to hide manually a text from a specific file with file explorer
	add_Manually():Promise<boolean>{
		console.log("---add_Manually()---")
		if(vscode.workspace.workspaceFolders != undefined) {
			vscode.window.showInputBox({ placeHolder: "Input text." }).then(async keyword => {
				if (keyword === undefined) {
					return new Promise((resolve, reject) => {
						return reject(false)}
					);
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
						return new Promise((resolve, reject) => {
							return reject(false)}
						);
					  }else{
						let filePath = file[0].fsPath.replace(/\//g, "\\").replace('\n', "") 
						filePath = filePath.charAt(0).toUpperCase() + filePath.slice(1)
						if(filePath.includes(this.currentProjectPath)){
							let index = this.data.findIndex(value => value.path === filePath);
	
							await this.check_Git_status(filePath).then(function () {}).catch(function () {
								return new Promise((resolve, reject) => {
									return reject(false)}
								);
							});
	
							if(index == -1){
								let fileName=filePath.replace(this.currentProjectPath,'')
								if(fileName.split("\\").length - 1 == 1){
									fileName = fileName.substring(1);
								}
				
								let highlighter = new Highlighter(this.context,this.ColorSet.Red, [],filePath,fileName)
								highlighter.add(keyword,filePath).then(function () {}).catch(function () {});
								this.data.push(highlighter);
				
								await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
									this.undo_insertion(filePath,keyword)
									this.Execute_Keywords_and_Paths_filter()
									return new Promise((resolve, reject) => {return reject(false)});
								});
	
								await this.Make_gitattribute_File().then(function () {}).catch(() => {
									this.undo_insertion(filePath,keyword)
									this.Execute_Keywords_and_Paths_filter()
									return new Promise((resolve, reject) => {return reject(false)});
								});
	
							}else {//path exists
								let found = this.data[index].keywordItems.find(value => value.label === keyword);
								//keyword exists in this file
								if (found !== undefined) {
									vscode.window.showInformationMessage("This keyword from this file already exists.");
								}
								else{//keyword doesn't exists on this file
					
									this.data[index].add(keyword,filePath).then(function () {}).catch(function () {});
	
									await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() =>{
										this.undo_insertion(this.data[index].path,keyword)
										return new Promise((resolve, reject) => {return reject(false)});
									});
	
									await this.Make_gitattribute_File().then(function () {}).catch(() =>{
										this.undo_insertion(this.data[index].path,keyword)
										this.Execute_Keywords_and_Paths_filter()
										return new Promise((resolve, reject) => {return reject(false)});
									});
								}
							}
						}else{
							vscode.window.showInformationMessage("This file doesn't belong in this repository.");
							return new Promise((resolve, reject) => {
								return reject(false)}
							);
						}
						
					
					  }
				}
			});
		}else{
			vscode.window.showInformationMessage("You need to open a project first");
		}
		return new Promise((resolve, reject) => {
			return resolve(true)}
		);
	}

	/**
	 * 
	 * @param offset 
	 */
	//this method is called when user want to add a keyword to a specific path with "+" icon at the file name
	add(offset?: vscode.TreeItem):Promise<boolean> {
		console.log("----add()-----")

		if (offset instanceof Highlighter) {
			// Add a keyword.
			vscode.window.showInputBox({ placeHolder: "Input keyword." }).then(async keyword => {
				if (keyword === undefined) {
					return;
				}else{
					let found = offset.keywordItems.find(value => value.label === keyword);
					if (found !== undefined) {
						vscode.window.showInformationMessage("This keyword with this file already exists.");
						return;
					}else{
						await this.check_Git_status(offset.path).then(function () {}).catch(function () {
							return new Promise((resolve, reject) => {
								return reject(false)}
							);
						});
		
						offset.add(keyword,offset.path);
						offset.refresh();

						await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
							this.undo_insertion(offset.path,keyword)
							return new Promise((resolve, reject) => {return reject(false)});
						});

						await this.Make_gitattribute_File().then(function () {}).catch(() => {
							this.undo_insertion(offset.path,keyword)
							this.Execute_Keywords_and_Paths_filter()
							return new Promise((resolve, reject) => {return reject(false)});
						});

						this.refresh();
						this.refresh();
					}
				}
			});
		}
		return new Promise((resolve, reject) => {
			return resolve(true)}
		);
	}
	/**
	 * 
	 * @param keywordItem 
	 */

	//this method is called when user want to edit a keyword to a specific path with pencil icon
    edit(keywordItem?: vscode.TreeItem):Promise<boolean> {
		console.log("----edit()-----")
		if (keywordItem instanceof KeywordItem) {

			let currentKeyword =keywordItem.label;
			vscode.window.showInputBox({placeHolder: "Input keyword.", value: currentKeyword}).then(async newKeyword => {
				if (newKeyword === undefined) {
					return new Promise((resolve, reject) => {
						return reject(false)}
					);
				}

				let index = this.data.findIndex(value => value.path == keywordItem.path);
				if(index == -1){
					return
				}else {
					await this.check_Git_status(keywordItem.path).then(function () {}).catch(function () {
						return new Promise((resolve, reject) => {return reject(false)});
					});
					let oldKeywordSTR = keywordItem.label
					keywordItem.label=newKeyword;
	
					await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(() => {
						keywordItem.label=oldKeywordSTR;
						return new Promise((resolve, reject) => {return reject(false)});
					});

					await this.Make_gitattribute_File().then(function () {}).catch(() => {
						keywordItem.label=oldKeywordSTR;
						this.Execute_Keywords_and_Paths_filter();
						return new Promise((resolve, reject) => {return reject(false)});
					});
					
				}

				this.refresh();
				this.refresh();
			});
		}

		return new Promise((resolve, reject) => {return resolve(true)});

    }

//check if user has Git and if this the he has make at least one change to current file
check_Git_status(filePath:string):Promise<boolean>{
	console.log("check_Git_status()")
	return new Promise((resolve, reject) => {
		let lastSeen =filePath.lastIndexOf("\\");
		let filePath1=filePath.substr(0, lastSeen+1);
		let fileName=filePath.substr(lastSeen+1,filePath.length)
		filePath1=filePath1.charAt(0).toUpperCase() + filePath1.slice(1)
		 //-------------------------- cant  check with 'stdoutProjectDirectory'-----
		exec('cd /d '+filePath1 + ` && git ls-files -m `,async (errorGitStatus:any, stdoutGitStatus:any, stderrGitStatus:any) => {
			if(errorGitStatus !== null || stderrGitStatus!= "") {
				vscode.window.showInformationMessage("An error has occurred, try again.");
				return reject(false)
			}else{
				if(!stdoutGitStatus.includes(fileName))
				{
					vscode.window.showInformationMessage("First you need to make at least one change at the file: "+filePath+" to apply the changes on Git.");
					console.error("error->"+errorGitStatus);
					console.error("stderr->"+stdoutGitStatus);
					console.error("stdout->"+stderrGitStatus);
					return reject(false)
				}else{
					return resolve(true)
				}
			
			}
		});	
		
	});
}

//make .gitattributes file and fill it with filters
Make_gitattribute_File():Promise<boolean>{
	console.log("Make_gitattribute_File()")
	return new Promise(async (resolve, reject) => {
		//clear .gitattributes file from old filters
		await this.deleteOldFilters().then(function () {}).catch(function () {
			return reject(false)
		});
		//write on .gitattributes file new filters
		for(let i=0;i<this.data.length;i++){
			let relativePath = this.data[i].path.replace(this.currentProjectPath,'').replace(/\\/g, "/")
			if(i==0){
				fs.appendFileSync(this.currentProjectPath +'/.gitattributes', "\n"+relativePath+" text eol=lf filter=GitHidderWords"+i,(err:any, data:any) => { 
					if (err){
						vscode.window.showInformationMessage("An error has occurred, try again.");
						return reject(false)
					}
				});
			}else{
				fs.appendFileSync(this.currentProjectPath +'/.gitattributes', "\n"+relativePath+" text eol=lf filter=GitHidderWords"+i+" \n",(err:any, data:any) => { 
					if (err){
						vscode.window.showInformationMessage("An error has occurred, try again.");
						return reject(false)
					}else{
						return resolve(true)
					}
				});
			}
		}
	})

}

//delete old applied filters from .gitattributes file
deleteOldFilters(){
	console.log("deleteOldFilters()");
    return new Promise((resolve, reject) => {
        fs.readFile(this.currentProjectPath +'/.gitattributes', {encoding: 'utf-8'}, (err:any, data:any) => {
            if (err) {
				vscode.window.showInformationMessage("An error has occurred, try again.");
                return reject(false)
            }else{

                let dataArray = data.split('\n'); // convert file data in an array
                const searchKeyword = 'filter=GitHidderWords'; // we are looking for a line, contains, key word 'user1' in the file
            
                var updatedData = new Array()
                for (let index=0; index<dataArray.length; index++) {

                    if (!dataArray[index].includes(searchKeyword) && dataArray[index]!="\n"  && dataArray[index]!="") { // check if a line contains the 'user1' keyword
                        updatedData.push(dataArray[index])
                    }
                }

                var updatedDataStr = updatedData.join('\n');
      
                fs.writeFile(this.currentProjectPath +'/.gitattributes', updatedDataStr, (err:any, data:any) => { 
                    if (err){
						vscode.window.showInformationMessage("An error has occurred,try again.");
                        return reject(false)
                    }else{
                        return resolve(true)
                    }
                });
            }
        });
    })// end of promise
}


//Execute filters with Git commands
Execute_Keywords_and_Paths_filter():Promise<boolean>{
	console.log("Execute_Keywords_and_Paths_filter()");
	return new Promise((resolve, reject) => {
		let PathsStr="";
		let keywordsStr="";
		let filtersSTR="";
		for(let i=0;i<this.data.length;i++){

			let filterStr = '';
			let relativePath =  this.data[i].path.replace(this.currentProjectPath,'').replace(/\\/g, "/")

			this.data[i].keywordItems.forEach(KeywordItem => {

				PathsStr = PathsStr+" "+this.data[i].path+"||";
				keywordsStr = keywordsStr + " "+KeywordItem.label+"|<--GitHidder|"

				let starsMult = Math.floor((Math.random() * 15) + 5)
				let stars = ""
				for(var starsCounter=0;starsCounter<starsMult;starsCounter++){
					stars= stars + "*"
				}

				//check for "/" inside keyword
				let keywordStr = KeywordItem.label;
				if(keywordStr.includes("/")){
					keywordStr=keywordStr.replace(/\//g, "\\/")
				}
				//check for "\" inside keyword
				if(keywordStr.includes("\\")){
					keywordStr=keywordStr.replace(/\\/g, '\\\\')
				}

				filterStr = filterStr + " -e 's/"+keywordStr+"/"+stars+"/g'"

				//detect OS system for "sed"
				if(process.platform === "win32"){
					filtersSTR = filtersSTR+`&& git config filter.GitHidderWords`+i+`.clean "sed`+filterStr+`" && git config filter.GitHidderWords`+i+`.path "`+relativePath+`"`
				}else{
					filtersSTR = filtersSTR+`&& git config filter.GitHidderWords`+i+`.clean "gsed`+filterStr+`" && git config filter.GitHidderWords`+i+`.path "`+relativePath+`"`
				}
				
			});
		}

		exec('cd /d '+this.currentProjectPath + ` && git config filter.GitHidder.clean "`+keywordsStr+`" && git config filter.GitHidder.path "`+PathsStr+`" `+filtersSTR, (error:any, stdout:any, stderr:any) => {
			if(error !== null && stderr != ""){
				console.error("error->"+error);
				console.error("stderr->"+stderr);
				console.error("stdout->"+stdout);
				vscode.window.showInformationMessage("An error has occurred, try again.");
				return reject(false)
			}else{
				return resolve(true)
			}
		})
	});
}

//Fill tree view with keywords and file name/paths when extension is starting
FindPath_and_Keywords(){
	console.log("---FindPath_and_Keywords()---")
	return new Promise((resolve, reject) => {

		exec('cd /d '+this.currentProjectPath + ` && git config filter.GitHidder.clean`, (error:any, keywordsStr:any, stderr:any) => {
			if(error !== null && stderr != ""){
				console.error("error->"+error);
				console.error("stderr->"+stderr);
				console.error("stdout->"+keywordsStr);
				return reject(false)
			}else{
				
				exec('cd /d '+this.currentProjectPath + ` && git config filter.GitHidder.path`, (error:any, pathsStr:any, stderr:any) => {
					if(error !== null && stderr != ""){
						console.error("error->"+error);
						console.error("stderr->"+stderr);
						console.error("stdout->"+pathsStr);
						return reject(false)
					}else{
						if(pathsStr != ""){
							//split and save keywords from config file
							let arrayWithKeywords = keywordsStr.split(/ (.*?)\|<--GitHidder\|/)
							//split and save paths from config file
							let arrayWithPaths = pathsStr.split(/ (.*?)\|\|/)

							for(let i =0 ;i<arrayWithKeywords.length;i++){
								if(i%2 == 1){
									let index = this.data.findIndex(value => value.path === arrayWithPaths[i]);
									if(index == -1){

										let fileName=arrayWithPaths[i].replace(this.currentProjectPath,'')
										if(fileName.split("\\").length - 1 == 1){
											fileName = fileName.substring(1);
										}

										let highlighter = new Highlighter(this.context,this.ColorSet.Red, [],arrayWithPaths[i],fileName)
										highlighter.add(arrayWithKeywords[i],arrayWithPaths[i]).then(function () {}).catch(function () {});
										this.data.push(highlighter);
									}else{
										this.data[index].add(arrayWithKeywords[i],arrayWithPaths[i])
									}
								}
							}
							this.refresh();
							this.refresh();
							return resolve(true)
						}
						
					}
				})
			}
		})
	});
}

//Undo an insertion when an error happens
undo_insertion(filePath:string,selectedKeyword:string){
	console.log("undo_insertion()")
	let index = this.data.findIndex(value => value.path === filePath);
	let found = this.data[index].keywordItems.find(value => value.label === selectedKeyword);
	if(found!== undefined){
		this.data[index].remove(found).then(function () {}).catch(function () {});
		if(this.data[index].keywordItems.length == 0){
			this.data.splice(index,1)
		}
	}
}

//Undo an deeltion when an error happens
undo_deletion(filePath:string,fileName:string,keyword:KeywordItem|KeywordItem[]){
	console.log("undo_deletion()")
	if(keyword instanceof KeywordItem){
		let index = this.data.findIndex(value => value.path === filePath);
		if(index == -1){
			let highlighter = new Highlighter(this.context,this.ColorSet.Red, [],filePath,fileName)
			highlighter.add(keyword.label,filePath)
			this.data.push(highlighter);
		}else{
			this.data[index].add(keyword,filePath)
		}
	}else{
		let highlighter = new Highlighter(this.context,this.ColorSet.Red, [],filePath,fileName)
		for(let i=0;i<keyword.length;i++){
			highlighter.add(keyword[i].label,filePath);
		}
		this.data.push(highlighter);
	}
	
}

//Rename file name and change paths when user rename a file that is saved
Rename_File(event: vscode.FileRenameEvent):Promise<boolean>{
	console.log("---Rename_Files()---")
	event.files.forEach(async element => {
		let oldFilePath = element.oldUri.fsPath
		oldFilePath=oldFilePath.charAt(0).toUpperCase() + oldFilePath.slice(1)
		let newFilePath = element.newUri.fsPath
		newFilePath=newFilePath.charAt(0).toUpperCase() + newFilePath.slice(1)

		let index = this.data.findIndex(value => value.path === oldFilePath)
		if(index != -1){
			
			//keep temporary old paths, keywords and colortype for undo
			let tmpHighlighterFileName = oldFilePath.replace(this.currentProjectPath,'')
			if(tmpHighlighterFileName.split("\\").length - 1 == 1){
				tmpHighlighterFileName = tmpHighlighterFileName.substring(1);
			}
			let tmpHighlighterColor = this.data[index].colortype

			let tmpHighlighterKeywords : KeywordItem[];
				tmpHighlighterKeywords = [...this.data[index].keywordItems]

			this.data[index].keywordItems.forEach(KeywordItem => {
				this.data[index].remove(KeywordItem)
			});

			this.data.splice(index,1)

			let highlighter = new Highlighter(this.context,tmpHighlighterColor, [],newFilePath,tmpHighlighterFileName)
			
			tmpHighlighterKeywords.forEach(KeywordItem =>{
				highlighter.add(KeywordItem.label,newFilePath)
			})

			this.data.push(highlighter);

			await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(()=> {
				//undo the previous additions
				this.data[index].keywordItems.forEach(KeywordItem => {
					this.data[index].remove(KeywordItem)
				});

				this.data.splice(index,1)

				let highlighter = new Highlighter(this.context,tmpHighlighterColor, [],oldFilePath,tmpHighlighterFileName)
				
				tmpHighlighterKeywords.forEach(KeywordItem =>{
					highlighter.add(KeywordItem.label,oldFilePath)
				})

				this.data.push(highlighter);
				return new Promise((resolve, reject) => {return reject(false)});
			});
	
			await this.Make_gitattribute_File().then(function () {}).catch(()=> {
				//undo the previous additions
				this.data[index].keywordItems.forEach(KeywordItem => {
					this.data[index].remove(KeywordItem)
				});

				this.data.splice(index,1)

				let highlighter = new Highlighter(this.context,tmpHighlighterColor, [],oldFilePath,tmpHighlighterFileName)
				
				tmpHighlighterKeywords.forEach(KeywordItem =>{
					highlighter.add(KeywordItem.label,oldFilePath)
				})

				this.data.push(highlighter);
				this.Execute_Keywords_and_Paths_filter();
				return new Promise((resolve, reject) => {return reject(false)});
			});
		}
	})
	this.refresh()
	return new Promise((resolve, reject) => {return resolve(true)});

}

//Delete keywords when a file is been deleted
Delete_File(event: vscode.FileDeleteEvent):Promise<boolean>{
	console.log("----Delete_File()----")
	let file=""
	event.files.forEach(async element => {
		let deletedFilePath = element.fsPath

		deletedFilePath = deletedFilePath.charAt(0).toUpperCase() + deletedFilePath.slice(1)
		let index = this.data.findIndex(value => value.path === deletedFilePath)
		if(index != -1){

			//keep temporary , keywords and colortype for undo
			let tmpHighlighterFileName = deletedFilePath.replace(this.currentProjectPath,'')
			if(tmpHighlighterFileName.split("\\").length - 1 == 1){
				tmpHighlighterFileName = tmpHighlighterFileName.substring(1);
			}

			let tmpHighlighterColor = this.data[index].colortype

			file = tmpHighlighterFileName;

			let tmpHighlighterKeywords : KeywordItem[];
				tmpHighlighterKeywords = [...this.data[index].keywordItems]

			this.data[index].keywordItems.forEach(KeywordItem => {
				this.data[index].remove(KeywordItem)
			});

			this.data.splice(index,1)

			await this.Execute_Keywords_and_Paths_filter().then(function () {}).catch(()=> {
				//undo the previous deletions

				let highlighter = new Highlighter(this.context,tmpHighlighterColor, [],deletedFilePath,tmpHighlighterFileName)
				
				tmpHighlighterKeywords.forEach(KeywordItem =>{
					highlighter.add(KeywordItem.label,deletedFilePath)
				})

				this.data.push(highlighter);
				return new Promise((resolve, reject) => {return reject(false)});
			});
	
			await this.Make_gitattribute_File().then(function () {}).catch(()=> {
				//undo the previous deletions

				let highlighter = new Highlighter(this.context,tmpHighlighterColor, [],deletedFilePath,tmpHighlighterFileName)
				
				tmpHighlighterKeywords.forEach(KeywordItem =>{
					highlighter.add(KeywordItem.label,deletedFilePath)
				})

				this.data.push(highlighter);
				this.Execute_Keywords_and_Paths_filter();
				return new Promise((resolve, reject) => {return reject(false)});
			});

		}
	})
	vscode.window.showInformationMessage("All the keywords from file: "+file+" has been deleted." );
	this.refresh()
	return new Promise((resolve, reject) => {return resolve(true)});

}


	/**
	 * 
	 * @param editors 
	 */
	//refresh tree view
	refresh(editors?: vscode.TextEditor[]) {
		console.log("refresh()fdcnhmk cfghb")
		this._onDidChangeTreeData.fire();
		this.data.forEach(highlighter => highlighter.refresh(editors));
				
	}

	/**
	 * 
	 * @param context 
	 */
	constructor(private context: vscode.ExtensionContext) {
		
		if(vscode.workspace.workspaceFolders != undefined) {
		
			//Path of current oriject directory
			let path = vscode.workspace.workspaceFolders[0].uri.fsPath
			path= path.charAt(0).toUpperCase() + path.slice(1)

			exec('git --version',(error:any, stdout:any, stderr:any) => {
				// console.log("error->"+error);
				// console.log("stderr->"+stderr);
				// console.log("stdout->"+stdout);
				if(error !== null && stderr != ""){
					vscode.window.showInformationMessage("You need to download and install Git with up to 2.0 version.");
				}else{
					if(stdout == `'git' is not recognized as an internal or external command,
					operable program or batch file.`){
						vscode.window.showInformationMessage("You need to download and install Git with up to 2.0 version.");
					}
					else{   
						exec('cd /d'+path + ` && git rev-parse --show-toplevel`, (error:any, stdoutProjectDirectory:any, stderr:any) => {
							if (error != null && stderr!="") {
								vscode.window.showInformationMessage("An error occurred while trying to identify current directory.");
							}else{
								if(stdoutProjectDirectory.replace(/\//g, "\\").replace('\n', "") == path){
									this.currentProjectPath = path;

									this.FindPath_and_Keywords().then(function () {}).catch(function () {
										vscode.window.showInformationMessage("An error occurred while trying to find saved keywords.");
									});
			
								}else{
									vscode.window.showInformationMessage("This directory isn't a Git repository.");
								}
							}
						})
					}
				}
			})
		}

	}

	/**
	 * 
	 * @param element 
	 */

	getTreeItem(element: KeywordItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
		
		return element;
	  }
	
	  getChildren(element?: KeywordItem | Highlighter | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
		if (!element) {
			return this.data;
		}
		else if (element instanceof Highlighter) {
			return element.keywordItems;
		}
		else {
			return [];
		}
	}

}

