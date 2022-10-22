'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitHidderTreeDataProvider } from './GitHidderTree';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    const GitHidderTreeDataProviderInstance = new GitHidderTreeDataProvider(context);
    let disposable = vscode.window.registerTreeDataProvider('keywordlist', GitHidderTreeDataProviderInstance);
    context.subscriptions.push(disposable);


    disposable = vscode.commands.registerCommand('GitHidder.OpenFile', offset => GitHidderTreeDataProviderInstance.OpenFile(offset));
    context.subscriptions.push(disposable);
    

    disposable = vscode.commands.registerCommand('GitHidder.Reveal_All', offset => GitHidderTreeDataProviderInstance.reveal_All());
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('GitHidder.AddKeyword_Manually', offset => GitHidderTreeDataProviderInstance.add_Manually());
    context.subscriptions.push(disposable);
    
    disposable = vscode.commands.registerCommand('GitHidder.AddColor', () => GitHidderTreeDataProviderInstance.add());
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.DeletePath', offset => GitHidderTreeDataProviderInstance.delete(offset));
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.AddKeyword', offset => GitHidderTreeDataProviderInstance.add(offset)); // add keyword with + in list list
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.DeleteKeyword', offset => GitHidderTreeDataProviderInstance.delete(offset));
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.ChangeColor', offset => GitHidderTreeDataProviderInstance.change(offset));
    context.subscriptions.push(disposable);
    
    disposable = vscode.window.onDidChangeVisibleTextEditors(editors => GitHidderTreeDataProviderInstance.refresh(editors));
    context.subscriptions.push(disposable);
    disposable = vscode.window.onDidChangeTextEditorSelection(() => GitHidderTreeDataProviderInstance.refresh());
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.AddSelection', () => GitHidderTreeDataProviderInstance.setSelect()); // add keyword with right click
    context.subscriptions.push(disposable);
    disposable = vscode.workspace.onDidChangeConfiguration(() => GitHidderTreeDataProviderInstance.refresh());
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.EditKeyword', keyword => GitHidderTreeDataProviderInstance.edit(keyword));

    disposable = vscode.workspace.onDidRenameFiles(event => GitHidderTreeDataProviderInstance.Rename_File(event));
    context.subscriptions.push(disposable);

    disposable = vscode.workspace.onDidDeleteFiles(event => GitHidderTreeDataProviderInstance.Delete_File(event));
    context.subscriptions.push(disposable);

    GitHidderTreeDataProviderInstance.refresh();

}

// this method is called when your extension is deactivated
export function deactivate() {
    // vscode.window.showInformationMessage("extensinon deactivate.");
}