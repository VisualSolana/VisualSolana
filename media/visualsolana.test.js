let Blockly = require('blockly');
let visualsolana = require('./visualsolana.js');

function blockly_dom(xml_text) {
	return Blockly.Xml.textToDom(`<xml xmlns="https://developers.google.com/blockly/xml">${xml_text}</xml>`);
}

function xml_text_to_type_generator(xml_text) {
	let dom = blockly_dom(xml_text)
	let workspace = visualsolana.workspace_factory();
	Blockly.Xml.domToWorkspace(dom, workspace)
	return workspace.TypeGenerator.workspaceToCode(workspace);
}

function test_xml_text_to_type_generator(xml_text, expected_json) {
	expect(JSON.parse(xml_text_to_type_generator(xml_text))).toEqual(expected_json);
}

function xml_text_to_function_generator(xml_text) {
	let dom = blockly_dom(xml_text)
	let workspace = visualsolana.workspace_factory();
	Blockly.Xml.domToWorkspace(dom, workspace)
	return workspace.FunctionGenerator.workspaceToCode(workspace);
}

function test_xml_text_to_function_generator(xml_text, expected_text) {
	expect(xml_text_to_function_generator(xml_text)).toEqual(expected_text)
	// let expected_function_dom = Blockly.Xml.textToDom(expected_text);
	// let function_dom = Blockly.Xml.textToDom(workspace.FunctionGenerator.workspaceToCode(workspace));
	// expect(function_dom).toEqual(expected_function_dom)
}

function test_xml_text_to_rust_generator(xml_text, expected_text) {
	var dom = blockly_dom(xml_text);
	let workspace = visualsolana.workspace_factory();
	Blockly.Xml.domToWorkspace(dom, workspace)
	expect(workspace.RustGenerator.workspaceToCode(workspace)).toEqual(expected_text);
}

describe('TypeGenerator', () => {
	test('should succeed on empty document', () => {
		var dom = blockly_dom();

		let workspace = visualsolana.workspace_factory();
		Blockly.Xml.domToWorkspace(dom, workspace)
		expect(workspace.TypeGenerator.workspaceToCode(workspace)).toEqual("");
	})

	test('should generate JSON representation of text TypeField', () => {
		test_xml_text_to_type_generator(`
		<block type="type_field">
			<value name="field_name">
				<block type="text">
					<field name="TEXT">my_string_field</field>
				</block>
			</value>
			<value name="field_type">
				<block type="text">
					<field name="TEXT">12</field>
				</block>
			</value>
		</block>`, {});
	})

	test('should generate a JSON representation of a TypeDefinition', () => {
		test_xml_text_to_type_generator(`
			<block type="type_definition">	
				<value name="type_name">
					<block type="text">
						<field name="TEXT">my_type</field>
					</block>
				</value>
				<statement name="fields">
					<block type="type_field">
						<value name="field_name">
							<block type="text">
								<field name="TEXT">my_text_field</field>
							</block>
						</value>
						<value name="field_type">
							<block type="text">
								<field name="TEXT">12</field>
							</block>
						</value>
						<next>
							<block type="type_field">
								<value name="field_name">
									<block type="text">
										<field name="TEXT">my_int_field</field>
									</block>
								</value>
								<value name="field_type">
									<block type="math_number">
										<field name="NUM">12</field>
									</block>
								</value>
							</block>
						</next>
					</block>
				</statement>
			</block>`, [
			// getter
			{
				"args0": [
					{ "check": "my_type", "name": "value", "type": "input_value" },
					{ "name": "field", "options": [["my_text_field", "0"], ["my_int_field", "1"]], "type": "field_dropdown" }
				], "colour": 230, "helpUrl": "", "inputsInline": true, "message0": "%1 %2", "output": null, "tooltip": "", "type": "complex_type_getter_my_type"
			},
			// setter
			{
				"args0": [
					{ "type": "input_dummy" },
					{ "check": "my_type", "name": "value", "type": "input_value" },
					{ "name": "field_name", "options": [["my_text_field", "0"], ["my_int_field", "1"]], "type": "field_dropdown" },
					{ "type": "input_dummy" },
					{ "align": "CENTRE", "name": "variable", "type": "input_value" }
				],
				"colour": 230, "helpUrl": "", "inputsInline": true, "message0": "my_type: %1 set %2 %3 to %4 %5", "nextStatement": null, "previousStatement": null, "tooltip": "", "type": "complex_type_setter_my_type"
			}]);
	})

	test('should generate multiple types from solana_program', () => {
		let types = xml_text_to_type_generator(
			`<block type="solana_program">
		<field name="NAME">solana program</field>
        <statement name="type library">
			<block type="type_definition">
				<value name="type_name">
					<block type="text">
						<field name="TEXT">my_first_type</field>
					</block>
				</value>
				<statement name="fields"></statement>
				<next>
					<block type="type_definition">	
						<value name="type_name">
							<block type="text">
								<field name="TEXT">my_second_type</field>
							</block>
						</value>
						<statement name="fields"></statement>
					</block>
				</next>
			</block>
		</statement>
		<statement name="instruction library">
		</statement>
		</block>`);
		let parsed_types = JSON.parse(types);
		expect(parsed_types).toHaveLength(2);
		expect(parsed_types[0]).toHaveLength(2);
		expect(parsed_types[1]).toHaveLength(2);
	})
})

describe('InstructionGenerator', () => {

	test('should generate nothing for account_layout', () => {
		let dom = blockly_dom(`<block type="account_layout"></block>`)
		let workspace = visualsolana.workspace_factory();
		Blockly.Xml.domToWorkspace(dom, workspace)
		expect(workspace.FunctionGenerator.workspaceToCode(workspace)).toEqual("");
	})

	test('should generate function blocks based on interface', () => {
		test_xml_text_to_function_generator(`<block type="instruction_definition">
			<value name="instruction_name">
				<block type="text">
					<field name="TEXT">do something</field>
				</block>
			</value>
			<statement name="accounts">
				<block type="account_layout">
					<value name="account_name">
						<block type="text">
							<field name="TEXT">account_0</field>
						</block>
					</value>
					<value name="layout">
						<block type="text">
							<field name="TEXT">layout_0</field>
						</block>
					</value>
					<next>
						<block type="account_layout">
							<value name="account_name">
								<block type="text">
									<field name="TEXT">account_1</field>
								</block>
							</value>
							<value name="layout">
								<block type="text">
									<field name="TEXT">layout_1</field>
								</block>
							</value>
						</block>
					</next>
				</block>
			</statement>
		</block>`, `"<block type=\\\"procedures_defnoreturn\\\">
				<mutation>
<arg instruction_name=\\\"account_0\\\"></arg>
<arg instruction_name=\\\"account_1\\\"></arg>
</mutation>
    <field name=\\\"NAME\\\">do something</field>     <comment></comment>    </block>"`.replace(/\s/g, " "));
	})

	test('should generate function blocks from solana_program', () => {
		let functions = xml_text_to_function_generator(`<block type="solana_program">
        <statement name="type library">
		</statement>
		<statement name="instruction library">
			<block type="instruction_definition">
				<value name="instruction_name">
					<block type="text">
						<field name="TEXT">instruction_1</field>
					</block>
				</value>
				<statement name="accounts"></statement>
				<next>
					<block type="instruction_definition">
						<value name="instruction_name">
							<block type="text">
								<field name="TEXT">instruction_2</field>
							</block>
						</value>
						<statement name="accounts"></statement>
					</block>
				</next>
			</block>
		</statement>
		</block>`)
		expect(JSON.parse(functions)).toHaveLength(2);
	})
})

describe('RustGenerator', () => {
	test('should succeed on empty document', () => {
		test_xml_text_to_rust_generator("", "")
	})

	test('should succeed on empty wrapping program', () => {
		test_xml_text_to_rust_generator(`<block type="solana_program">
		<field name="NAME">solana program</field>
		<statement name="type library"></statement>
		<statement name="instruction library"></statement>
		<statement name="instruction impl"></statement>
		</block>`, `// !!! GENERATED CODE: DO NOT MODIFY !!!
use solana_program::{
	account_info::{AccountInfo},
	entrypoint,
	entrypoint::ProgramResult,
	program_error::ProgramError,
	pubkey::Pubkey,
};

// !!! type_block


entrypoint!(process_instruction);
pub fn process_instruction(
	program_id: &Pubkey,
	accounts: &[AccountInfo],
	instruction_data: &[u8],
) -> ProgramResult {
	Ok(())
}`)
	})

	test('should generate types on empty wrapping program', () => {
		test_xml_text_to_rust_generator(`<block type="solana_program">
		<field name="NAME">solana program</field>
		<statement name="type library">
			<block type="type_definition">	
				<value name="type_name">
					<block type="text">
						<field name="TEXT">my_type</field>
					</block>
				</value>
				<statement name="fields">
					<block type="type_field">
						<value name="field_name">
							<block type="text">
								<field name="TEXT">my_text_field</field>
							</block>
						</value>
						<value name="field_type">
							<block type="text">
								<field name="TEXT">10</field>
							</block>
						</value>
						<next>
							<block type="type_field">
								<value name="field_name">
									<block type="text">
										<field name="TEXT">my_int_field</field>
									</block>
								</value>
								<value name="field_type">
									<block type="math_number">
										<field name="NUM">12</field>
									</block>
								</value>
							</block>
						</next>
					</block>
				</statement>
			</block>
		</statement>
		<statement name="instruction library"></statement>
		<statement name="instruction impl"></statement>
		</block>`, `// !!! GENERATED CODE: DO NOT MODIFY !!!
use solana_program::{
	account_info::{AccountInfo},
	entrypoint,
	entrypoint::ProgramResult,
	program_error::ProgramError,
	pubkey::Pubkey,
};

// !!! type_block
pub struct my_type {
	pub my_text_field: [u8; 10],
	pub my_int_field: [u8; 12],
}

entrypoint!(process_instruction);
pub fn process_instruction(
	program_id: &Pubkey,
	accounts: &[AccountInfo],
	instruction_data: &[u8],
) -> ProgramResult {
	Ok(())
}`)
	})
})

describe("generate_types_and_instructions", () => {
	let xml_text = `<block type="solana_program">
	<field name="NAME">solana program</field>
	<statement name="type library">
		<block type="type_definition">
			<value name="type_name">
				<block type="text">
					<field name="TEXT">my_first_type</field>
				</block>
			</value>
			<statement name="fields"></statement>
			<next>
				<block type="type_definition">	
					<value name="type_name">
						<block type="text">
							<field name="TEXT">my_second_type</field>
						</block>
					</value>
					<statement name="fields"></statement>
				</block>
			</next>
		</block>
	</statement>
	<statement name="instruction library">
		<block type="instruction_definition">
			<value name="instruction_name">
				<block type="text">
					<field name="TEXT">instruction_1</field>
				</block>
			</value>
			<statement name="accounts"></statement>
			<next>
				<block type="instruction_definition">
					<value name="instruction_name">
						<block type="text">
							<field name="TEXT">instruction_2</field>
						</block>
					</value>
					<statement name="accounts"></statement>
				</block>
			</next>
		</block>
	</statement>
	</block>`
	let dom = blockly_dom(xml_text)
	let workspace = visualsolana.workspace_factory();
	Blockly.Xml.domToWorkspace(dom, workspace)

	test("should generate types", () => {
		visualsolana.generate_types_and_instructions(workspace);
		visualsolana.generate_types_and_instructions(workspace);
	})

	test("should generate instructions based on types", () => {

	})

	test("should not replace existing functions", () => {

	})
})