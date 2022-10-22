import * as vscode from 'vscode';
import { localeString } from './i18n';
import { ColorInfo } from './GitHidderTree';
import { KeywordItem } from "./KeywordItem";

/**
 *
 */
export class Highlighter extends vscode.TreeItem {
    decorator: vscode.TextEditorDecorationType | undefined;
    colortype: ColorInfo;
    isVisible: boolean;
    private children: KeywordItem[];
    iconPath : string;
    context: vscode.ExtensionContext;
    path:string;
    fileName:string
    

constructor(context:vscode.ExtensionContext,colortype: ColorInfo, children: KeywordItem[],path:string,fileName:string) {
    
    super(fileName, vscode.TreeItemCollapsibleState.Expanded);
    this.isVisible = true;
    this.colortype = colortype;
    this.children = children;
    this.iconPath = colortype.icon;
    this.context = context;
    this.path=path
    this.fileName=fileName;

}


    get keywordItems() {
        return this.children;
    }

    set keywordItems(children: KeywordItem[]) {
        this.children = children;
        this.refresh();
    }


    clear() {
        this.children = [];
    }

//remove keyword
async remove(keyworditem: KeywordItem) {

    console.log("remove")
    var index = this.children.findIndex(value => value === keyworditem);

    //if keyword exists
    if (0 <= index) {
        this.children.splice(index, 1);
        this.refresh();
    }

}


//add keyword
async add(keyword: string | KeywordItem,path:string):Promise<boolean>  {
    console.log("add")
    if(typeof keyword === 'string' && 0 < keyword.length)
    {
        if (this.children.findIndex(value => value.label === keyword) < 0) {  //new keyword new file
        
            this.children.push(new KeywordItem(this.context,keyword,path));
            
            this.refresh();

        } 
    }   
                    
      
    const forceVisible = vscode.workspace.getConfiguration('GitHidder').get('forcevisible', true);
    if (forceVisible && !this.isVisible) {
        this.isVisible = true;
    }

    return new Promise((resolve, reject) => {
        return resolve(true)
    });

}



changeColor(colortype: ColorInfo ) {
    this.colortype = colortype;
}

delete() {
    if (this.decorator !== undefined) {
        this.decorator.dispose();
    }
}

turnonoff() {
    this.isVisible = this.isVisible === true ? false : true;
}




refresh(editors?: vscode.TextEditor[]) {
    if (this.decorator !== undefined) {
        this.decorator.dispose();
    }
    if (this.isVisible) {
        // Define color.
        var decbrightnessdark: number = vscode.workspace.getConfiguration('GitHidder').get('brightness.dark', 85);
        if (decbrightnessdark === undefined) {
            decbrightnessdark = 85;
        }
        var brightnessdark: string = Math.abs(decbrightnessdark).toString(16).toUpperCase();
        var decbrightnesslight: number = vscode.workspace.getConfiguration('GitHidder').get('brightness.light', 85);
        if (decbrightnesslight === undefined) {
            decbrightnesslight = 85;
        }
        var brightnesslight: string = Math.abs(decbrightnesslight).toString(16).toUpperCase();
        this.decorator = vscode.window.createTextEditorDecorationType({
            // overviewRulerColor: this.colortype.code,   if you want the color to appear in right bar 
            overviewRulerLane: vscode.OverviewRulerLane.Center,
            borderWidth: '0 0 3px 0',
            borderRadius: '0px',
            borderStyle: 'solid',
            light: {
                backgroundColor: this.colortype.code + brightnesslight,
                borderColor: this.colortype.code
            },
            dark: {
                backgroundColor: this.colortype.code + brightnessdark,
                borderColor: this.colortype.code
            }
        });

        // If target text editors aren't inputted, all visible editors are targeted.
        if (editors === undefined) {
            editors = vscode.window.visibleTextEditors;
        }

        // Set decoration to text editors.
        let counter = 0;
        let limit = vscode.workspace.getConfiguration('GitHidder').get('upperlimit', 100000);
        editors.forEach(editor => {
            if (editor === undefined) {
                return;
            }
            if (limit === undefined) {
                limit = 100000;
            }
            const text = editor.document.getText();
            const targets: vscode.DecorationOptions[] = [];
            let match: number = -1;

            var currentTextEditor = vscode.window.activeTextEditor;

            var currentTextEditorPath=""
            if (currentTextEditor) {
                currentTextEditorPath = currentTextEditor.document.fileName;
                currentTextEditorPath = currentTextEditorPath.charAt(0).toUpperCase() + currentTextEditorPath.slice(1)
                this.children.forEach(keyworditem => {
                    //check if current open text editor path exists in the list and display only the keywords from this path
                    if(keyworditem.getKeywordPath() == currentTextEditorPath ){

                        while (0 <= (match = text.indexOf(keyworditem.label, match + 1)) && counter < limit) {
                            counter++;
                            const startPos = editor.document.positionAt(match);
                            const endPos = editor.document.positionAt(match + keyworditem.label.length);
                            targets.push({ range: new vscode.Range(startPos, endPos) });
                        }
                        if (limit <= counter) {
                            return;
                        }
                    }
                    
                });
            }

            if (limit <= counter) {
                vscode.window.showErrorMessage(localeString('GitHidder.warning.upperlimit.1') +
                    limit.toString() +
                    localeString('GitHidder.warning.upperlimit.2'));
                return;
            }
            if (this.decorator !== undefined && 0 < targets.length) {
                editor.setDecorations(this.decorator, targets);
            }
        });
    }

    this.iconPath = this.colortype.icon ;
}

    readonly contextValue = "highlighter";
}
