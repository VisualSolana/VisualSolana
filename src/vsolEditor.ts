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

		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
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
				updateWebview();
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
			}
		});

		updateWebview();
	}

	/**
	 * Get the static html used for the editor webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'vsol.js'));
		const vsolCSSUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'vsol.css'));
		const blocklyUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'blockly_unpkg.js'));

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

				<link href="${vsolCSSUri}" rel="stylesheet" />

				<title>VisualSolana Editor</title>
			</head>
			<body>
				<div>
					<button>generate backend</button>
					<button>generate backend preview</button>
					<input type="checkbox">auto-preview</input>
					
					<button>generate frontend</button>
				</div>
				
				<xml id="toolbox" style="display: none">
					<block type="controls_if"></block>
					<block type="controls_repeat_ext"></block>
					<block type="logic_compare"></block>
					<block type="math_number"></block>
					<block type="math_arithmetic"></block>
					<block type="text"></block>
					<block type="text_print"></block>
				</xml>

				<table width="100%" height="600px">
					<tr>
					<td height="600px" id="blocklyDiv">
					</td>
					</tr>
					<tr>
					<td height="600px" id="blocklyPreview">
					</td>
					</tr>
				</table>
				
				<button>below</button>

				<script nonce="${nonce}" src="${blocklyUri}"></script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
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
		if(document.getText() == blocklyText) {
			console.log("Blockly Text same as document, not creating an edit")
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
}
