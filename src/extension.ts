'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitHidderTreeDataProvider } from './GitHidderTree';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const GitHidderTreeDataProviderInstance = new GitHidderTreeDataProvider(context);
    let disposable = vscode.window.registerTreeDataProvider('keywordlist', GitHidderTreeDataProviderInstance);
    context.subscriptions.push(disposable);


    disposable = vscode.commands.registerCommand('GitHidder.OpenFile', offset => GitHidderTreeDataProviderInstance.OpenFile(offset));
    context.subscriptions.push(disposable);
    // 
    disposable = vscode.commands.registerCommand('GitHidder.AddColor', () => GitHidderTreeDataProviderInstance.add());
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.DeleteColor', offset => GitHidderTreeDataProviderInstance.delete(offset));
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.AddKeyword', offset => GitHidderTreeDataProviderInstance.add(offset)); // add keyword with + in list list
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.DeleteKeyword', offset => GitHidderTreeDataProviderInstance.delete(offset));
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.ChangeColor', offset => GitHidderTreeDataProviderInstance.change(offset));
    context.subscriptions.push(disposable);
    
    // 
    disposable = vscode.window.onDidChangeVisibleTextEditors(editors => GitHidderTreeDataProviderInstance.refresh(editors));
    context.subscriptions.push(disposable);
    disposable = vscode.window.onDidChangeTextEditorSelection(() => GitHidderTreeDataProviderInstance.refresh());
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.AddSelection', () => GitHidderTreeDataProviderInstance.setSelect()); // add keyword with right click
    context.subscriptions.push(disposable);
    disposable = vscode.workspace.onDidChangeConfiguration(() => GitHidderTreeDataProviderInstance.refresh());
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('GitHidder.EditKeyword', keyword => GitHidderTreeDataProviderInstance.edit(keyword));

    //
    disposable = vscode.commands.registerCommand('GitHidder.ToggleColorRed', offset => GitHidderTreeDataProviderInstance.toggle('Red'));
    disposable = vscode.commands.registerCommand('GitHidder.ToggleColorGreen', offset => GitHidderTreeDataProviderInstance.toggle('Green'));
    disposable = vscode.commands.registerCommand('GitHidder.ToggleColorBlue', offset => GitHidderTreeDataProviderInstance.toggle('Blue'));
    disposable = vscode.commands.registerCommand('GitHidder.ToggleColorYellow', offset => GitHidderTreeDataProviderInstance.toggle('Yellow'));
    disposable = vscode.commands.registerCommand('GitHidder.ToggleColorPink', offset => GitHidderTreeDataProviderInstance.toggle('Pink'));
    disposable = vscode.commands.registerCommand('GitHidder.ToggleColorCyan', offset => GitHidderTreeDataProviderInstance.toggle('Cyan'));

    // 
    GitHidderTreeDataProviderInstance.refresh();
}

// this method is called when your extension is deactivated
export function deactivate() {
    // vscode.window.showInformationMessage("extensinon deactivate.");
}