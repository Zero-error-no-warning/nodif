const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadEditorClass() {
  const src = fs.readFileSync('./logic-circuit-editor.js', 'utf8');
  const sandbox = {
    globalThis: {},
    window: undefined,
    document: {
      createElement() {
        return {
          className: '',
          classList: { add() {} },
          dataset: {},
          appendChild() {},
          addEventListener() {},
          textContent: ''
        };
      },
      addEventListener() {},
      activeElement: null
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.globalThis.LogicCircuitEditor;
}

function createEditor(EditorClass) {
  const container = { innerHTML: '', appendChild() {} };
  const editor = new EditorClass(container);
  editor._render = function () {};
  return editor;
}

test('exportExpression outputs JS and VBA operators correctly', () => {
  const EditorClass = loadEditorClass();
  const editor = createEditor(EditorClass);
  const tree = editor.toJSON();
  tree.children = [
    { id: 'a', type: 'atom', value: 'A' },
    {
      id: 'g1',
      type: 'group',
      operator: 'or',
      negate: true,
      children: [
        { id: 'b', type: 'atom', value: 'B' },
        { id: 'c', type: 'atom', value: 'C' }
      ]
    }
  ];
  editor.loadJSON(tree);

  assert.equal(editor.exportExpression('javascript'), '(A && (!(B || C)))');
  assert.equal(editor.exportExpression('vba'), '(A And (Not (B Or C)))');
});

test('deleteSelected keeps parent group non-empty', () => {
  const EditorClass = loadEditorClass();
  const editor = createEditor(EditorClass);
  const root = editor.root;
  root.children = [{ id: 'only', type: 'atom', value: 'X' }];
  editor.selectedId = 'only';

  editor._deleteSelected();

  assert.equal(root.children.length, 1);
  assert.equal(root.children[0].type, 'atom');
});

test('insertAfter with different operator wraps selected and new node', () => {
  const EditorClass = loadEditorClass();
  const editor = createEditor(EditorClass);
  const child = editor.root.children[0];

  editor._insertAfter(child.id, 'or');

  assert.equal(editor.root.children.length, 1);
  assert.equal(editor.root.children[0].type, 'group');
  assert.equal(editor.root.children[0].operator, 'or');
  assert.equal(editor.root.children[0].children.length, 2);
});

test('loadJSON rejects invalid payload', () => {
  const EditorClass = loadEditorClass();
  const editor = createEditor(EditorClass);

  assert.throws(() => editor.loadJSON({ type: 'atom' }), /Invalid logic tree JSON/);
});


test('addOrCondition creates a valid OR group with two operands at root', () => {
  const EditorClass = loadEditorClass();
  const editor = createEditor(EditorClass);
  editor.selectedId = editor.root.id;

  editor._addOrCondition();

  const added = editor.root.children[editor.root.children.length - 1];
  assert.equal(added.type, 'group');
  assert.equal(added.operator, 'or');
  assert.equal(added.children.length, 2);
});

test('addOrCondition appends branch when OR group is selected', () => {
  const EditorClass = loadEditorClass();
  const editor = createEditor(EditorClass);
  const orGroup = { id: 'g_or', type: 'group', operator: 'or', children: [{ id: 'a', type: 'atom', value: 'A' }, { id: 'b', type: 'atom', value: 'B' }] };
  editor.root.children = [orGroup];
  editor.selectedId = 'g_or';

  editor._addOrCondition();

  assert.equal(orGroup.children.length, 3);
  assert.equal(orGroup.children[2].type, 'atom');
});
