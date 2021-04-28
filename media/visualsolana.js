if (typeof exports !== 'undefined') {
	// reimport blockly (during test suite)
	Blockly = require('blockly');
}
if (typeof exports === 'undefined') {
	// fake module environment (in browser)
	console.log("defining exports")
	exports = {};
	visualsolana = exports;
}

exports.generate_toolbox = function(type_getters_setters, interface_impl_functions) {
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

<category name="Type Getter/Setter">
${type_getters_setters}
</category>

<category name="Interface Definition">
<block type="instruction_definition"></block>
<block type="account_layout"></block>
</category>

<category name="Interface Impl">
${interface_impl_functions}
</category>

<category name="code">
<block type="log">
    <field name="label">log</field>
</block>
</category>

</xml>`
}

exports.blocks = [
	// type generator
	{
		"type": "type_field",
		"message0": "field name %1 type %2",
		"args0": [
			{
				"type": "input_value",
				"name": "field_name",
				"check": "String"
			},
			{
				"type": "input_value",
				"name": "field_type",
				"check": [
					"Number",
					"String",
					"ComplexType"
				]
			}
		],
		"previousStatement": null,
		"nextStatement": null,
		"colour": 30,
		"tooltip": "",
		"helpUrl": ""
	},
	{
		"type": "type_definition",
		"message0": "type definition %1 name %2 type fields %3",
		"args0": [
			{
				"type": "input_dummy"
			},
			{
				"type": "input_value",
				"name": "type_name",
				"check": "String"
			},
			{
				"type": "input_statement",
				"name": "fields",
				"check": "type_field"
			}
		],
		"previousStatement": null,
		"nextStatement": null,
		"colour": 210,
		"tooltip": "",
		"helpUrl": ""
	},
	// function generator (instruction)
	{
		"type": "account_layout",
		"message0": "account name %1 account layout (type) %2",
		"args0": [
			{
				"type": "input_value",
				"name": "account_name",
				"check": "String"
			},
			{
				"type": "input_value",
				"name": "layout",
				"check": "String"
			}
		],
		"previousStatement": null,
		"nextStatement": null,
		"colour": 165,
		"tooltip": "",
		"helpUrl": ""
	},
	{
		"type": "instruction_definition",
		"message0": "instruction name %1 accounts %2 input data type %3",
		"args0": [
			{
				"type": "input_value",
				"name": "instruction_name"
			},
			{
				"type": "input_statement",
				"name": "accounts",
				"check": "account_layout"
			},
			{
				"type": "input_value",
				"name": "input data type",
				"check": "String"
			}
		],
		"previousStatement": null,
		"nextStatement": null,
		"colour": 230,
		"tooltip": "",
		"helpUrl": ""
	},
	// outer program
	{
		"type": "solana_program",
		"message0": "%1 %2 type library %3 instruction library %4 instruction impl %5",
		"args0": [
			{
				"type": "field_input",
				"name": "NAME",
				"text": "solana program"
			},
			{
				"type": "input_dummy"
			},
			{
				"type": "input_statement",
				"name": "type library",
				"check": "type_definition"
			},
			{
				"type": "input_statement",
				"name": "instruction library",
				"check": "instruction_definition"
			},
			{
				"type": "input_statement",
				"name": "instruction impl"
			}
		],
		"colour": 0,
		"tooltip": "the outermost solana program",
		"helpUrl": ""
	},
	// solana-specific standard library
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
	},
];
// !!! Warning !!!
// this defintes global blocks once. I think I will need to implement some
// sort of Block management as there doesn't appear to be an API for
// removing blocks from this global dictionary. There isn't an API to
// find/recreate the "default" blocks (example: blocks/logic.js)
Blockly.defineBlocksWithJsonArray(exports.blocks);

exports.TypeGenerator = new Blockly.Generator('TypeGenerator');
exports.TypeGenerator.scrub_ = function (block, code) {
	var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
	var prefix = "";
	var suffix = "";
	if (block.type === "solana_program") {
		prefix = "[";
		suffix = "]";
	} else if (block.type === "type_definition") {
		if (nextBlock) {
			suffix = ",";
		}
	}
	var nextCode = exports.TypeGenerator.blockToCode(nextBlock);
	return prefix + code + suffix + nextCode;
}
exports.TypeGeneratorFunctionLibrary = function () {
	return {
		"solana_program": function (block) {
			return exports.TypeGenerator.statementToCode(block, "type library");
		},
		// type generation
		"type_field": function (block) {
			// console.log(exports.TypeGenerator.valueToCode(block, 'field_type', Blockly.JavaScript.ORDER_ATOMIC))
			// let field_name = exports.TypeGenerator.valueToCode(block, 'field_name', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '');
			// let ret = JSON.stringify({ field_name: field_name, field_type: null});
			// console.log(ret);
			// return ret;
			return "{}";
		},
		"type_definition": function (block) {
			let crawl_field_tree = function (b, index) {
				if (!b) {
					return [];
				}
				if (b.type !== "type_field") {
					return crawl_field_tree(b.nextConnection.targetBlock(), index);
				}
				let field_name = exports.TypeGenerator.valueToCode(b, 'field_name', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '');
				blockly_fields_dropdown_value = [field_name, index.toString()];
				return [blockly_fields_dropdown_value].concat(crawl_field_tree(b.nextConnection.targetBlock(), index + 1));
			}
			let fieldsBlock = null;
			for (let input of block.inputList) {
				if (input.name == "fields") {
					fieldsBlock = input;
				}
			}
			if (fieldsBlock == null) {
				return "";
			}
			let fields = []
			for (let child of fieldsBlock.sourceBlock_.childBlocks_) {
				if (child.type == "type_field") {
					fields = crawl_field_tree(child, 0);
				}
			}
			let type_name = exports.TypeGenerator.valueToCode(block, 'type_name', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '');
			return JSON.stringify([
				// type block
				// {
				// 	"type": block.getFieldValue("NAME"),
				// 	"message0": "%1",
				// 	"args0": JSON.parse("[]")
				// },
				// getter block
				{
					"type": `complex_type_getter_${type_name}`,
					"message0": "%1 %2",
					"args0": [
						{
							"type": "input_value",
							"name": "value",
							"check": type_name,
						},
						{
							"type": "field_dropdown",
							"name": "field",
							"options": fields,
						}
					],
					"inputsInline": true,
					"output": null,
					"colour": 230,
					"tooltip": "",
					"helpUrl": ""
				},
				// setter block
				{
					"type": `complex_type_setter_${type_name}`,
					"message0": `${type_name}: %1 set %2 %3 to %4 %5`,
					"args0": [
						{
							"type": "input_dummy"
						},
						{
							"type": "input_value",
							"name": "value",
							"check": type_name,
						},
						{
							"type": "field_dropdown",
							"name": "field_name",
							"options": fields,
						},
						{
							"type": "input_dummy"
						},
						{
							"type": "input_value",
							"name": "variable",
							"align": "CENTRE"
							// "check": fields[n].type
						}
					],
					"inputsInline": true,
					"previousStatement": null,
					"nextStatement": null,
					"colour": 230,
					"tooltip": "",
					"helpUrl": ""
				}
			]);
		},
		// basic types
		"text": function (block) {
			var value_text = block.getFieldValue("TEXT");
			var code = `"${value_text}"`;
			return [code, Blockly.JavaScript.ORDER_ATOMIC];
		},
		"math_number": function (block) {
			var value_text = block.getFieldValue("NUM");
			var code = `${value_text}`;
			return [code, Blockly.JavaScript.ORDER_ATOMIC];
		}
	}
}

exports.FunctionGenerator = new Blockly.Generator('FunctionGenerator');
exports.FunctionGenerator.scrub_ = function (block, code) {
	var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
	var prefix = "";
	var suffix = "";
	if (block.type === "solana_program") {
		prefix = "[";
		suffix = "]";
	} else if (block.type === "instruction_definition") {
		prefix = "\"";
		suffix = "\"";
		code = code.replace(/\"/g, "\\\"");
		// replace newlines and tabs with spaces
		code = code.replace(/(\n|\t)/g, " ");
		if (nextBlock) {
			suffix += ",";
		}
	}
	var nextCode = exports.FunctionGenerator.blockToCode(nextBlock);
	return prefix + code + suffix + nextCode;
}
exports.FunctionGeneratorFunctionLibrary = function () {
	return {
		"solana_program": function (block) {
			return exports.FunctionGenerator.statementToCode(block, "instruction library");
		},
		"instruction_definition": function (block) {
			let crawl_arg_tree = function (b, index) {
				if (!b) {
					return [];
				}
				if (b.type !== "account_layout") {
					return crawl_arg_tree(b.nextConnection.targetBlock(), index);
				}
				let account_name = exports.FunctionGenerator.valueToCode(b, 'account_name', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '');
				return [account_name].concat(crawl_arg_tree(b.nextConnection.targetBlock(), index + 1));
			}
			// assmeble argument names
			let argsBlock = null;
			for (let input of block.inputList) {
				if (input.name == "accounts") {
					argsBlock = input;
				}
			}
			if (argsBlock == null) {
				return "";
			}
			let account_names = []
			for (let child of argsBlock.sourceBlock_.childBlocks_) {
				if (child.type == "account_layout") {
					account_names = crawl_arg_tree(child, 0);
				}
			}
			// template arguments
			let arg_text = "\n";
			for (let account_name of account_names) {
				arg_text += `<arg instruction_name="${account_name}"></arg>\n`
			}

			let function_name = exports.FunctionGenerator.valueToCode(block, 'instruction_name', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '')
			return `<block type="procedures_defnoreturn">
				<mutation>${arg_text}</mutation>
				<field name="NAME">${function_name}</field>
				<comment></comment>
			</block>`
		},
		"account_layout": function (block) {
			return "";
		},
		// basic types
		"text": function (block) {
			var value_text = block.getFieldValue("TEXT");
			var code = `"${value_text}"`;
			return [code, Blockly.JavaScript.ORDER_ATOMIC];
		},
		"math_number": function (block) {
			var value_text = block.getFieldValue("NUM");
			var code = `${value_text}`;
			return [code, Blockly.JavaScript.ORDER_ATOMIC];
		}
	}
}

exports.RustGenerator = new Blockly.Generator('RustGenerator');
// turn off indents so types/functions don't end up indented unnecessarily
exports.RustGenerator.INDENT = "";
exports.RustGeneratorFunctionLibrary = function () {
	return {
		"type_definition": function (block) {
			let crawl_field_tree = function (b, index) {
				if (!b) {
					return [];
				}
				if (b.type !== "type_field") {
					return crawl_field_tree(b.nextConnection.targetBlock(), index);
				}
				let field_name = exports.RustGenerator.valueToCode(b, 'field_name', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '');
				let field_type = exports.RustGenerator.valueToCode(b, 'field_type', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '');
				// try and parse
				let field_type_count = parseInt(field_type);
				// if string -> [complex type; 1]
				if (field_type_count === NaN) {
					field_type_count = 1;
				} else {
					// if int -> [u8; <parsed_int>]
					field_type = "u8";
				}
				field_definition = `\tpub ${field_name}: [${field_type}; ${field_type_count}],\n`;
				return [field_definition].concat(crawl_field_tree(b.nextConnection.targetBlock(), index + 1));
			}
			let fieldsBlock = null;
			for (let input of block.inputList) {
				if (input.name == "fields") {
					fieldsBlock = input;
				}
			}
			if (fieldsBlock == null) {
				return "";
			}
			let fields = []
			for (let child of fieldsBlock.sourceBlock_.childBlocks_) {
				if (child.type == "type_field") {
					fields = crawl_field_tree(child, 0);
				}
			}

			let type_name = exports.RustGenerator.valueToCode(block, 'type_name', Blockly.JavaScript.ORDER_ATOMIC).replace(/\"/g, '');
			let fields_text = fields.join("");
			return `pub struct ${type_name} {
${fields_text}}`
		},
		"solana_program": function (block) {
			let type_block = exports.RustGenerator.statementToCode(block, 'type library');

			return `// !!! GENERATED CODE: DO NOT MODIFY !!!
use solana_program::{
	account_info::{AccountInfo},
	entrypoint,
	entrypoint::ProgramResult,
	program_error::ProgramError,
	pubkey::Pubkey,
};

// !!! type_block
${type_block}

entrypoint!(process_instruction);
pub fn process_instruction(
	program_id: &Pubkey,
	accounts: &[AccountInfo],
	instruction_data: &[u8],
) -> ProgramResult {
	Ok(())
}`;
		},
		// basic types
		"text": function (block) {
			var value_text = block.getFieldValue("TEXT");
			var code = `"${value_text}"`;
			return [code, Blockly.JavaScript.ORDER_ATOMIC];
		},
		"math_number": function (block) {
			var value_text = block.getFieldValue("NUM");
			var code = `${value_text}`;
			return [code, Blockly.JavaScript.ORDER_ATOMIC];
		}
	}
}

exports.empty_block = function (block) {
	return "";
}

exports.decorate_workspace = function (workspace) {
	workspace.TypeGenerator = exports.TypeGenerator;
	workspace.FunctionGenerator = exports.FunctionGenerator;
	workspace.RustGenerator = exports.RustGenerator;

	let type_functions = exports.TypeGeneratorFunctionLibrary();
	for (let f in type_functions) {
		workspace.TypeGenerator[f] = type_functions[f];
		workspace.FunctionGenerator[f] = workspace.FunctionGenerator[f] || exports.empty_block;
		workspace.RustGenerator[f] = workspace.RustGenerator[f] || exports.empty_block;
	}
	let function_functions = exports.FunctionGeneratorFunctionLibrary();
	for (let f in function_functions) {
		workspace.TypeGenerator[f] = workspace.TypeGenerator[f] || exports.empty_block;
		workspace.FunctionGenerator[f] = function_functions[f];
		workspace.RustGenerator[f] = workspace.RustGenerator[f] || exports.empty_block;
	}
	let rust_functions = exports.RustGeneratorFunctionLibrary();
	for (let f in rust_functions) {
		workspace.TypeGenerator[f] = workspace.TypeGenerator[f] || exports.empty_block;
		workspace.FunctionGenerator[f] = workspace.FunctionGenerator[f] || exports.empty_block;
		workspace.RustGenerator[f] = rust_functions[f];
	}
}

exports.workspace_factory = function () {
	let workspace = new Blockly.Workspace();
	exports.decorate_workspace(workspace);
	return workspace;
}

exports.generate_types = function(from_workspace, to_workspace) {
	if(!to_workspace) {
		to_workspace = from_workspace;
	}
	// convert types and instructions from existing workspace into native Blockly function blocks
	let types_text = to_workspace.TypeGenerator.workspaceToCode(from_workspace);
	let types = JSON.parse(types_text);
	let type_getters_setters = {};
	for (let sub_array of types) {
		// define block schema
		for (let block of sub_array) {
			delete Blockly.Blocks[block.type];
			if(block.type.includes("getter")) {
				type_getters_setters[block.type] = `<block type="${block.type}"><field name="field"></field></block>`;
			} else if (block.type.includes("setter")) {
				type_getters_setters[block.type] = `<block type="${block.type}"><field name="variable"></field></block>`;
			}
		}
		Blockly.defineBlocksWithJsonArray(sub_array);
	}
	// create a new workspace with these 
	// start with basic toolbox and "dynamically" add in the interfaces so they appear as functions
	let toolbox = exports.generate_toolbox(Object.values(type_getters_setters).join("\n"));
	if(to_workspace.updateToolbox) {
		to_workspace.updateToolbox(toolbox);
	}
}

exports.generate_instructions = function(from_workspace, to_workspace) {
	if(!to_workspace) {
		to_workspace = from_workspace;
	}
	let instructions_text = to_workspace.FunctionGenerator.workspaceToCode(from_workspace);
	let instructions = JSON.parse(instructions_text);
	/*
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

exports.generate_types_and_instructions = function (from_workspace, to_workspace) {
	exports.generate_types(from_workspace, to_workspace)
	exports.generate_instructions(from_workspace, to_workspace)
}