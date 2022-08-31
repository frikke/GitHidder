import * as vscode from 'vscode';
import { localeString } from './i18n';
import { ColorInfo } from './GitHidderTree';
import { KeywordItem } from "./KeywordItem";
const fs = require("fs");
import path from 'path';
const { exec } = require("child_process");

/**
 *
 */
export class Highlighter extends vscode.TreeItem {
    decorator: vscode.TextEditorDecorationType | undefined;
    colortype: ColorInfo;
    isActive: boolean;
    isVisible: boolean;
    private children: KeywordItem[];

    constructor(colortype: ColorInfo, children: KeywordItem[]) {
        super(colortype.name, vscode.TreeItemCollapsibleState.Expanded);
        this.isActive = false;
        this.isVisible = true;
        this.colortype = colortype;
        this.children = children;
        this.iconPath = colortype.icon;
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
    remove(keyworditem: KeywordItem) {
        var index = this.children.findIndex(value => value === keyworditem);
        if (0 <= index) {
            this.children.splice(index, 1);
        }
    }
    add(keyword: string | KeywordItem) {
        if (keyword instanceof KeywordItem) {
            if (this.children.findIndex(value => value.label === keyword.label) < 0) {
                this.children.push(keyword);
            }
        }
        else if (typeof keyword === 'string' && 0 < keyword.length) {

            // ----------------------------- Check if user has Git in this PC --------------------------------
            const CheckGit = exec('git --version',(error:any, stdout:any, stderr:any) => {
                if(stdout != `'git' is not recognized as an internal or external command,
                operable program or batch file.`){
                    // --------------------------------Find the path of the file on vs editor -------------------
                            
                    var filePath = "";  //path with "/"
                    var filePath1 = "";  //path with "\"
                    // var filePath2 = "";  //path with file in the end
                    var fileName = "";  //path with file in the end

                    var editor = vscode.window.activeTextEditor;

                    if (editor) {
                        filePath = editor.document.fileName;
                        // console.log(filePath)
                        // filePath2=filePath;
                        // console.log(filePath.lastIndexOf("\\"))
                        let lastSeen =filePath.lastIndexOf("\\");
                        // console.log(filePath.substr(0, lastSeen+1))
                        filePath1=filePath.substr(0, lastSeen+1);
                        fileName=filePath.substr(lastSeen+1,filePath.length)
                        filePath=filePath1.replace(/\\/g, "/")
                        console.log("filePath ->"+filePath)
                        console.log("filePath1 -> "+filePath1)
                        // console.log("filePath2 -> "+filePath2)
                        console.log("fileName -> "+fileName)
                    }

                    // -------------------------------- Make .gitattributes file for filter -------------------
                    const content = '* text eol=lf filter=reductScript';
                    try {
                        fs.writeFileSync(filePath+'/.gitattributes', content);
                        console.log("done making .gitattributes file");
                    } catch (err) {
                        console.log(err);
                    }

                    // ----------------------------- Check changes ----------------------       git diff "C:\Users"
                    const child = exec('cd '+filePath1 + `&& git status `+fileName,
                    (error1:any, stdout1:any, stderr1:any) => {
                        if(error1 !== null || stderr1!= "") {
                            vscode.window.showErrorMessage("An error has occured 1");
                        }else{
                            // console.log("stdout1 -> "+stdout1)
                            if(stdout1.includes(fileName)){
                                console.error("Executing git command");
                                // ----------------------------- Adding word to keywordList --------------------------------
                                if (this.children.findIndex(value => value.label === keyword) < 0) {
                                    this.children.push(new KeywordItem(keyword));
                                    this.refresh();
                                }
                                // ----------------------------- Execute git command filter--------------------------------
                                const child1 = exec('cd '+filePath1 + `&& `+this.makeGitFilterStr(this.children),
                                (error:any, stdout:any, stderr:any) => {
                                    if (error !== null) {
                                        console.log(`exec error: ${error}`);
                                    }else{
                                        console.log("done applying git config filter....");
                                        console.log(`stdout: ${stdout}`);
                                        console.log(`stderr: ${stderr}`);
                                    }
                                });
                            }else{
                                vscode.window.showInformationMessage("First you need to make at least one change to apply the changes on Git");
                            }
                        }
                    });
                }else if(error !== null || stderr!= ""){
                    vscode.window.showErrorMessage("An error has occured 2");
                }else{
                    vscode.window.showInformationMessage("You need to download and install Git with up to 2.0 version");
                }
            });

        }
        const forceVisible = vscode.workspace.getConfiguration('GitHidder').get('forcevisible', true);
        if (forceVisible && !this.isVisible) {
            this.isVisible = true;
        }
    }
    delete() {
        if (this.decorator !== undefined) {
            this.decorator.dispose();
        }
    }
    makeGitFilterStr(KeywordList:KeywordItem[] = []) {
        var allFilterStr=` git config filter.reductScript.clean "sed`
        var str="";
        KeywordList.forEach(keyword =>{
            str = str +" -e 's/"+keyword.label+"/"+"XXXXXXX-YOUR-PASSWORD-XXXXXXX/g'"
        });
        allFilterStr=allFilterStr+str+'"'
        return allFilterStr;
    }
    turnonoff() {
        this.isVisible = this.isVisible === true ? false : true;
    }
    refresh(editors?: vscode.TextEditor[]) {
        //console.log(`Call refresh ${this.colortype.name} color!`);
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
                    backgroundColor: "none",
                    borderColor: this.colortype.code
                },
                dark: {
                    backgroundColor: "none",
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
                this.children.forEach(keyworditem => {
                    while (0 <= (match = text.indexOf(keyworditem.label, match + 1)) && counter < limit) {
                        counter++;
                        const startPos = editor.document.positionAt(match);
                        const endPos = editor.document.positionAt(match + keyworditem.label.length);
                        targets.push({ range: new vscode.Range(startPos, endPos) });
                    }
                    if (limit <= counter) {
                        // Exit foreach loop.
                        return;
                    }
                });
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
        // 

        // --------------- put "Default" next to color if this is "Red"
        this.description = "";
        if(this.colortype.name == "Red"){
            this.description = "(Default)";
        }
        // --------------------------
        this.iconPath = this.isVisible ? this.colortype.icon : this.colortype.hideicon;
    }

    checkExistKeyword(keyword: string | KeywordItem): boolean {
        if (keyword instanceof KeywordItem) {
            if (this.children.findIndex(value => value === keyword) < 0) {
                return false;
            }
        }
        else {
            if (this.children.findIndex(value => value.label === keyword) < 0) {
                return false;
            }
        }
        return true;
    }

    readonly contextValue = "highlighter";
}
