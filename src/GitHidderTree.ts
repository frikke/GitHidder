import * as vscode from 'vscode';
import { localeString } from './i18n';
import { isArray } from 'util';
import { Highlighter } from './Highlighter';
import { KeywordItem } from './KeywordItem';
import { Path } from './KeywordItem';
import { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } from 'constants';
import { runInThisContext } from 'vm';

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
		var found: boolean = false;
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
			const found = highlighter.keywordItems.find(value => value.label === keyword);
			if (found !== undefined && highlighter.colortype.name.toLowerCase() === color.toLowerCase()) {
				highlighter.remove(found);
				deleteOperation = true;
			}
			else if (found !== undefined) {
				highlighter.remove(found);
			}
		});
		if (deleteOperation) {
			this.refresh();
			return;
		}

		// Add keyword to target highlighter.
		let highlighter = this.data.find(highlighter => highlighter.colortype.name.toLowerCase() === color.toLowerCase());
		if (highlighter === undefined) {
			var colorinfo = this._colorset.filter(value => value.name.toLowerCase() === color.toLowerCase())[0];
			highlighter = new Highlighter(this.context,colorinfo, [],"Start");
			this.data.push(highlighter);
		}
		if (highlighter === undefined) {
			return;
		}
		highlighter.add(keyword);
		this.refresh();
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
			() => vscode.window.showInformationMessage(localeString('GitHidder.information.done')),
			(reason) => vscode.window.showErrorMessage(localeString('GitHidder.error') + "\n" + reason)
		);
	}

	/**
	 * Load the keywordlist from workspace settings.json.
	 */
	load(): boolean {
		console.log("aaaaaaaaaaaaaaaaaaaa11111")
		const GitHidderconfig = vscode.workspace.getConfiguration("GitHidder");
		if (GitHidderconfig === undefined) {
			console.log("11111111111111111111111111")
			return false;
		}
		if (GitHidderconfig.has("savelist") === false) {
			console.log("222222222222222222")
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
			console.log("44444444")
			return false;
			
		}
		savelist.forEach(obj => {
			console.log("sfsdvfscvs")
			let highlighter = new Highlighter(this.context,this._colorset.filter(value => value.name.toLowerCase() === obj.color.toLowerCase())[0], [],"");
			obj.keyword.forEach(key => highlighter.add(key));
			this.data.push(highlighter);
			console.log("5555555555555")
		});
		// this.refresh()
		return true;
	}

	/**
	 * 
	 * @param offset 
	 */
	change(offset: vscode.TreeItem) {
		console.log(`Get value ${offset.label}.`);
		// Select color in QuickPick.
		vscode.window.showQuickPick(this._colorset.map(item => item.name)).then(select => {
			if (select === undefined) {
				return;
			}

			// var wasActive = false;
			var targetItems: KeywordItem[] = [];
			if (offset instanceof Highlighter) {
				// backup and create new instance.
				(<Highlighter>offset).keywordItems.forEach(keyword => targetItems.push(new KeywordItem(this.context,"",keyword.label)));
				// delete selected instance.
				this.data = this.data.filter(highlighter => highlighter.colortype !== (<Highlighter>offset).colortype);
				// if ((<Highlighter>offset).isActive) {
				// 	wasActive = true;
				// }
				(<Highlighter>offset).delete();
			}
			else if (offset instanceof KeywordItem) {
				// backup and create new instance.
				targetItems.push(new KeywordItem(this.context,"",(<KeywordItem>offset).label));
				// delete selected instance.
				this.data.forEach(highlighter => {
					highlighter.keywordItems = highlighter.keywordItems.filter(keyword => keyword.label !== (<KeywordItem>offset).label);
				});
			}

			var selectcolorinfo = this._colorset.filter(value => value.name === select)[0];
			// Get a color to add keywords.
			var newhighlighter = this.data.find(value => {
				return (value.colortype === selectcolorinfo);
			});
			if (newhighlighter === undefined) {
				newhighlighter = new Highlighter(this.context,selectcolorinfo, [],"Start");
				this.data.push(newhighlighter);
			}

			

			targetItems.forEach(keyword => {
				if (newhighlighter !== undefined) {
					newhighlighter.add(keyword);
				}
			});
			// if (newhighlighter !== undefined && wasActive) {
			// 	this.changeActive(newhighlighter);
			// }
			console.log("change()-refresh")
			this.refresh();
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

		//delete color 
		if (offset instanceof Highlighter) {
			console.log(`Get value delete1 ${offset.label}.`);
			
			offset.delete();
			this.data = this.data.filter(highlighter => highlighter !== offset);
	
			// this.refresh();
			this.data.push(new Highlighter(this.context,this.ColorSet.Red, [],"New"));
			console.log("del-1()-refresh")
			this.refresh();
		

		}//delete keyword from a color
		else if (offset instanceof KeywordItem) {
			console.log(`Get value delete2 ${offset.label}.`);
			this.data.forEach(highlighter => {
				highlighter.remove(offset);
				// highlighter.keywordItems = highlighter.keywordItems.filter(keyworditem => keyworditem !== offset);
			});
			console.log("del-2()-refresh")
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
						var newhighlighter = new Highlighter(this.context,colorinfo, [],"Start");
						this.data.push(newhighlighter);
						// this.changeActive(newhighlighter);
						console.log("add-1()-refresh")
						this.refresh();
					}
				}
			});
		}
		else if (offset instanceof Highlighter) {
			// Add a keyword.
			vscode.window.showInputBox({ placeHolder: "Input keyword." }).then(keyword => {
				if (keyword === undefined) {
					return;
				}
				if (this.checkExistKeyword(keyword)) {
					return;
				}
				offset.add(keyword);
				offset.refresh();
				this.refresh();
			});
		}
	}

    edit(keywordItem: vscode.TreeItem) {
		console.log("edit()")
		if (keywordItem.contextValue !== "keyworditem") {
			return;
		}
		let currentKeyword = keywordItem.label;
		console.log("currentKeyword---->"+currentKeyword)
		vscode.window.showInputBox({placeHolder: "Input keyword.", value: currentKeyword}).then(newKeyword => {
			if (newKeyword === undefined) {
				return;
			}
			if (!this.checkExistKeyword(newKeyword)) {
				console.log("currentKeyword---->"+currentKeyword)
				keywordItem.label = newKeyword;
				console.log("edit()---->"+newKeyword)
				this.refresh();
			}
		});
    }



	/**
	 * 
	 * @param editors 
	 */
	refresh(editors?: vscode.TextEditor[]) {
		console.log("refresh()")
		this._onDidChangeTreeData.fire();
		this.data.forEach(highlighter => highlighter.refresh(editors));
	}

	/**
	 * 
	 * @param context 
	 */
	constructor(private context: vscode.ExtensionContext) {
		console.log("aaaaaaaaaaaaaaaaaaaa33333")
		// vscode.window.showInformationMessage('GitHidderTreeDataProvider constractor.');

		this.context = context
		var result = this.load();
		if (!result) {
			this.data.push(new Highlighter(this.context,this.ColorSet.Red, [],"Start"));
		}

		this.refresh();

		// this.changeActive(this.data[0]);
	}

	/**
	 * 
	 * @param element 
	 */

	getTreeItem(element: KeywordItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
		console.log("getTreeItem")
		return element;
	  }
	
	  getChildren(element?: KeywordItem|undefined): vscode.ProviderResult<vscode.TreeItem[]> {
		console.log("getChildren")
		if (element === undefined) {
		  return this.data;
		}
		return element.children;
	  }

	/**
	 * 
	 * @param keyword 
	 */
	private checkExistKeyword(keyword: string, showInfo = true): boolean {
		console.log("checkExistKeyword")
		let result: boolean = false;
		this.data.forEach(highlighter => {
			if (highlighter.checkExistKeyword(keyword)) {
				result = true;
				return;
			}
		});
		if (result && showInfo) {
			vscode.window.showInformationMessage(localeString('GitHidder.warning.existkeyword'));
		}
		return result;
	}
}

