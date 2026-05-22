(function (global) {
  'use strict';

  function uid() {
    return 'n_' + Math.random().toString(36).slice(2, 10);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function textNode(text) {
    return { id: uid(), type: 'atom', value: text || '' };
  }

  function groupNode(operator, children) {
    return { id: uid(), type: 'group', operator: operator || 'and', children: children || [] };
  }

  function LogicCircuitEditor(container, options) {
    if (!container) throw new Error('container is required');
    this.options = options || {};
    this.container = container;
    this.root = groupNode('and', [textNode('A')]);
    this.selectedId = null;
    this._render();
  }

  LogicCircuitEditor.prototype._walk = function (node, fn, parent) {
    fn(node, parent);
    if (node.type === 'group') {
      node.children.forEach(function (child) {
        this._walk(child, fn, node);
      }, this);
    }
  };

  LogicCircuitEditor.prototype._findNode = function (id) {
    var found = null;
    var parent = null;
    this._walk(this.root, function (node, p) {
      if (node.id === id) {
        found = node;
        parent = p || null;
      }
    });
    return { node: found, parent: parent };
  };

  LogicCircuitEditor.prototype._select = function (id) {
    this.selectedId = id;
    this._render();
  };

  LogicCircuitEditor.prototype._deleteSelected = function () {
    if (!this.selectedId || this.selectedId === this.root.id) return;
    var lookup = this._findNode(this.selectedId);
    if (!lookup.node || !lookup.parent) return;
    var idx = lookup.parent.children.findIndex(function (c) { return c.id === lookup.node.id; });
    if (idx >= 0) lookup.parent.children.splice(idx, 1);
    if (lookup.parent.children.length === 0) lookup.parent.children.push(textNode(''));
    this.selectedId = lookup.parent.id;
    this._render();
  };

  LogicCircuitEditor.prototype._insertAfter = function (targetId, operator) {
    var lookup = this._findNode(targetId);
    if (!lookup.node || !lookup.parent) return;
    var parent = lookup.parent;
    var idx = parent.children.findIndex(function (c) { return c.id === targetId; });
    var node = textNode('new condition');
    if (idx >= 0) {
      parent.children.splice(idx + 1, 0, node);
      if (operator && parent.operator !== operator) {
        var group = groupNode(operator, [lookup.node, node]);
        parent.children.splice(idx, 2, group);
        this.selectedId = group.id;
      } else {
        this.selectedId = node.id;
      }
      this._render();
    }
  };

  LogicCircuitEditor.prototype._wrapSelected = function (operator) {
    if (!this.selectedId || this.selectedId === this.root.id) return;
    var lookup = this._findNode(this.selectedId);
    if (!lookup.node || !lookup.parent) return;
    var idx = lookup.parent.children.findIndex(function (c) { return c.id === lookup.node.id; });
    if (idx < 0) return;
    var wrapped = groupNode(operator, [lookup.node]);
    lookup.parent.children.splice(idx, 1, wrapped);
    this.selectedId = wrapped.id;
    this._render();
  };


  LogicCircuitEditor.prototype._addOrCondition = function () {
    if (!this.selectedId) this.selectedId = this.root.id;

    var lookup = this._findNode(this.selectedId);
    if (!lookup.node) return;

    if (lookup.node.type === 'group' && lookup.node.operator === 'or') {
      var appended = textNode('new or');
      lookup.node.children.push(appended);
      this.selectedId = appended.id;
      this._render();
      return;
    }

    if (lookup.parent && lookup.parent.type === 'group' && lookup.parent.operator === 'or') {
      var idx = lookup.parent.children.findIndex(function (c) { return c.id === lookup.node.id; });
      var sibling = textNode('new or');
      lookup.parent.children.splice(idx + 1, 0, sibling);
      this.selectedId = sibling.id;
      this._render();
      return;
    }

    if (this.selectedId === this.root.id) {
      var orGroup = groupNode('or', [textNode('new or'), textNode('new or')]);
      this.root.children.push(orGroup);
      this.selectedId = orGroup.id;
      this._render();
      return;
    }

    this._wrapSelected('or');
    var wrappedLookup = this._findNode(this.selectedId);
    if (wrappedLookup.node && wrappedLookup.node.type === 'group' && wrappedLookup.node.operator === 'or') {
      wrappedLookup.node.children.push(textNode('new or'));
      this._render();
    }
  };

  LogicCircuitEditor.prototype._toggleNot = function () {
    if (!this.selectedId) return;
    var lookup = this._findNode(this.selectedId);
    if (!lookup.node) return;
    lookup.node.negate = !lookup.node.negate;
    this._render();
  };

  LogicCircuitEditor.prototype._setAtomValue = function (id, value) {
    var lookup = this._findNode(id);
    if (lookup.node && lookup.node.type === 'atom') {
      lookup.node.value = value;
    }
  };

  LogicCircuitEditor.prototype._createNodeElement = function (node) {
    var self = this;
    var wrap = document.createElement('div');
    wrap.className = 'lc-node ' + (node.type === 'group' ? 'lc-group' : 'lc-atom');
    if (node.id === this.selectedId) wrap.classList.add('selected');
    wrap.dataset.id = node.id;

    var header = document.createElement('div');
    header.className = 'lc-header';

    if (node.type === 'group') {
      header.textContent = (node.negate ? 'NOT ' : '') + node.operator.toUpperCase() + ' (' + (node.operator === 'and' ? '直列' : '並列') + ')';
      wrap.appendChild(header);

      var lane = document.createElement('div');
      lane.className = node.operator === 'and' ? 'lc-serial' : 'lc-parallel';

      if (node.operator === 'and') {
        node.children.forEach(function (c, idx) {
          if (idx > 0) {
            var connector = document.createElement('div');
            connector.className = 'lc-and-connector';
            connector.textContent = '─';
            lane.appendChild(connector);
          }
          lane.appendChild(self._createNodeElement(c));
        });
      } else {
        var branchTop = document.createElement('div');
        branchTop.className = 'lc-or-branch';
        var branchBottom = document.createElement('div');
        branchBottom.className = 'lc-or-branch';

        if (node.children[0]) branchTop.appendChild(self._createNodeElement(node.children[0]));
        if (node.children[1]) branchBottom.appendChild(self._createNodeElement(node.children[1]));

        lane.appendChild(branchTop);
        lane.appendChild(branchBottom);

        if (node.children.length > 2) {
          node.children.slice(2).forEach(function (c) {
            var extra = document.createElement('div');
            extra.className = 'lc-or-extra';
            extra.appendChild(self._createNodeElement(c));
            lane.appendChild(extra);
          });
        }
      }
      wrap.appendChild(lane);
    } else {
      header.textContent = node.negate ? 'NOT 条件' : '条件';
      wrap.appendChild(header);
      var input = document.createElement('input');
      input.type = 'text';
      input.value = node.value;
      input.className = 'lc-input';
      input.addEventListener('input', function (e) {
        self._setAtomValue(node.id, e.target.value);
      });
      wrap.appendChild(input);
    }

    wrap.addEventListener('click', function (e) {
      e.stopPropagation();
      self._select(node.id);
    });

    return wrap;
  };

  LogicCircuitEditor.prototype._render = function () {
    this.container.innerHTML = '';
    var tree = this._createNodeElement(this.root);
    this.container.appendChild(tree);
  };

  LogicCircuitEditor.prototype.toJSON = function () {
    return clone(this.root);
  };

  LogicCircuitEditor.prototype.loadJSON = function (json) {
    if (!json || json.type !== 'group' || !Array.isArray(json.children)) {
      throw new Error('Invalid logic tree JSON');
    }
    this.root = clone(json);
    this.selectedId = this.root.id;
    this._render();
  };

  LogicCircuitEditor.prototype._toExpr = function (node, format) {
    var self = this;
    var expr;
    if (node.type === 'atom') {
      expr = node.value || 'true';
    } else {
      var op = node.operator === 'and' ? (format === 'vba' ? ' And ' : ' && ') : (format === 'vba' ? ' Or ' : ' || ');
      expr = '(' + node.children.map(function (c) { return self._toExpr(c, format); }).join(op) + ')';
    }
    if (node.negate) {
      return format === 'vba' ? '(Not ' + expr + ')' : '(!' + expr + ')';
    }
    return expr;
  };

  LogicCircuitEditor.prototype.exportExpression = function (format) {
    return this._toExpr(this.root, format || 'javascript');
  };

  LogicCircuitEditor.prototype.bindDefaultControls = function (controls) {
    var self = this;
    controls.addAnd.addEventListener('click', function () {
      if (!self.selectedId) self.selectedId = self.root.id;
      if (self.selectedId === self.root.id) {
        self.root.children.push(textNode('new and'));
      } else {
        self._insertAfter(self.selectedId, 'and');
      }
      self._render();
    });

    controls.addOr.addEventListener('click', function () {
      self._addOrCondition();
    });

    controls.wrapAnd.addEventListener('click', function () { self._wrapSelected('and'); });
    controls.wrapOr.addEventListener('click', function () { self._wrapSelected('or'); });
    controls.toggleNot.addEventListener('click', function () { self._toggleNot(); });
    controls.remove.addEventListener('click', function () { self._deleteSelected(); });

    controls.saveJson.addEventListener('click', function () {
      controls.io.value = JSON.stringify(self.toJSON(), null, 2);
    });
    controls.loadJson.addEventListener('click', function () {
      try {
        self.loadJSON(JSON.parse(controls.io.value));
      } catch (e) {
        alert('JSON parse error: ' + e.message);
      }
    });
    controls.outJs.addEventListener('click', function () {
      controls.io.value = self.exportExpression('javascript');
    });
    controls.outVba.addEventListener('click', function () {
      controls.io.value = self.exportExpression('vba');
    });

    document.addEventListener('keydown', function (e) {
      var active = document.activeElement;
      var isTextInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      if (!isTextInput && (e.key === 'Delete' || e.key === 'Backspace')) self._deleteSelected();
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (!self.selectedId) {
          self.selectedId = self.root.id;
          self.root.children.push(textNode('new and'));
          self._render();
        } else if (self.selectedId === self.root.id) {
          self.root.children.push(textNode('new and'));
          self._render();
        } else {
          self._insertAfter(self.selectedId, 'and');
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        self._addOrCondition();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        self._toggleNot();
      }
    });
  };

  global.LogicCircuitEditor = LogicCircuitEditor;
})(typeof window !== 'undefined' ? window : globalThis);
