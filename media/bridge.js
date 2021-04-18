function custom_toolbox() {
	return `<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
<category name="Basic Types">
<block type="text">
    <field name="TEXT"></field>
</block>
<block type="math_number">
    <field name="NUM">0</field>
</block>
</category>

<category name="Program">
<block type="solana_program">
    <field name="NAME">solana program</field>
</block>
</category>

<category name="Type Definition">
<block type="type_definition"></block>
<block type="type_field"></block>
</category>

<category name="Interface Definition">
<block type="instruction_definition"></block>
<block type="account_layout"></block>
</category>

<category name="Interface Impl">
</category>

<category name="code">
<block type="log">
    <field name="asdf">log</field>
</block>
</category>

</xml>`
}

function generate_types_and_instructions() {
	/*
	// convert types and instructions from existing workspace into native Blockly function blocks
	let interfaces_text = Blockly.VisualSolana.workspacetoCode(workspace);
	let interfaces = JSON.parse(interfaces_text);
	// create a new workspace with these 
	workspace.defineBlocksWithJsonArray(interfaces);
	// start with basic toolbox and "dynamically" add in the interfaces so they appear as functions
	let toolbox = custom_toolbox();
	for(let iface in interfaces) {
		toolbox.category("interface_impl").append(interface_to_block(iface))
	}
	// define the interfaces as blockly native functions
	for(let iface in interfaces) {
		// check if function already exists in dom
		// if it does, we need to be careful about copying the blocks and deleting the old version
		
		// define the function
		// TODO make this declare variables
		workspace.dom.insert("<block type=procedures_blocknoreturn></block>")

		// call the function
		workspace.dom.find("interface_impl").inset("<block type=interface_impl name=iface.name> <block type=procedures_callnoreturn><block> </block>")
	}
	*/
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

// create workspace
var workspace = Blockly.inject('blocklyDiv', { toolbox: custom_toolbox() });
visualsolana.decorate_workspace(workspace);

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

			if(new Date().getTime() < block_updates_until) {
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