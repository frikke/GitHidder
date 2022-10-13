import * as vscode from 'vscode';
// import * as crypto from 'crypto';

/**
 *
 */
 export class Path extends vscode.TreeItem {
	children: vscode.TreeItem[]|undefined;
	path:string;
	filePath:string;

	constructor(path: string,filePath: string,context:vscode.ExtensionContext ,children?: vscode.TreeItem[]) {
		super(
			filePath,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
									vscode.TreeItemCollapsibleState.Collapsed);
		this.children = children;
		this.path = path;
		this.filePath = filePath;
		this.iconPath = {
			light: context.asAbsolutePath('resources/PathLight.svg'),
			dark: context.asAbsolutePath('resources/PathDark.svg')
		};


	}
    readonly contextValue = "path";

	getPath(){
		return this.path;
	}
}



export class KeywordItem extends vscode.TreeItem {
	label:string;
	children : Path[]=[];
	path :string;

	constructor(context:vscode.ExtensionContext,label: string,path: string) {
		super( label, vscode.TreeItemCollapsibleState.Collapsed);

		this.label = label;
		this.path = path;

		let lastSeen =path.lastIndexOf("\\");
        let filePath=path.substr(0, lastSeen+1);
        let fileName=path.substr(lastSeen+1,filePath.length)

		this.children.push(new Path(path,fileName,context))
		this.iconPath = {
			light: context.asAbsolutePath('resources/LockDark.svg'),
			dark: context.asAbsolutePath('resources/LockLight.svg')
		};
	  
	}
    readonly contextValue = "keyworditem";


	getKeywordPath(){
		let strPath = "" ;
		if(this.children.length != 0){
			this.children.forEach(path => {
				strPath = path.getPath()

			});
		}
		return strPath;
	}

	getPathArray(){
		return this.children;
	}
}






