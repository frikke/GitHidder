import * as vscode from 'vscode';
import { localeString } from './i18n';
import { ColorInfo } from './GitHidderTree';
import { KeywordItem } from "./KeywordItem";
const fs = require("fs");
// const { exec } = require("child_process");
var {exec} = require('child_process') ;

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
    currentProjectPath:string;
    

constructor(context:vscode.ExtensionContext,colortype: ColorInfo, children: KeywordItem[],state:string,projectDirectory:string) {
    super(colortype.name, vscode.TreeItemCollapsibleState.Expanded);
    this.isActive = false;
    this.isVisible = true;
    this.colortype = colortype;
    this.children = children;
    this.iconPath = colortype.icon;
    this.context = context;
    this.currentProjectPath = projectDirectory;

    //if extension is starting
    if(state == "Start"){
        this.FindPath_and_Keywords().then(function () {}).catch(function () {
            vscode.window.showErrorMessage("An error occurred at the start of extension");
            return
        });

        this.refresh();
        this.refresh();
    }else{ //if user choose "Reveal all"

        console.log("deleting all...")

        let uniqueRelativePathsArray = this.makeGitAttributeFilters();

        this.MakeGitAttribute(uniqueRelativePathsArray).then(function () {}).catch(function () {
            console.log("An error has occured please try again 0.1");
            return
        });

        for(var i=0;i<uniqueRelativePathsArray.length;i++){
            this.makeGitFilterStr(uniqueRelativePathsArray[i]).then(function () {}).catch(function () {
                console.log("An error has occured please try again0.2");
                return
            });
        }

        this.makeGitFilterWords(this.currentProjectPath).then(function () {}).catch(function () {
            console.log("An error has occured please try again0.3");
            return
        });

        this.makeGitFilterPath(this.currentProjectPath).then(function () {}).catch(function () {
            console.log("An error has occured please try again0.4");
            return
        });

        console.log("deleting all done")
        
    }
    
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
async remove(keyworditem: KeywordItem):Promise<boolean>  {

    console.error("remove()")
    var index = this.children.findIndex(value => value === keyworditem);

    //if keyword exists
    if (0 <= index) {

        // var editor = vscode.window.activeTextEditor;
        // if (editor) {
            var currentfilePath = keyworditem.getKeywordPath()
            let lastSeen =currentfilePath.lastIndexOf("\\");
            var currentFileDirectoryPath=currentfilePath.substr(0, lastSeen+1);
            var currentfileName=currentfilePath.substr(lastSeen+1,currentfilePath.length)

            // ----------------------------- Check changes ---------------------------     OR  'git diff "C:\Users"'
            //-------------------------- cant  check with 'stdoutProjectDirectory'-----
            exec('cd '+currentFileDirectoryPath+ ` && git status `+currentfileName,async (error1:any, stdout1:any, stderr1:any) => {
                if(error1 !== null || stderr1!= "") {
                    return new Promise((resolve, reject) => {
                        return reject(false)
                    });
                }else{
                    if(stdout1.includes(currentfileName)){
                        console.log("Executing git command-->"+currentFileDirectoryPath+currentfileName);
                        // ----------------------------- Remove string from list --------------------------------
                        // if(currentFileDirectoryPath+currentfileName == keyworditem.getKeywordPath()){
                            console.log("deleting");
                            this.children[index].getPathArray().splice(0, 1);   //delete path
                            this.children.splice(index, 1);
                            
                            this.refresh();

                            //make/update gitattribute file
                            let uniqueRelativePathsArray = this.makeGitAttributeFilters();

                            await this.MakeGitAttribute(uniqueRelativePathsArray).then(function () {}).catch(function () {
                                console.log("An error has occured please try again rem 0.1");
                                return new Promise((resolve, reject) => {
                                    return reject(false)}
                                );
                            });
    
                            for(var i=0;i<uniqueRelativePathsArray.length;i++){
                                await this.makeGitFilterStr(uniqueRelativePathsArray[i]).then(function () {
    
                                }).catch(function () {
                                    console.log("An error has occured please try again rem 0.2");
                                    return new Promise((resolve, reject) => {
                                        return reject(false)}
                                    );
                                });
                            }
                            uniqueRelativePathsArray=Array();
    
                            await this.makeGitFilterWords(this.currentProjectPath).then(function () {}).catch(function () {
                                console.log("An error has occured please try again rem 0.3");
                                return new Promise((resolve, reject) => {
                                    return reject(false)}
                                );
                            });
    
    
                            await this.makeGitFilterPath(this.currentProjectPath).then(function () {}).catch(function () {
                                console.log("An error has occured please try again rem0.4");
                                return new Promise((resolve, reject) => {
                                    return reject(false)}
                                );
                            });
    
                            return new Promise((resolve, reject) => {
                                return resolve(true)
                            });
                        // }
                    
                    }else{
                        vscode.window.showInformationMessage("First you need to make at least one change to apply the changes on Git");
                        return new Promise((resolve, reject) => {
                            return reject(false)
                        });
                    }
                }
            });
        // }
    }
    return new Promise((resolve, reject) => {
        return resolve(true)
    });
   
}



async add(keyword: string | KeywordItem,path:string):Promise<boolean>  {

    console.error("add()")

    // if (keyword instanceof KeywordItem) { //////////////////////////////////////==================================/////////////////////////////////////////////////////////////////
            // ----------------------------- Check if user has Git in this PC --------------------------------
    var filePath = "";  //entire file path with file name inside
    var filePath1 = "";  //only file path
    var fileName = "";  //name of the file

    if (keyword instanceof KeywordItem) 
    {
        filePath = path;
        let lastSeen =filePath.lastIndexOf("\\");
        filePath1=filePath.substr(0, lastSeen+1);
        fileName=filePath.substr(lastSeen+1,filePath.length)
        filePath1=filePath1.charAt(0).toUpperCase() + filePath1.slice(1)

    }else if(typeof keyword === 'string' && 0 < keyword.length){

        var editor = vscode.window.activeTextEditor;

        if (editor) {
            filePath = editor.document.fileName;
            let lastSeen =filePath.lastIndexOf("\\");
            filePath1=filePath.substr(0, lastSeen+1);
            fileName=filePath.substr(lastSeen+1,filePath.length)
            filePath1=filePath1.charAt(0).toUpperCase() + filePath1.slice(1)
            // filePath=filePath1.replace(/\\/g, "/")
            // console.log("filePath ->"+filePath)
            // console.log("filePath -> "+filePath)
            // console.log("filePath2 -> "+filePath2)
            // console.log("fileName -> "+fileName)
        }else{
            console.log("An error has occurred while trying to read current text editor open file");
            return new Promise((resolve, reject) => {
                return reject(false)}
            );
        }
    }
            
    // ----------------------------- Check changes ----------------------       git diff "C:\Users\...\."
    exec('cd '+filePath1 + ` && git status `+fileName,async (errorGitStatus:any, stdoutGitStatus:any, stderrGitStatus:any) => {
        if(errorGitStatus !== null || stderrGitStatus!= "") {
            console.log("An error has occured 1");
            return new Promise((resolve, reject) => {
                return reject(false)}
            );
        }else{
            if(stdoutGitStatus.includes(fileName))
            {
                // if (keyword instanceof KeywordItem) 
                // {
                //     if (this.children.findIndex(value => value.label === keyword.label) < 0) {

                //         console.log("-----------------------111111----------------------")
                //         // this.children.push(new KeywordItem(keyword));
                            
                //         this.children.push(new KeywordItem(this.context,keyword.label,path));
                //         this.refresh();

                //         //make/update gitattribute file
                //         let uniqueRelativePathsArray = this.MakeGitAttribute(this.currentProjectPath)

                //         for(var i=0;i<uniqueRelativePathsArray.length;i++){
                //             await this.makeGitFilterStr(uniqueRelativePathsArray[i]).then(function () {}).catch(function () {
                //                 vscode.window.showErrorMessage("An error has occurred please try again0.1");
                //                 return reject(false)
                //             });
                //         }

                //         await this.makeGitFilterWords(this.currentProjectPath).then(function () {}).catch(function () {
                //             vscode.window.showErrorMessage("An error has occured please try again1.1");
                //             return reject(false)
                //         });


                //         await this.makeGitFilterPath(this.currentProjectPath).then(function () {}).catch(function () {
                //             vscode.window.showErrorMessage("An error has occured please try again2.1");
                //             return reject(false)
                //         });

                //         return resolve(true)
                //     }
                // }else
                if(typeof keyword === 'string' && 0 < keyword.length)
                {
                    if (this.children.findIndex(value => value.label === keyword) < 0) {  //new keyword new file
                        console.log("-----------------------22222222----------------------")
                        if(path != ""){
                            this.children.push(new KeywordItem(this.context,keyword,path));
                        }else{
                            this.children.push(new KeywordItem(this.context,keyword,filePath1+fileName));
                        }
                        
                        this.refresh();

                        //make/update gitattribute file
                        let uniqueRelativePathsArray = this.makeGitAttributeFilters();

                        await this.MakeGitAttribute(uniqueRelativePathsArray).then(function () {}).catch(function () {
                            console.log("An error has occured please try again add 0.1");
                            return new Promise((resolve, reject) => {
                                return reject(false)}
                            );
                        });

                        for(var i=0;i<uniqueRelativePathsArray.length;i++){
                            await this.makeGitFilterStr(uniqueRelativePathsArray[i]).then(function () {

                            }).catch(function () {
                                console.log("An error has occured please try again add 0.2");
                                return new Promise((resolve, reject) => {
                                    return reject(false)}
                                );
                            });
                        }

                        uniqueRelativePathsArray = Array()

                        await this.makeGitFilterWords(this.currentProjectPath).then(function () {}).catch(function () {
                            console.log("An error has occured please try again add 0.3");
                            return new Promise((resolve, reject) => {
                                return reject(false)}
                            );
                        });


                        await this.makeGitFilterPath(this.currentProjectPath).then(function () {}).catch(function () {
                            console.log("An error has occured please try again add 0.4");
                            return new Promise((resolve, reject) => {
                                return reject(false)}
                            );
                        });

                        return new Promise((resolve, reject) => {
                            return resolve(true)
                        });
                        
                    }else{  //   already saved keyword different file
                        console.log("-----------------------33333333333----------------------")
                        if(this.children.length > 0){

                            if(path != ""){
                                this.children.push(new KeywordItem(this.context,keyword,path));
                            }else{
                                this.children.push(new KeywordItem(this.context,keyword,filePath1+fileName));
                            }
                            this.refresh();
                            //make/update gitattribute file

                            let uniqueRelativePathsArray = this.makeGitAttributeFilters();

                            await this.MakeGitAttribute(uniqueRelativePathsArray).then(function () {}).catch(function () {
                                console.log("An error has occured please try again 1.0");
                                return new Promise((resolve, reject) => {
                                    return reject(false)
                                });
                                
                            });

                            //make filter to config file with command
                            for(var i=0;i<uniqueRelativePathsArray.length;i++){
                                await this.makeGitFilterStr(uniqueRelativePathsArray[i]).then(function () {}).catch(function () {
                                    console.log("An error has occured please try again 1.1");
                                    return new Promise((resolve, reject) => {
                                        return reject(false)
                                    });
                                });
                            }

                            uniqueRelativePathsArray = Array();

                            await this.makeGitFilterWords(this.currentProjectPath).then(function () {}).catch(function () {
                                console.log("An error has occured please try again 1.2");
                                return new Promise((resolve, reject) => {
                                    return reject(false)
                                });
                            });


                            await this.makeGitFilterPath(this.currentProjectPath).then(function () { }).catch(function () {
                                console.log("An error has occured please try again 1.3");
                                return new Promise((resolve, reject) => {
                                    return reject(false)
                                });
                            });
                            return new Promise((resolve, reject) => {
                                return resolve(true)
                            });
                            
                        }
                    }
                }
            
            }else{
                vscode.window.showInformationMessage("First you need to make at least one change to apply the changes on Git");
                return new Promise((resolve, reject) => {
                    return reject(false)
                });
            }
        }
            
    }); // end of >>git status
                    
      
    const forceVisible = vscode.workspace.getConfiguration('GitHidder').get('forcevisible', true);
    if (forceVisible && !this.isVisible) {
        this.isVisible = true;
    }

    return new Promise((resolve, reject) => {
        return resolve(true)
    });

} // end of add()



changeColor(colortype: ColorInfo ) {
    this.colortype = colortype;
}


addToList(keyword: string ,path:string) {
    this.children.push(new KeywordItem(this.context,keyword,path));  
    const forceVisible = vscode.workspace.getConfiguration('GitHidder').get('forcevisible', true);
    if (forceVisible && !this.isVisible) {
        this.isVisible = true;
    }
}


// make "/directory/directory/file  text eol=lf filter=GitHidderWordsX" for the gitattribute file
makeGitAttributeFilters(){
    let relativePathsArray = new Array();
    this.children.forEach(keywordItem => {
        relativePathsArray.push(keywordItem.getKeywordPath().replace(this.currentProjectPath,'').replace(/\\/g, "/"));
    });
    let uniqueRelativePathsArray = [... new Set(relativePathsArray)]

    let index=0;
    for(let i=0;i<uniqueRelativePathsArray.length;i++){
        uniqueRelativePathsArray[i] = uniqueRelativePathsArray[i]+ " text eol=lf filter=GitHidderWords"+index+" \n";
        index++;
    }
    relativePathsArray = new Array();
    return uniqueRelativePathsArray;
}




//make/check gitattribute file and place the filters
MakeGitAttribute(uniqueRelativePathsArray:string[]):Promise<boolean> {
    console.error("MakeGitAttribute()")
    return new Promise((resolve, reject) => {
        try {
            //Check existence of .gitattributes file
            if (fs.existsSync(this.currentProjectPath +'/.gitattributes')) {
                //file .gitattribute exists 
                
                this.deleteOldFilters(uniqueRelativePathsArray).then(function () { 
                    return resolve(true)
                }).catch(function () {
                    console.log("An error has occured while trying write on .gitattribute file");
                    return reject(false)
                });
               
            }else{
                //make new file and write
                fs.writeFileSync(this.currentProjectPath +'/.gitattributes', uniqueRelativePathsArray[0]);
                return resolve(true)
            }
        } catch (err) {
            console.log("An error has occured while trying write on .gitattribute file");
            return reject(false)
        }
    });
}



//renew gitattributes file with new filters
deleteOldFilters(uniqueRelativePathsArray: any){
    console.error("deleteOldFilters()")
    return new Promise((resolve, reject) => {
        fs.readFile(this.currentProjectPath +'/.gitattributes', {encoding: 'utf-8'}, (err:any, data:any) => {
            if (err) {
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
                        return reject(false)
                    }else{
                        //place the new filter
                        for(let i =0;i<uniqueRelativePathsArray.length;i++){
                            fs.appendFileSync(this.currentProjectPath +'/.gitattributes', "\n"+uniqueRelativePathsArray[i]);
                        }
                        updatedData=Array();
                        updatedDataStr =""
                        return resolve(true)
                    }
                });
            }
        });
    })// end of promise
}




delete() {
    if (this.decorator !== undefined) {
        this.decorator.dispose();
    }
}



//execute filters with Git
async makeGitFilterStr(uniqueRelativePathsArrayItem: string):Promise<boolean> {
    console.error("makeGitFilterStr()")
      
    let filterName = uniqueRelativePathsArrayItem.substring(
        uniqueRelativePathsArrayItem.indexOf("filter=") + 7, 
        uniqueRelativePathsArrayItem.length-1
    );

    filterName = filterName.replace('\n', "");
    filterName = filterName.replace(' ', "");

    let path = uniqueRelativePathsArrayItem.substring( 0, uniqueRelativePathsArrayItem.lastIndexOf(" text eol=lf"));
    path= path.replace('\n', "");

    let str = ""
    this.children.forEach(keyword=>{
        //encryption of keyword
        let starsMult = Math.floor((Math.random() * 15) + 5)
        let stars = ""
        for(var i=0;i<starsMult;i++){
            stars= stars + "*"
        }

        //check for "/" inside keyword
        let keywordStr = keyword.label;
        if(keywordStr.includes("/")){
            keywordStr=keywordStr.replace(/\//g, "\\/")
        }
          //check for "\" inside keyword
        if(keywordStr.includes("\\")){
            keywordStr=keywordStr.replace(/\\/g, '\\\\')
        }
        //make replacement string
        if(keyword.getKeywordPath() == this.currentProjectPath+path.replace(/\//g, "\\")){
            str = str +" -e 's/"+keywordStr+"/"+stars+"/g'"
        }
    });

    return new Promise((resolve, reject) => {
        exec('cd '+this.currentProjectPath + ` && git config filter.`+filterName+`.clean "sed`+str+`" && git config filter.`+filterName+`.path "`+path+`"`, (error:any, stdout:any, stderr:any) => {
            console.log("error->"+error);
            console.log("stderr->"+stderr);
            console.log("stdout->"+stdout);
            if(error !== null && stderr != ""){
                console.log("error->"+error);
                console.log("stderr->"+stderr);
                console.log("stdout->"+stdout);
                return reject(false)
            }else{
                resolve(true)
            }
        })
     })
   
}


//save keywords to Git config file
async makeGitFilterWords(stdoutGetProjPath:string):Promise<boolean> {
    console.error("makeGitFilterWords()");
    let new_words_set = ""
    this.children.forEach(keyword =>{
        new_words_set = new_words_set +" "+keyword.label+"|<--GitHidder|";
    });

    return new Promise((resolve, reject) => {
        exec('cd '+stdoutGetProjPath + ` && git config filter.GitHidderKeywords.clean "`+new_words_set+`" `, (error:any, stdout:any, stderr:any) => {
            console.log("error->"+error);
            console.log("stderr->"+stderr);
            console.log("stdout->"+stdout);
            if(error !== null && stderr != ""){
                console.log("error->"+error);
                console.log("stderr->"+stderr);
                console.log("stdout->"+stdout);
                return reject(false)
            }
            resolve(true)
        })
     })
   
 }



//save paths to Git config file
async makeGitFilterPath(stdoutGetProjPath:string):Promise<boolean> {
    console.error("makeGitFilterPath()");
    let new_path = ""
    this.children.forEach(keyword =>{
        new_path = new_path +" "+keyword.getKeywordPath()+"||";
    });

    return new Promise((resolve, reject) => {
        exec('cd '+stdoutGetProjPath + ` && git config filter.GitHidderPaths.clean "`+new_path+`"`, (error:any, stdout:any, stderr:any) => {
            console.log("error->"+error);
            console.log("stderr->"+stderr);
            console.log("stdout->"+stdout);
            if(error !== null && stderr != ""){
                console.log("error->"+error);
                console.log("stderr->"+stderr);
                console.log("stdout->"+stdout);
                return reject(false)
            }
            return resolve(true)
        })
    })

 }



//Find saved paths and keywords from config file when extension is starting
FindPath_and_Keywords():Promise<boolean> {
    console.error("FindPath_and_Keywords()");
    let pathArray= Array();
    let keywordsArray= Array();

    exec('cd '+this.currentProjectPath + ` && git config filter.GitHidderPaths.clean`,(errorFindPath_and_Keywords1:any, stdoutFindPath_and_Keywords1:any, stderrFindPath_and_Keywords1:any) => {
        if(errorFindPath_and_Keywords1 !== null && stderrFindPath_and_Keywords1 != ""){
                console.log("errorFindPath_and_Keywords1 error->"+errorFindPath_and_Keywords1);
                console.log("stderrFindPath_and_Keywords1->"+stderrFindPath_and_Keywords1);
                console.log("stdoutFindPath_and_Keywords1->"+stdoutFindPath_and_Keywords1);
                console.log("En error occured while trying find saved keywords");
                return new Promise((resolve, reject) => {
                    return reject(false)
                });
        }else{
            //split and save paths from config file
            let arrayWithPaths = stdoutFindPath_and_Keywords1.split(/ (.*?)\|\|/)
            for (let i=0;i<arrayWithPaths.length;i++){
                if(i%2 == 1){
                    pathArray.push(arrayWithPaths[i])
                }
            }
            exec('cd '+this.currentProjectPath + ` && git config filter.GitHidderKeywords.clean`,(errorFindPath_and_Keywords2:any, stdoutFindPath_and_Keywords2:any, stderrFindPath_and_Keywords2:any) => {
                if(errorFindPath_and_Keywords2 !== null && stderrFindPath_and_Keywords2 != ""){
                        console.log("errorFindPath_and_Keywords2 error->"+errorFindPath_and_Keywords2);
                        console.log("stderrFindPath_and_Keywords2->"+stderrFindPath_and_Keywords2);
                        console.log("stderrFindPath_and_Keywords2->"+stderrFindPath_and_Keywords2);
                        console.log("En error occured while trying find saved files");
                        return new Promise((resolve, reject) => {
                            return reject(false)
                        });
                }else{
                     //split and save keywords from config file
                    let arrayWithKeywords = stdoutFindPath_and_Keywords2.split(/ (.*?)\|<--GitHidder\|/)
                    for (let i=0;i<arrayWithKeywords.length;i++){
                        if(i%2 == 1){
                            keywordsArray.push(arrayWithKeywords[i])
                        }
                    }
                    for(let i=0;i<pathArray.length;i++){
                        this.addToList(keywordsArray[i],pathArray[i])
                    }
                    arrayWithKeywords = Array()
                    arrayWithPaths = Array()
                    this.refresh();
                    return new Promise((resolve, reject) => {
                        return resolve(true)
                    });
                   
                }
            });
        }
    });
    return new Promise((resolve, reject) => {
        return resolve(true)
    });
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

    //"Default" next to color if this is "Red"
    this.description = "";
    if(this.colortype.name == "Red"){
        this.description = "(Default)";
    }
    this.iconPath = this.isVisible ? this.colortype.icon : this.colortype.hideicon;
}




    checkExistKeyword(keyword: string | KeywordItem,path:string): boolean {
        console.log("checkExistKeyword()")
        if (keyword instanceof KeywordItem) {
            let index =this.children.findIndex(value => value === keyword);
            if (index< 0) {
                //doesn't exists
                return false;
            }else{
                //exists
                if(this.children[index].getKeywordPath() == path){
                    return true;
                }
                return false;
            }
        }
        else {
            let index =this.children.findIndex(value => value.label === keyword);
            if (index< 0) {
                 //doesn't exists
                return false;
            }else{
                //exists
                if(this.children[index].getKeywordPath() == path){
                    return true;
                }
                return false;
            }
        }
    }

    readonly contextValue = "highlighter";
}
