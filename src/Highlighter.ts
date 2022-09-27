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
    iconPath : string;
    context: vscode.ExtensionContext;

    constructor(context:vscode.ExtensionContext,colortype: ColorInfo, children: KeywordItem[],state:string) {
        super(colortype.name, vscode.TreeItemCollapsibleState.Expanded);
        this.isActive = false;
        this.isVisible = true;
        this.colortype = colortype;
        this.children = children;
        this.iconPath = colortype.icon;
        this.context = context;
        

        // // --------------------------- Check git existance ------------------------------
        const CheckGit = exec('git --version',(error:any, stdout:any, stderr:any) => {
            if(stdout != `'git' is not recognized as an internal or external command,
            operable program or batch file.`){

                var filePath = "";  //path with "/"
                var filePath1 = "";  //path with "\"

                var editor = vscode.window.activeTextEditor;

                if (editor) {
                    filePath = editor.document.fileName;
                    let lastSeen =filePath.lastIndexOf("\\");
                    filePath1=filePath.substr(0, lastSeen+1);
                }

                if(state == "Start"){
                    const child = exec('cd '+filePath1 + ` && git config filter.GitHidderWords.clean  `,(error1:any, stdout1:any, stderr1:any) => {
                        if(error1 !== null || stderr1!= "") {
                            vscode.window.showErrorMessage("An error has occured 0");
                        }else{
                            if(stdout1 != "sed\n" && stdout1!=null){
                                var re = /-e 's\/(.*?)\//g;
                                var m;
                                var i=0;
                                do {
                                    m = re.exec(stdout1);
                                    if (m) {
                                        m.forEach((element) => {
                                            if(i%2 ==1){
                                                // this.addToList(element);
                                                this.FindPath(element);
                                            }
                                            i++;
                                        });
                                    }
                                } while (m);
                                this.refresh()
                            }
                        }
                    }); 
                }else{
                    const child = exec('cd '+filePath1 + ` && git config filter.GitHidderWords.clean  "sed" `,(error1:any, stdout1:any, stderr1:any) => {
                        if(error1 !== null || stderr1!= "") {
                            vscode.window.showErrorMessage("An error has occured 0");
                        }else{
                           this.deleteFiterFromAttributeFile(filePath1);
                            console.log("deleting all done")
                        }
                    }); 
                }
            }else{
                vscode.window.showInformationMessage("You need to download and install Git with up to 2.0 version");
            }  
        });
        
      
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
        console.error("remove")
        var index = this.children.findIndex(value => value === keyworditem);

        console.error("length--1->"+this.children.length)
        if (0 <= index) {
            console.error("remove1")

            var editor = vscode.window.activeTextEditor;
            if (editor) {
                var currentfilePath = editor.document.fileName;
                let lastSeen =currentfilePath.lastIndexOf("\\");
                var currentFileDirectoryPath=currentfilePath.substr(0, lastSeen+1);
                var currentfileName=currentfilePath.substr(lastSeen+1,currentfilePath.length)
                 // ----------------------------- Check changes ----------------------       git diff "C:\Users"
                 const child = exec('cd '+currentFileDirectoryPath + `&& git status `+currentfileName,(error1:any, stdout1:any, stderr1:any) => {
                    if(error1 !== null || stderr1!= "") {
                        vscode.window.showErrorMessage("An error has occured 1");
                    }else{
                        if(stdout1.includes(currentfileName)){
                            console.log("Executing git command");
                             // ----------------------------- Remove string from list --------------------------------
                            this.children.splice(index, 1);
                            this.refresh();

                            let git_comm=this.Execute_git_command(currentFileDirectoryPath)

                            if(!git_comm ){
                                vscode.window.showInformationMessage("An error has occured");
                            }else{
                                if(this.children.length == 0){
                                    console.log("delete filter from gitattribute")
                                    this.deleteFiterFromAttributeFile(currentFileDirectoryPath);
                                }
                            }
                          
                        }else{
                            vscode.window.showInformationMessage("First you need to make at least one change to apply the changes on Git");
                        }
                    }
                });
            }
        }
    }


    deleteFiterFromAttributeFile(filePath:string) {
        const child1 = exec('cd '+filePath + `&& git rev-parse --show-toplevel`, (error:any, stdout:any, stderr:any) => {
            if (error != null) {
                console.log("error on deleting .gitattributes file"+error);
            }else{
                fs.readFile(stdout.replace(/\\/g, "/").replace('\n', "") +'/.gitattributes', 'utf8', (err:any, data:any) => {
                    if (err) {
                        throw err;
                    //   return
                    }else{
                        //write again the content of file to file
                        data = data.replace('* text eol=lf filter=GitHidderWords','');
                        fs.writeFileSync(stdout.replace(/\\/g, "/").replace('\n', "") +'/.gitattributes', data);
                    }
                });
            }
        });
    }



    Execute_git_command(currentFileDirectoryPath: string ){
        // ----------------------------- Execute git command filter --------------------------------
        const child1 = exec('cd '+currentFileDirectoryPath + ` && `+this.makeGitFilterStr(this.children), (error:any, stdout:any, stderr:any) => {
            if (error !== null) {
                console.log(`exec error --> ${error}`);
                return false
            }else{
                console.log("done applying git config filter....");
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                console.error("length--2->"+this.children.length)
                return true
            }
        });
        return true;
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
                        let lastSeen =filePath.lastIndexOf("\\");
                        // console.log(filePath.substr(0, lastSeen+1))
                        filePath1=filePath.substr(0, lastSeen+1);
                        fileName=filePath.substr(lastSeen+1,filePath.length)
                        // filePath=filePath1.replace(/\\/g, "/")
                        // console.log("filePath ->"+filePath)
                        // console.log("filePath1 -> "+filePath1)
                        // console.log("filePath2 -> "+filePath2)
                        // console.log("fileName -> "+fileName)
                    }

                    // // -------------------------------- Get project directory path1 -------------------
                    const child1 = exec('cd '+filePath1 + `&& git rev-parse --show-toplevel`, (errorGetProjPath:any, stdoutGetProjPath:any, stderrGetProjPath:any) => {
                        if (errorGetProjPath != null) {
                            // console.log("error on add 'Get root project directory path1'"+errorGetProjPath);
                            vscode.window.showErrorMessage("An error has occured 0");
                        }else{
                        // ----------------------------- Check changes ----------------------       git diff "C:\Users\...\."
                        const child = exec('cd '+filePath1 + ` && git status`,(errorGitStatus:any, stdoutGitStatus:any, stderrGitStatus:any) => {
                            if(errorGitStatus !== null || stderrGitStatus!= "") {
                                vscode.window.showErrorMessage("An error has occured 1");
                            }else{
                                if(stdoutGitStatus.includes(fileName)){
                                    this.MakeGitAttribute(stdoutGetProjPath.replace('\n', "").replace(/\//g, "\\"))
                                    // ----------------------------- Adding word to keywordList --------------------------------
                                    if (this.children.findIndex(value => value.label === keyword) < 0) {
                                        // this.children.push(new KeywordItem(keyword));
                                        this.children.push(new KeywordItem(this.context,keyword,filePath1+fileName));
                                    }
                                    // ----------------------------- Execute git command filter --------------------------------
                                    let git_word=this.Execute_git_command(stdoutGetProjPath.replace('\n', "").replace(/\//g, "\\"))

                                    if(!git_word ){
                                        vscode.window.showInformationMessage("An error has occured git_word");
                                    }else{
                                       let git_path=this.makeGitFilterPath(stdoutGetProjPath.replace(/\\/g, "/").replace('\n', ""),filePath1+fileName,keyword)
                                        if(!git_path ){
                                            vscode.window.showErrorMessage("An error has occured git_path");
                                        }
                                    }
                                  
                                }else{
                                    vscode.window.showInformationMessage("First you need to make at least one change to apply the changes on Git");
                                    // this.children.splice(testRowIndex, 1);
                                    // this.refresh();
                                    return;
                                }
                            }
                        });
                        }
                    });


                }else if(error !== null || stderr!= ""){
                    vscode.window.showErrorMessage("An error has occured 2");
                    return;
                    
                }else{
                    // this.children.splice(testRowIndex, 1);
                    // this.refresh();
                    vscode.window.showInformationMessage("You need to download and install Git with up to 2.0 version");
                    return;
                }
            });
           
        }

        

        const forceVisible = vscode.workspace.getConfiguration('GitHidder').get('forcevisible', true);
        if (forceVisible && !this.isVisible) {
            this.isVisible = true;
        }


        // if (keyword instanceof KeywordItem) {
        //     console.log("11111111")
        //     if (this.children.findIndex(value => value.label === keyword.label) < 0) {
        //         this.children.push(keyword);
        //     }
        // }
        // else if (typeof keyword === 'string' && 0 < keyword.length) {
        //     if (this.children.findIndex(value => value.label === keyword) < 0) {
        //         this.children.push(new KeywordItem(keyword));
        //     }
        // }
        // const forceVisible = vscode.workspace.getConfiguration('multicolorhighlighter').get('forcevisible', true);
        // if (forceVisible && !this.isVisible) {
        //     this.isVisible = true;
        // }
    }



    addToList(keyword: string | KeywordItem,path:string) {
        if (keyword instanceof KeywordItem) {
            if (this.children.findIndex(value => value.label === keyword.label) < 0) {
                this.children.push(keyword);
            }
        }
        else if (typeof keyword === 'string' && 0 < keyword.length) {
            if (this.children.findIndex(value => value.label === keyword) < 0) {
                this.children.push(new KeywordItem(this.context,keyword,path));
            
               
                  
                
            }
        }                      
        const forceVisible = vscode.workspace.getConfiguration('GitHidder').get('forcevisible', true);
        if (forceVisible && !this.isVisible) {
            this.isVisible = true;
        }
    }



    MakeGitAttribute(stdoutGetProjPath:string) {
        // -------------------------------- Make .gitattributes file for filter -------------------
        const content = '* text eol=lf filter=GitHidderWords \nfilter=GitHidderPaths';

        try {
            //Check existence of .gitattributes file
            if (fs.existsSync(stdoutGetProjPath.replace(/\\/g, "/").replace('\n', "") +'/.gitattributes')) {
                //file .gitattribute exists 
                fs.readFile(stdoutGetProjPath.replace(/\\/g, "/").replace('\n', "") +'/.gitattributes', 'utf8', (err:any, data:any) => {
                    if (err) {
                        throw err;
                    //   return
                    }else{
                        //write to the end of file
                        if(!data.includes(content)){
                            fs.appendFileSync(stdoutGetProjPath.replace(/\\/g, "/").replace('\n', "") +'/.gitattributes', "\n"+content);
                        }
                    }
                });
            }else{
                //make new file
                fs.writeFileSync(stdoutGetProjPath.replace(/\\/g, "/").replace('\n', "") +'/.gitattributes', content);
            }
            console.log("done making .gitattributes file");
            
        } catch (err) {
            console.log("error on add 'Make .gitattributes file for filter1'"+err);
            vscode.window.showErrorMessage("An error has occured 0");
            return;
        }
        return;
    }


    delete() {
        if (this.decorator !== undefined) {
            this.decorator.dispose();
        }
    }



    // getRootDirectory() {
    //     var editor = vscode.window.activeTextEditor;
    //     var filePath="",filePath1=""
    //     if (editor) {
    //         filePath = editor.document.fileName;
    //         let lastSeen =filePath.lastIndexOf("\\");
    //         filePath1=filePath.substr(0, lastSeen+1);
    //         filePath=filePath1.replace(/\\/g, "/")
    //     }

    //     const child1 = exec('cd '+filePath1 + `&& git rev-parse --show-toplevel`, (error:any, stdout:any, stderr:any) => {
    //         console.log(`stdout-->: ${stdout}`);
    //         console.log(`error--> ${error}`);
    //         console.log(`stderr--> ${stderr}`);
    //         if (error != null) {
    //             rootDirectoryPath = "";
    //             console.log(`rootDirectoryPath1 --> ${rootDirectoryPath}`);
    //         }else{
    //             rootDirectoryPath = stdout
    //             console.log(`rootDirectoryPath2 --> ${rootDirectoryPath}`);
    //         }
    //     });
    //       rootDirectoryPath = "";
    // }


makeGitFilterStr(KeywordList:KeywordItem[] = []) {
    var allFilterStr=` git config filter.GitHidderWords.clean "sed`
    var str="";
    KeywordList.forEach(keyword =>{
        str = str +" -e 's/"+keyword.label+"/"+"XXXXXXX-YOUR-PASSWORD-XXXXXXX/g'"
    });
    allFilterStr=allFilterStr+str+'"'
    return allFilterStr;
}



makeGitFilterPath(stdoutGetProjPath:string,filePath:string,keyword:string,) {
    console.log("makeGitFilterPath()");
    const child1 = exec('cd '+stdoutGetProjPath + ` && git config filter.GitHidderPaths.clean `,(errorGitPaths:any, stdoutGitPaths:any, stderrGitPaths:any) => {
        if(errorGitPaths !== null || stderrGitPaths!= "") {
            return false;
        }
        let new_path=stdoutGitPaths+" "+keyword+"|"+filePath+"|";
        new_path=new_path.replace('\n', "")
        const child2 = exec('cd '+stdoutGetProjPath + ` && git config filter.GitHidderPaths.clean "`+new_path+`" `,(errorGitPathsExecute:any, stdoutGitPathsExecute:any, stderrGitPathsExecute:any) => {
           if(errorGitPathsExecute !== null && stderrGitPathsExecute != ""){
                console.log("errorGitPathsExecute->"+errorGitPathsExecute);
                console.log("stderrGitPathsExecute->"+stderrGitPathsExecute);
                console.log("stdoutGitPathsExecutes->"+stdoutGitPathsExecute);
                return false;
            }else{
                return true;
            }
            // console.log("xxxxxx");
            // return
        });
    });

    return true;
    
 }




FindPath(keyword:string) {

    console.log("FindPath()-->"+keyword)
    var filePath = "";  //path with "/"
    var filePath1 = "";  //path with "\"

    var editor = vscode.window.activeTextEditor;

    if (editor) {
        filePath = editor.document.fileName;
        let lastSeen =filePath.lastIndexOf("\\");
        filePath1=filePath.substr(0, lastSeen+1);
    }

    // -------------------------------- Get project directory path1 -------------------
    const child1 = exec('cd '+filePath1 + ` && git rev-parse --show-toplevel `,(errorGitProjDir:any, stdoutGitProjDir:any, stderrGitProjDir:any) => {
        if(errorGitProjDir !== null || stderrGitProjDir!= "") {
            return "";
        }else{
            const child2 = exec('cd '+stdoutGitProjDir.replace(/\\/g, "/").replace('\n', "") + ` && git config filter.GitHidderPaths.clean`,(errorGitPathsExecute:any, stdoutGitPathsExecute:any, stderrGitPathsExecute:any) => {
                if(errorGitPathsExecute !== null && stderrGitPathsExecute != ""){
                     console.log("errorGitPathsExecute->"+errorGitPathsExecute);
                     console.log("stderrGitPathsExecute->"+stderrGitPathsExecute);
                     console.log("stdoutGitPathsExecutes->"+stdoutGitPathsExecute);
                     return ;
                 }else{
                    // let lastSeen =stdoutGitPathsExecute.lastIndexOf(keyword)-1;
                    console.log("stdoutGitPathsExecute-->"+stdoutGitPathsExecute);
                    // stdoutGitPathsExecute = stdoutGitPathsExecute.replace(/\\/g, "/").replace('\n', "");
                 
                    let indexOfKeyword = stdoutGitPathsExecute.indexOf(keyword);
                    let substring = stdoutGitPathsExecute.substring(indexOfKeyword,stdoutGitPathsExecute.length);
                    let path = substring.split(keyword+'|').pop().split("|")[0];

                    this.addToList(keyword,path)
                 
                    return ;
                   
                 }
             });
        }
       
    });

    return ;
    
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

                var currentTextEditor = vscode.window.activeTextEditor;

                var currentTextEditorPath=""
                if (currentTextEditor) {
                    currentTextEditorPath = currentTextEditor.document.fileName;
                   
                    this.children.forEach(keyworditem => {
                        // console.log("currentTextEditorPath-->"+currentTextEditorPath);
                        // console.log("keyworditemPath-->"+keyworditem.getKeywordPath());
                        if(keyworditem.getKeywordPath() == currentTextEditorPath ){
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
