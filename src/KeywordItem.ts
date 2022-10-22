import * as vscode from 'vscode';
// import * as crypto from 'crypto';

/**
 *
 */

export class KeywordItem extends vscode.TreeItem {
	label:string;
	path :string;

	constructor(context:vscode.ExtensionContext,label: string,path: string) {
		super( path, vscode.TreeItemCollapsibleState.None);

		this.label = label;
		this.path = path;

		this.iconPath = {
			light: context.asAbsolutePath('resources/LockDark.svg'),
			dark: context.asAbsolutePath('resources/LockLight.svg')
		};
	  
	}
    readonly contextValue = "keyworditem";


	getKeywordPath(){
		return this.path;
	}

}






