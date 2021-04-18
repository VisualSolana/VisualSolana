import { create } from 'domain';
import * as vscode from 'vscode';
import { getNonce } from './util';

/**
 * Provider for cat scratch editors.
 * 
 * Cat scratch editors are used for `.cscratch` files, which are just json files.
 * To get started, run this extension and open an empty `.cscratch` file in VS Code.
 * 
 * This provider demonstrates:
 * 
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Synchronizing changes between a text document and a custom editor.
 */
export class VSolEditorProvider implements vscode.CustomTextEditorProvider {

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new VSolEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(VSolEditorProvider.viewType, provider);
		return providerRegistration;
	}

	private static readonly viewType = 'visualsolana.vsol';

	constructor(
		private readonly context: vscode.ExtensionContext
	) { }

	/**
	 * Called when our custom editor is opened.
	 * 
	 * 
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		function updateWebview(event: any) {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
				event: event,
			});
		}

		// Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		// 
		// Remember that a single text document can also be shared between multiple custom
		// editors (this happens for example when you split a custom editor)

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview(e);
			}
		});

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		// Receive message from the webview.
		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'blocklyEvent':
					this.blocklyEvent(document, e);
					return;
				case 'generateRust':
					this.generateRustEvent(document, e);
					return;
			}
		});

		updateWebview(undefined);
	}

	/**
	 * Get the static html used for the editor webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
		const blocklyUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'blockly_unpkg.js'));
		const visualsolanaUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'visualsolana.js'));
		const bridgeUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'bridge.js'));
		const bridgeCSSUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'bridge.css'));

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<!--
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' 'sha256-Cmk7fxp5xPsTbRraDpOQVl9XQRFv8bSd6n1misZfKYw=' 'sha256-ZdHxw9eWtnxUb3mk6tBS+gIiVUPE3pGM470keHPDFlE=';">
				-->

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${bridgeCSSUri}" rel="stylesheet" />

				<title>VisualSolana Editor</title>
			</head>
			<body>
				<div>
					<button onClick="generate_types_and_instructions()">generate types and instructions</button>
				</div>

				<table width="100%" height="600px">
					<tr>
					<td height="600px" id="blocklyDiv">
					</td>
					</tr>
					<tr>
						<td>
						<button onClick="generate_rust_preview()">generate rust preview</button>
						<input type="checkbox">auto-preview</input>
						</td>
					</tr>
					<tr>
					<td height="600px">
					<pre id="blocklyPreview" style="font-family: mono; display: block;"></pre>
					</td>
					</tr>
				</table>

				<div>
					<button onClick="generate_rust_backend()">generate backend</button>
					<button onClick="generate_js_frontend()">generate frontend</button>
				</div>

				<script nonce="${nonce}" src="${blocklyUri}"></script>
				<script nonce="${nonce}" src="${visualsolanaUri}"></script>
				<script nonce="${nonce}" src="${bridgeUri}"></script>
			</body>
			</html>`;
	}

	/**
	 * Add a new scratch to the current document.
	 */
	private blocklyEvent(document: vscode.TextDocument, event: any) {
		return this.updateTextDocument(document, event.text);
	}

	/**
	 * Write out the json to a given document.
	 */
	private updateTextDocument(document: vscode.TextDocument, blocklyText: any) {
		if (document.getText() == blocklyText) {
			console.log("Blockly Text same as document, not creating an edit");
			return;
		}

		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			blocklyText);

		return vscode.workspace.applyEdit(edit);
	}

	private relative_file_uri(document: vscode.TextDocument, file_parts: Array<string>){
		const directory_parts = document.uri.path.split(/\//).slice(0, -1);
		return vscode.Uri.parse(directory_parts.concat(file_parts).join("/"));
	}

	private generate_relative_file(document: vscode.TextDocument, file_parts: Array<string>, contents: string) {
		const uri = this.relative_file_uri(document, file_parts);
		const edit = new vscode.WorkspaceEdit();
		edit.createFile(uri, {overwrite: true, ignoreIfExists: true});
		const edit_lines = (contents.match(/\n/g) || []).length;
		edit.replace(uri, new vscode.Range(0,0,edit_lines,0), contents);
		return vscode.workspace.applyEdit(edit).then(() => {
			vscode.workspace.openTextDocument(uri).then(file => {
				file.save();
			});
		});
	}

	private generateRustEvent(document: vscode.TextDocument, event: any) {
		const module_name = "visualsolana-autogen";
		// generate: lib.rs
		this.generate_relative_file(document, [module_name, "src", "lib.rs"], event.code);

		// generate: Cargo.toml
		const cargo_toml_text = `[package]
name = "${module_name}"
version = "0.0.1"
description = "${module_name}"
authors = ["Solana Maintainers <maintainers@solana.com>"]
repository = "https://github.com/solana-labs/solana"
license = "Apache-2.0"
homepage = "https://solana.com/"
edition = "2018"

[features]
no-entrypoint = []

[dependencies]
solana-program = "=1.6.1"

[dev-dependencies]
solana-program-test = "=1.6.1"
solana-sdk = "=1.6.1"

[lib]
crate-type = ["cdylib", "lib"]`;
		this.generate_relative_file(document, [module_name, "Cargo.toml"], cargo_toml_text);

		// generate: Xargo.toml
		const xargo_toml_text = `[target.bpfel-unknown-unknown.dependencies.std]
features = []`;
		this.generate_relative_file(document, [module_name, "Xargo.toml"], xargo_toml_text);

		// generate: .gitignore
		const gitignore_text = `target/`;
		this.generate_relative_file(document, [module_name, ".gitignore"], gitignore_text);
	}
}
