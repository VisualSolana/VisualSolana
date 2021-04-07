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


(function(){
	const vscode = acquireVsCodeApi();

	var workspace = Blockly.inject('blocklyDiv', {toolbox: document.getElementById('toolbox')} );
	workspace.addChangeListener(function(event){
		if(event.type != Blockly.Events.BLOCK_MOVE) {
			return
		}
		dom = Blockly.Xml.workspaceToDom(workspace);
		xml = Blockly.Xml.domToText(dom);
		vscode.postMessage({type: 'blocklyEvent', data: event.data, text: xml})
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

				if(!text){
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
}());
