// var blocklyArea = document.getElementById('blocklyArea');
// var blocklyDiv = document.getElementById('blocklyDiv');
// var workspace = Blockly.inject(blocklyDiv,
// 	{toolbox: document.getElementById('toolbox')});
// var onresize = function(e) {
//   // Compute the absolute coordinates and dimensions of blocklyArea.
//   var element = blocklyArea;
//   var x = 0;
//   var y = 0;
//   do {
// 	x += element.offsetLeft;
// 	y += element.offsetTop;
// 	element = element.offsetParent;
//   } while (element);
//   // Position blocklyDiv over blocklyArea.
//   blocklyDiv.style.left = x + 'px';
//   blocklyDiv.style.top = y + 'px';
//   blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
//   blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
//   Blockly.svgResize(workspace);
// };
// window.addEventListener('resize', onresize, false);
// onresize();
// Blockly.svgResize(workspace);

Blockly.defineBlocksWithJsonArray([{
	"type": "solana_program",
	"message0": "%1 %2",
	"args0": [
		{
		  "type": "field_label_serializable",
		  "name": "label",
		  "text": "solana program"
		},
		{
			"type": "input_statement",
			"name": "statement"
		}
	],
	"colour": 0,
	"tooltip": "the outermost solana program",
	"helpUrl": ""
},
{
	"type": "log",
	"message0": "%1 %2",
	"args0": [
		{
		  "type": "field_label_serializable",
		  "name": "label",
		  "text": "msg"
		},
		{
			"type": "input_value",
			"name": "log",
			"check": "String",
		}
	],
	"previousStatement": null,
	"nextStatement": null,
	"colour": 60,
	"tooltip": "log",
	"helpUrl": ""
}])

Blockly.SolanaRust = new Blockly.Generator('SolanaRust');
/**
 * Common tasks for generating JavaScript from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The JavaScript code created for this block.
 * @param {boolean=} opt_thisOnly True to generate code for only this statement.
 * @return {string} JavaScript code with comments and subsequent blocks added.
 * @protected
 */
 Blockly.SolanaRust.scrub_ = function(block, code, opt_thisOnly) {
	var commentCode = '';
	var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
	var nextCode = opt_thisOnly ? '' : Blockly.SolanaRust.blockToCode(nextBlock);
	return commentCode + code + nextCode;
  };
Blockly.SolanaRust['solana_program'] = function (block) {
	var statements_statement = Blockly.SolanaRust.statementToCode(block, 'statement');
	// TODO: Assemble JavaScript into code variable.
	console.log(statements_statement);
	var code = `// !!! GENERATED CODE: DO NOT MODIFY !!!	
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
	program_id: &Pubkey, // Public key of the account the hello world program was loaded into
	accounts: &[AccountInfo], // The account to say hello to
	_instruction_data: &[u8], // Ignored, all helloworld instructions are hellos
) -> ProgramResult {
${statements_statement}
}`;
	return code;
};

Blockly.SolanaRust['log'] = function (block) {
	var value_log = Blockly.SolanaRust.valueToCode(block, 'log', Blockly.JavaScript.ORDER_ATOMIC);
	console.log(block)
	// TODO: Assemble JavaScript into code variable.
	var code = `msg!(${value_log})\n`;
	// if(block.nextStatement) {
		// var more_code = Blockly.SolanaRust.statementToCode(block.next, 'nextStatement', Blockly.JavaScript.ORDER_ATOMIC);
		// console.log(more_code);
	// }
	return code;
};

Blockly.SolanaRust['text'] = function (block) {
	var value_text = block.getFieldValue("TEXT");
	// TODO: Assemble JavaScript into code variable.
	var code = `"${value_text}"`;
	return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

function custom_toolbox() {
	return `<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
	<block type="solana_program"></block>
	<block type="log"></block>
	<block type="text">
	  <field name="TEXT"></field>
	</block>
  </xml>`
}

function generate_backend() {
	console.log("would generate backend");
	let code = Blockly.SolanaRust.workspaceToCode(workspace);
	console.log(code);
}

const vscode = acquireVsCodeApi();

var workspace = Blockly.inject('blocklyDiv', { toolbox: custom_toolbox() });
// workspace.updateToolbox({toolbox: custom_toolbox()})
workspace.addChangeListener(function (event) {
	if (event.type != Blockly.Events.BLOCK_MOVE) {
		return
	}
	dom = Blockly.Xml.workspaceToDom(workspace);
	xml = Blockly.Xml.domToText(dom);
	vscode.postMessage({ type: 'blocklyEvent', data: event.data, text: xml })
});

function updateContent(xml) {
	dom = Blockly.Xml.textToDom(xml);
	workspace.clear();
	Blockly.Xml.domToWorkspace(dom, workspace);
}

// Handle messages sent from the extension to the webview
window.addEventListener('message', event => {
	console.log("window event handler")
	console.log(event)
	const message = event.data; // The json data that the extension sent
	switch (message.type) {
		case 'update':
			const text = message.text;

			if (!text) {
				console.log("empty text received from outside of webview. not updating Blockly editor as it likely means file (document) is empty.")
				return
			}

			// Update our webview's content
			updateContent(text);

			// Then persist state information.
			// This state is returned in the call to `vscode.getState` below when a webview is reloaded.
			vscode.setState({ text });

			return;
	}
});

// Webviews are normally torn down when not visible and re-created when they become visible again.
// State lets us save information across these re-loads
// const state = vscode.getState();
// if (state) {
// 	updateContent(state.text);
// }