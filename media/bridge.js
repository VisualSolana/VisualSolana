// create workspace
var workspace = Blockly.inject('blocklyDiv', { toolbox: visualsolana.generate_toolbox() });
visualsolana.decorate_workspace(workspace);

function generate_types_and_instructions() {
	visualsolana.generate_types_and_instructions(workspace)
}

function generate_rust_backend() {
	let code = generate_rust_preview();
	vscode.postMessage({ type: 'generateRust', code: code })
}

function generate_rust_preview() {
	let code = visualsolana.RustGenerator.workspaceToCode(workspace);
	let previewElement = document.getElementById('blocklyPreview');
	previewElement.innerHTML = code;
	return code;
}

function generate_js_frontend() {
	console.log("would generate frontend");
}

// setup message passing
const vscode = acquireVsCodeApi();

// blockly -> vscode
// block_updates_until lets us rapidly update vscode's internal "document"
// and broadcast changes but not force the updateContent while someone is editing a Text field
let block_updates_until = new Date().getTime();
workspace.addChangeListener(function (event) {
	if (event.type != Blockly.Events.BLOCK_MOVE && event.type != Blockly.Events.BLOCK_CHANGE) {
		return
	}

	block_updates_until = new Date().getTime();
	block_updates_until += 1000;

	let dom = Blockly.Xml.workspaceToDom(workspace);
	let xml = Blockly.Xml.domToText(dom);
	vscode.postMessage({ type: 'blocklyEvent', data: event.data, text: xml })
});

// vscode -> blockly
function reinstantiateWorkspaceDom(text) {
	// TODO !!! there might be a better way of using mutations and a common getter/setter block pattern
	// !!! I really just wanted type checking as it may be needed in Rust generator for conversions
	// regenerate block definitions so toolbox has custom blocks
	// only keep solana_program block for type information
	let temp_dom = Blockly.Xml.textToDom(text);
	for (let child of temp_dom.children) {
		if (child.tagName !== "solana_program") {
			child.remove();
		}
	}
	let temp_workspace = visualsolana.workspace_factory();
	Blockly.Xml.domToWorkspace(temp_dom, temp_workspace);
	workspace.clear();
	visualsolana.generate_types_and_instructions(temp_workspace, workspace);

	workspace.clear();
	let dom = Blockly.Xml.textToDom(text);
	Blockly.Xml.domToWorkspace(dom, workspace);
}

window.addEventListener('message', event => {
	console.log("bridge: message received from vscode")
	const message = event.data; // The json data that the extension sent
	switch (message.type) {
		case 'update':
			const text = message.text;

			if (!text) {
				console.log("bridge: empty text received from outside of webview. not updating Blockly editor as it likely means file (document) is empty.")
				return
			}

			if (new Date().getTime() < block_updates_until) {
				console.log("bridge: blocking event due to event debounce");
				return;
			}

			reinstantiateWorkspaceDom(text);

			// Then persist state information.
			// This state is returned in the call to `vscode.getState` below when a webview is reloaded.
			vscode.setState({ text });
			return;
	}
});

// Webviews are normally torn down when not visible and re-created when they become visible again.
// State lets us save information across these re-loads
const state = vscode.getState();
if (state) {
	reinstantiateWorkspaceDom(state.text);
}