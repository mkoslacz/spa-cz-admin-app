(function () {
  'use strict';

  var contract = window.usecasesContract;
  var root = document.getElementById('uc-workshop');
  if (!root) return;

  var elements = {
    status: document.getElementById('ucw-status'),
    conflict: document.getElementById('ucw-conflict'),
    conflictCopy: document.getElementById('ucw-conflict-copy'),
    keepLocal: document.getElementById('ucw-keep-local'),
    downloadLocal: document.getElementById('ucw-download-local'),
    resetConflict: document.getElementById('ucw-reset-conflict'),
    toolbar: document.getElementById('ucw-toolbar'),
    search: document.getElementById('ucw-search'),
    create: document.getElementById('ucw-create'),
    importButton: document.getElementById('ucw-import'),
    importFile: document.getElementById('ucw-import-file'),
    exportButton: document.getElementById('ucw-export'),
    reset: document.getElementById('ucw-reset'),
    validation: document.getElementById('ucw-validation'),
    count: document.getElementById('ucw-draft-count'),
    list: document.getElementById('ucw-list'),
    editor: document.getElementById('ucw-editor'),
    editorTitle: document.getElementById('ucw-editor-title'),
    form: document.getElementById('ucw-form'),
    formErrors: document.getElementById('ucw-form-errors'),
    id: document.getElementById('ucw-id'),
    name: document.getElementById('ucw-name'),
    story: document.getElementById('ucw-story'),
    rules: document.getElementById('ucw-rules'),
    states: document.getElementById('ucw-state-fields'),
    screens: document.getElementById('ucw-screen-fields'),
    cancel: document.getElementById('ucw-cancel'),
    cancelBottom: document.getElementById('ucw-cancel-bottom'),
  };

  var sourceMatrix = null;
  var sourceFingerprint = '';
  var screenCatalog = [];
  var envelope = null;
  var conflictActive = false;
  var editingId = null;
  var storageMode = 'local';
  var memoryValue = null;
  var storageKey =
    'spa.cz.usecases-workshop.v1:' +
    window.location.origin +
    window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/') + 1);
  var readyResolve;
  var readyReject;
  var ready = new Promise(function (resolve, reject) {
    readyResolve = resolve;
    readyReject = reject;
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function element(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = String(value);
    return node;
  }

  function setStatus(message) {
    elements.status.textContent = message;
    elements.status.dataset.mode = storageMode;
  }

  function showMessages(target, messages) {
    target.textContent = '';
    if (!messages || !messages.length) {
      target.hidden = true;
      return;
    }
    var title = element('strong', '', messages.length === 1 ? 'One issue needs attention' : 'Issues need attention');
    var list = element('ul');
    messages.slice(0, 12).forEach(function (message) {
      list.appendChild(element('li', '', message));
    });
    if (messages.length > 12) list.appendChild(element('li', '', messages.length - 12 + ' more issues'));
    target.appendChild(title);
    target.appendChild(list);
    target.hidden = false;
  }

  function byteSize(value) {
    return new window.Blob([String(value)]).size;
  }

  function localStorageAvailable() {
    try {
      var probe = storageKey + ':probe';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (_) {
      storageMode = 'memory';
      return false;
    }
  }

  function readStored() {
    if (storageMode === 'memory') return memoryValue;
    try {
      return window.localStorage.getItem(storageKey);
    } catch (_) {
      storageMode = 'memory';
      return memoryValue;
    }
  }

  function writeStored(value) {
    memoryValue = value;
    if (storageMode === 'memory') return;
    try {
      window.localStorage.setItem(storageKey, value);
    } catch (_) {
      storageMode = 'memory';
    }
  }

  function removeStored() {
    memoryValue = null;
    if (storageMode === 'memory') return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch (_) {
      storageMode = 'memory';
    }
  }

  function nextSequenceFor(matrix) {
    var highest = 0;
    (matrix.usecases || []).forEach(function (usecase) {
      var match = /^UC-DRAFT-(\d+)$/.exec(usecase.id || '');
      if (match) highest = Math.max(highest, Number(match[1]));
    });
    return highest + 1;
  }

  function freshEnvelope(matrix, fingerprint) {
    return {
      version: 1,
      baseFingerprint: fingerprint,
      matrix: contract.normalizeMatrix(matrix),
      nextSequence: nextSequenceFor(matrix),
      retiredIds: [],
    };
  }

  function serializeEnvelope() {
    return JSON.stringify(envelope);
  }

  function persist() {
    writeStored(serializeEnvelope());
  }

  function stateCatalogMatches(matrix) {
    return (
      contract.stateCatalogSignature(matrix && matrix.states) ===
      contract.stateCatalogSignature(sourceMatrix && sourceMatrix.states)
    );
  }

  function validationFor(matrix, requireCoverage, allowEmptyUsecases) {
    var result = contract.validateMatrix(matrix, {
      allowedScreens: screenCatalog,
      maxUsecases: contract.MAX_USECASES,
      requireCoverage: requireCoverage,
      allowEmptyUsecases: allowEmptyUsecases === true,
    });
    if (sourceMatrix && !stateCatalogMatches(matrix)) {
      result.errors.unshift('State axes and options must match the currently published usecases.json.');
      result.valid = false;
    }
    return result;
  }

  function setWorkshopDisabled(disabled) {
    Array.prototype.forEach.call(elements.toolbar.querySelectorAll('button, input'), function (control) {
      control.disabled = Boolean(disabled);
    });
    if (disabled) closeEditor();
  }

  function updateStatus() {
    if (!envelope) return;
    var result = validationFor(envelope.matrix, true);
    var storageCopy =
      storageMode === 'memory' ? ' · in-memory only; reload will lose changes' : ' · saved in this browser';
    if (conflictActive) {
      setStatus('Local draft protected · ' + envelope.matrix.usecases.length + ' scenarios' + storageCopy);
      showMessages(elements.validation, []);
      return;
    }
    if (result.valid) {
      setStatus('Local draft · ' + envelope.matrix.usecases.length + ' scenarios · ready to export' + storageCopy);
      showMessages(elements.validation, []);
    } else {
      setStatus(
        'Local draft · ' +
          envelope.matrix.usecases.length +
          ' scenarios · export blocked by ' +
          result.errors.length +
          (result.errors.length === 1 ? ' contract issue' : ' contract issues') +
          storageCopy
      );
      showMessages(elements.validation, result.errors);
    }
  }

  function stateSummary(usecase) {
    return Object.keys(usecase.state || {})
      .map(function (axis) {
        var definition = sourceMatrix.states[axis];
        var option = definition && definition.options && definition.options[usecase.state[axis]];
        return ((definition && definition.label) || axis) + ': ' + ((option && option.label) || usecase.state[axis]);
      })
      .join(' · ');
  }

  function renderCard(usecase) {
    var card = element('article', 'ucw-draft-card');
    card.setAttribute('data-uc-id', usecase.id);

    var head = element('div', 'ucw-card-head');
    var title = element('div');
    title.appendChild(element('span', 'ucw-draft-id', usecase.id));
    title.appendChild(element('h3', '', usecase.name));
    head.appendChild(title);
    card.appendChild(head);
    card.appendChild(element('p', 'ucw-card-story', usecase.story));
    card.appendChild(element('p', 'ucw-card-state', stateSummary(usecase)));

    var links = element('div', 'ucw-deep-links');
    (usecase.screens || []).forEach(function (screen) {
      var link = element('a', '', screen);
      link.href = contract.deepLink(screen, usecase.state);
      link.target = '_blank';
      link.rel = 'noopener';
      links.appendChild(link);
    });
    card.appendChild(links);

    var actions = element('div', 'ucw-actions');
    [
      ['edit', 'Edit'],
      ['duplicate', 'Duplicate'],
      ['delete', 'Delete'],
    ].forEach(function (entry) {
      var button = element('button', 'rp-btn', entry[1]);
      button.type = 'button';
      button.dataset.action = entry[0];
      actions.appendChild(button);
    });
    card.appendChild(actions);
    return card;
  }

  function renderList() {
    var query = elements.search.value.trim().toLowerCase();
    var source = envelope ? envelope.matrix.usecases : [];
    var visible = source.filter(function (usecase) {
      if (!query) return true;
      return [usecase.id, usecase.name, usecase.story]
        .concat(usecase.screens || [])
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
    var fragment = document.createDocumentFragment();
    visible.forEach(function (usecase) {
      fragment.appendChild(renderCard(usecase));
    });
    elements.list.textContent = '';
    if (!visible.length)
      elements.list.appendChild(element('p', 'ucw-empty', query ? 'No matching scenarios.' : 'No scenarios.'));
    else elements.list.appendChild(fragment);
    elements.count.textContent =
      visible.length === source.length
        ? source.length + (source.length === 1 ? ' scenario' : ' scenarios')
        : visible.length + ' of ' + source.length + ' scenarios';
    updateStatus();
  }

  function closeEditor() {
    editingId = null;
    elements.editor.hidden = true;
    elements.form.reset();
    elements.states.textContent = '';
    elements.screens.textContent = '';
    showMessages(elements.formErrors, []);
  }

  function mintId() {
    var occupied = new Set(
      envelope.matrix.usecases
        .map(function (usecase) {
          return usecase.id;
        })
        .concat(envelope.retiredIds || [])
    );
    var id;
    do {
      id = 'UC-DRAFT-' + String(envelope.nextSequence++).padStart(3, '0');
    } while (occupied.has(id));
    envelope.retiredIds.push(id);
    persist();
    return id;
  }

  function defaultUsecase() {
    var state = {};
    Object.keys(sourceMatrix.states).forEach(function (axis) {
      state[axis] = Object.keys(sourceMatrix.states[axis].options)[0];
    });
    return {
      id: mintId(),
      name: '',
      story: '',
      rules: [],
      screens: screenCatalog.length ? [screenCatalog[0]] : [],
      viewport: { name: 'mobile', width: 390, height: 844 },
      state: state,
    };
  }

  function buildStateFields(usecase) {
    elements.states.textContent = '';
    var legend = element('legend', '', 'Prototype state');
    elements.states.appendChild(legend);
    Object.keys(sourceMatrix.states).forEach(function (axis) {
      var definition = sourceMatrix.states[axis];
      var row = element('div', 'ucw-state-row');
      var label = element('label', '', definition.label || axis);
      label.htmlFor = 'ucw-state-' + axis;
      var select = element('select');
      select.id = 'ucw-state-' + axis;
      select.name = 'state-' + axis;
      select.dataset.axis = axis;
      Object.keys(definition.options).forEach(function (option) {
        var detail = definition.options[option];
        var node = element('option', '', detail.label || option);
        node.value = option;
        node.selected = usecase.state && usecase.state[axis] === option;
        select.appendChild(node);
      });
      row.appendChild(label);
      row.appendChild(select);
      elements.states.appendChild(row);
    });
  }

  function buildScreenFields(usecase) {
    elements.screens.textContent = '';
    elements.screens.appendChild(element('legend', '', 'Screens'));
    screenCatalog.forEach(function (screen, index) {
      var label = element('label', 'ucw-screen-option');
      var input = element('input');
      input.type = 'checkbox';
      input.name = 'screen';
      input.value = screen;
      input.id = 'ucw-screen-' + index;
      input.checked = (usecase.screens || []).indexOf(screen) !== -1;
      label.htmlFor = input.id;
      label.appendChild(input);
      label.appendChild(document.createTextNode(screen));
      elements.screens.appendChild(label);
    });
  }

  function openEditor(usecase, mode) {
    editingId = mode === 'edit' ? usecase.id : null;
    elements.editorTitle.textContent = mode === 'edit' ? 'Edit scenario' : 'Create scenario';
    elements.id.value = usecase.id;
    elements.name.value = usecase.name || '';
    elements.story.value = usecase.story || '';
    elements.rules.value = (usecase.rules || []).join('\n');
    buildStateFields(usecase);
    buildScreenFields(usecase);
    showMessages(elements.formErrors, []);
    elements.editor.hidden = false;
    elements.name.focus();
  }

  function formUsecase() {
    var state = {};
    Array.prototype.forEach.call(elements.states.querySelectorAll('select[data-axis]'), function (select) {
      state[select.dataset.axis] = select.value;
    });
    var screens = Array.prototype.map.call(
      elements.screens.querySelectorAll('input[name="screen"]:checked'),
      function (input) {
        return input.value;
      }
    );
    return {
      id: elements.id.value,
      name: elements.name.value,
      story: elements.story.value,
      rules: elements.rules.value
        .split(/\r?\n/)
        .map(function (rule) {
          return rule.trim();
        })
        .filter(Boolean),
      screens: screens,
      viewport: { name: 'mobile', width: 390, height: 844 },
      state: state,
    };
  }

  function commitForm(event) {
    event.preventDefault();
    var usecase = formUsecase();
    var result = contract.validateMatrix(
      { states: sourceMatrix.states, usecases: [usecase] },
      { allowedScreens: screenCatalog, maxUsecases: 1, requireCoverage: false }
    );
    if (!result.valid) {
      showMessages(elements.formErrors, result.errors);
      return;
    }
    var normalized = contract.normalizeUsecase(usecase);
    if (editingId) {
      var index = envelope.matrix.usecases.findIndex(function (candidate) {
        return candidate.id === editingId;
      });
      if (index < 0) {
        showMessages(elements.formErrors, ['The edited scenario no longer exists.']);
        return;
      }
      normalized.id = editingId;
      envelope.matrix.usecases[index] = normalized;
    } else {
      envelope.matrix.usecases.push(normalized);
    }
    envelope.matrix = contract.normalizeMatrix(envelope.matrix);
    persist();
    closeEditor();
    renderList();
  }

  function findUsecase(id) {
    return envelope.matrix.usecases.find(function (usecase) {
      return usecase.id === id;
    });
  }

  function duplicateUsecase(usecase) {
    if (envelope.matrix.usecases.length >= contract.MAX_USECASES) {
      showMessages(elements.validation, ['The local workshop is limited to ' + contract.MAX_USECASES + ' scenarios.']);
      return;
    }
    var copy = clone(usecase);
    copy.id = mintId();
    copy.name = copy.name + ' (copy)';
    envelope.matrix.usecases.push(copy);
    persist();
    renderList();
  }

  function deleteUsecase(usecase) {
    var confirmed = window.confirm(
      'Delete ' +
        usecase.id +
        ' from this local draft? Published cards and comments stay unchanged until JSON is committed; publishing this removal would detach that canonical comment anchor.'
    );
    if (!confirmed) return;
    envelope.retiredIds.push(usecase.id);
    envelope.matrix.usecases = envelope.matrix.usecases.filter(function (candidate) {
      return candidate.id !== usecase.id;
    });
    persist();
    if (editingId === usecase.id) closeEditor();
    renderList();
  }

  function downloadText(contents, filename) {
    var url = window.URL.createObjectURL(new window.Blob([contents], { type: 'application/json' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      window.URL.revokeObjectURL(url);
    }, 0);
  }

  function exportText() {
    var result = validationFor(envelope.matrix, true);
    if (!result.valid) {
      showMessages(elements.validation, result.errors);
      throw new Error(result.errors.join('; '));
    }
    return JSON.stringify(contract.normalizeMatrix(envelope.matrix), null, 2) + '\n';
  }

  function exportDownload() {
    try {
      downloadText(exportText(), 'usecases.json');
    } catch (_) {
      setStatus('Export blocked. Resolve the contract issues listed below.');
    }
  }

  function importText(contents, options) {
    options = options || {};
    var before = serializeEnvelope();
    try {
      if (byteSize(contents) > contract.MAX_IMPORT_BYTES)
        throw new Error('Import exceeds the ' + contract.MAX_IMPORT_BYTES + '-byte safety limit.');
      var parsed = JSON.parse(contents);
      var result = validationFor(parsed, true);
      if (!result.valid) throw new Error(result.errors.join('; '));
      var normalized = contract.normalizeMatrix(parsed);
      if (options.confirm !== false && !window.confirm('Replace the entire local draft with this validated JSON?')) {
        return { imported: false, cancelled: true };
      }
      envelope = freshEnvelope(normalized, sourceFingerprint);
      persist();
      closeEditor();
      elements.search.value = '';
      renderList();
      return { imported: true, count: normalized.usecases.length };
    } catch (error) {
      if (serializeEnvelope() !== before) throw new Error('Atomic import invariant failed.');
      showMessages(elements.validation, [error && error.message ? error.message : String(error)]);
      setStatus('Import rejected. The existing local draft is unchanged.');
      return { imported: false, error: error && error.message ? error.message : String(error) };
    }
  }

  function resetToPublished(confirmReset) {
    if (
      confirmReset !== false &&
      !window.confirm('Discard the entire local draft and reset to the published scenarios?')
    )
      return false;
    envelope = freshEnvelope(sourceMatrix, sourceFingerprint);
    conflictActive = false;
    elements.conflict.hidden = true;
    setWorkshopDisabled(false);
    removeStored();
    closeEditor();
    elements.search.value = '';
    renderList();
    return true;
  }

  function showConflict() {
    conflictActive = true;
    elements.conflict.hidden = false;
    setWorkshopDisabled(true);
    renderList();
  }

  function keepLocal() {
    var rebased = { states: sourceMatrix.states, usecases: envelope.matrix.usecases };
    var result = validationFor(rebased, false, true);
    if (!result.valid) {
      showMessages(elements.validation, result.errors);
      elements.conflictCopy.textContent =
        'This draft uses state or screen choices that no longer exist. Download it, then reset or repair the JSON before importing.';
      return;
    }
    envelope.matrix = contract.normalizeMatrix(rebased);
    envelope.baseFingerprint = sourceFingerprint;
    conflictActive = false;
    elements.conflict.hidden = true;
    setWorkshopDisabled(false);
    persist();
    renderList();
  }

  function parseStored(value) {
    if (!value) return null;
    if (byteSize(value) > contract.MAX_IMPORT_BYTES * 2) throw new Error('Saved local draft exceeds the safety limit.');
    var parsed = JSON.parse(value);
    if (!parsed || parsed.version !== 1 || !parsed.matrix)
      throw new Error('Saved local draft has an unsupported format.');
    var result = contract.validateMatrix(parsed.matrix, {
      allowedScreens: screenCatalog,
      maxUsecases: contract.MAX_USECASES,
      requireCoverage: false,
      allowEmptyUsecases: true,
    });
    if (!result.valid) throw new Error(result.errors.join('; '));
    return {
      version: 1,
      baseFingerprint: String(parsed.baseFingerprint || ''),
      matrix: contract.normalizeMatrix(parsed.matrix),
      nextSequence: Number.isSafeInteger(parsed.nextSequence) ? parsed.nextSequence : nextSequenceFor(parsed.matrix),
      retiredIds: Array.isArray(parsed.retiredIds)
        ? parsed.retiredIds.filter(contract.ID_PATTERN.test.bind(contract.ID_PATTERN))
        : [],
    };
  }

  function wireEvents() {
    elements.search.addEventListener('input', renderList);
    elements.create.addEventListener('click', function () {
      if (envelope.matrix.usecases.length >= contract.MAX_USECASES) {
        showMessages(elements.validation, [
          'The local workshop is limited to ' + contract.MAX_USECASES + ' scenarios.',
        ]);
        return;
      }
      openEditor(defaultUsecase(), 'create');
    });
    elements.list.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-action]');
      var card = button && button.closest('[data-uc-id]');
      if (!button || !card) return;
      var usecase = findUsecase(card.getAttribute('data-uc-id'));
      if (!usecase) return;
      if (button.dataset.action === 'edit') openEditor(clone(usecase), 'edit');
      if (button.dataset.action === 'duplicate') duplicateUsecase(usecase);
      if (button.dataset.action === 'delete') deleteUsecase(usecase);
    });
    elements.form.addEventListener('submit', commitForm);
    elements.cancel.addEventListener('click', closeEditor);
    elements.cancelBottom.addEventListener('click', closeEditor);
    elements.importButton.addEventListener('click', function () {
      elements.importFile.click();
    });
    elements.importFile.addEventListener('change', function () {
      var file = elements.importFile.files && elements.importFile.files[0];
      elements.importFile.value = '';
      if (!file) return;
      if (file.size > contract.MAX_IMPORT_BYTES) {
        showMessages(elements.validation, ['Import exceeds the ' + contract.MAX_IMPORT_BYTES + '-byte safety limit.']);
        setStatus('Import rejected. The existing local draft is unchanged.');
        return;
      }
      file
        .text()
        .then(function (contents) {
          importText(contents);
        })
        .catch(function (error) {
          showMessages(elements.validation, [error && error.message ? error.message : String(error)]);
        });
    });
    elements.exportButton.addEventListener('click', exportDownload);
    elements.reset.addEventListener('click', function () {
      resetToPublished(true);
    });
    elements.keepLocal.addEventListener('click', keepLocal);
    elements.downloadLocal.addEventListener('click', function () {
      downloadText(JSON.stringify(envelope.matrix, null, 2) + '\n', 'usecases-local-conflict.json');
    });
    elements.resetConflict.addEventListener('click', function () {
      resetToPublished(true);
    });
  }

  window.__usecasesWorkshop = {
    ready: ready,
    storageKey: storageKey,
    getSnapshot: function () {
      return envelope ? clone(envelope.matrix) : null;
    },
    getEnvelopeJSON: function () {
      return envelope ? serializeEnvelope() : null;
    },
    importText: importText,
    exportText: exportText,
    reset: resetToPublished,
  };

  if (!contract) {
    setStatus('Workshop contract could not be loaded.');
    setWorkshopDisabled(true);
    readyReject(new Error('usecasesContract unavailable'));
    return;
  }
  if (window.location.protocol === 'file:') {
    setStatus('Authoring needs HTTP so the published JSON catalogs can load. The review page itself remains readable.');
    setWorkshopDisabled(true);
    readyResolve({ available: false, reason: 'file' });
    return;
  }

  localStorageAvailable();
  wireEvents();
  Promise.all(
    ['usecases.json', 'prototype.json'].map(function (url) {
      return window.fetch(url).then(function (response) {
        if (!response.ok) throw new Error(url + ' returned HTTP ' + response.status);
        return response.json();
      });
    })
  )
    .then(function (payloads) {
      screenCatalog = contract.screensFromManifest(payloads[1]);
      var sourceResult = contract.validateMatrix(payloads[0], {
        allowedScreens: screenCatalog,
        maxUsecases: Number.MAX_SAFE_INTEGER,
        requireCoverage: true,
      });
      if (!sourceResult.valid) throw new Error(sourceResult.errors.join('; '));
      sourceMatrix = contract.normalizeMatrix(payloads[0]);
      sourceFingerprint = contract.fingerprintMatrix(sourceMatrix);

      var stored = readStored();
      if (stored) {
        try {
          envelope = parseStored(stored);
        } catch (error) {
          envelope = freshEnvelope(sourceMatrix, sourceFingerprint);
          showMessages(elements.validation, ['Saved local draft could not be opened: ' + error.message]);
          setStatus('Saved local draft is invalid. Reset is required before authoring.');
          showConflict();
          readyResolve({ available: true, conflict: true, invalidLocal: true });
          return;
        }
      } else {
        envelope = freshEnvelope(sourceMatrix, sourceFingerprint);
      }

      if (envelope.baseFingerprint !== sourceFingerprint) showConflict();
      else renderList();
      readyResolve({ available: true, conflict: conflictActive });
    })
    .catch(function (error) {
      setStatus('Workshop data could not load: ' + (error && error.message ? error.message : String(error)));
      setWorkshopDisabled(true);
      readyReject(error);
    });
})();
