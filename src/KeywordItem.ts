import * as vscode from 'vscode';
// import * as crypto from 'crypto';

/**
 *
 */
 export class Path extends vscode.TreeItem {
	children: vscode.TreeItem[]|undefined;
	path:string;

	constructor(path: string,context:vscode.ExtensionContext ,children?: vscode.TreeItem[]) {
		super(
			path,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
									vscode.TreeItemCollapsibleState.Collapsed);
		this.children = children;
		this.path = path;
		this.iconPath = {
			light: context.asAbsolutePath('resources/PathLight.svg'),
			dark: context.asAbsolutePath('resources/PathDark.svg')
		};

	//   this.iconPath=context.asAbsolutePath('resources/cyan.svg');
	}
    readonly contextValue = "path";
    // readonly md5 = crypto.createHash('md5').update(this.label).digest('hex');

	getPath(){
		return this.path;
	}
}



export class KeywordItem extends vscode.TreeItem {
	label:string;
	children : Path[]=[];

	constructor(context:vscode.ExtensionContext,label: string,path: string) {
		super( label, vscode.TreeItemCollapsibleState.Collapsed);

	//   this.children = children;
		this.label = label;
		this.children.push(new Path(path,context))
		// this.iconPath=context.asAbsolutePath('resources/LockLigth.svg');
		this.iconPath = {
			light: context.asAbsolutePath('resources/LockDark.svg'),
			dark: context.asAbsolutePath('resources/LockLight.svg')
		};
	  
	}
    readonly contextValue = "keyworditem";
    // readonly md5 = crypto.createHash('md5').update(this.label).digest('hex');

	getKeywordPath(){
		let strPath = "" ;
		if(this.children.length != 0){
			this.children.forEach(path => {
				strPath = path.getPath()

			});
		}
		return strPath;
	}
}






