(function (root, factory) {
  'use strict';

  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.usecasesContract = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  var MAX_USECASES = 500;
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function isText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function viewportFor(screen, usecase) {
    var fallbackName = /^m-/.test(
      String(screen || '')
        .split('/')
        .pop()
    )
      ? 'mobile'
      : 'desktop';
    var viewport = usecase && usecase.viewport;
    if (isObject(viewport)) {
      var width = Number(viewport.width);
      var height = Number(viewport.height);
      return {
        name: text(viewport.name) || fallbackName,
        width: Number.isSafeInteger(width) && width > 0 ? width : 0,
        height: Number.isSafeInteger(height) && height > 0 ? height : 0,
      };
    }
    if (typeof viewport === 'string') {
      return viewport === 'mobile'
        ? { name: 'mobile', width: 390, height: 844 }
        : { name: text(viewport) || fallbackName, width: 1440, height: 900 };
    }
    return fallbackName === 'mobile'
      ? { name: 'mobile', width: 390, height: 844 }
      : { name: 'desktop', width: 1440, height: 900 };
  }

  function screenPathIsSafe(screen) {
    if (!isText(screen)) return false;
    var value = screen.trim();
    if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.charAt(0) === '/' || value.charAt(0) === '\\') return false;
    if (/[?#]/.test(value) || value.indexOf('\\') !== -1) return false;
    var segments = value.split('/');
    return !segments.some(function (segment) {
      return !segment || segment === '.' || segment === '..';
    });
  }

  function allowedScreenSet(options) {
    var source = options && options.allowedScreens;
    if (!source) return null;
    if (source instanceof Set) return source;
    return new Set(Array.isArray(source) ? source : []);
  }

  function validateMatrix(matrix, options) {
    options = options || {};
    var errors = [];
    var covered = new Set();
    var screenSet = allowedScreenSet(options);
    var requireCoverage = options.requireCoverage !== false;
    var allowEmptyUsecases = options.allowEmptyUsecases === true;
    var maxUsecases = Number.isSafeInteger(options.maxUsecases) ? options.maxUsecases : MAX_USECASES;

    if (!isObject(matrix)) return { valid: false, errors: ['usecases.json must be an object'] };
    var states = matrix.states;
    if (!isObject(states) || Object.keys(states).length === 0) {
      errors.push('states must declare at least one axis');
      states = {};
    }

    Object.keys(states).forEach(function (axis) {
      var definition = states[axis];
      if (!ID_PATTERN.test(axis)) errors.push('state axis "' + axis + '" has an unsafe key');
      if (!isObject(definition)) {
        errors.push('state "' + axis + '" must be an object');
        return;
      }
      if (!isText(definition.doc)) errors.push('state "' + axis + '" is missing doc');
      if (!isObject(definition.options) || Object.keys(definition.options).length === 0) {
        errors.push('state "' + axis + '" must declare at least one option');
        return;
      }
      Object.keys(definition.options).forEach(function (option) {
        var optionDefinition = definition.options[option];
        if (!ID_PATTERN.test(option)) errors.push('state "' + axis + '" option "' + option + '" has an unsafe key');
        if (!isObject(optionDefinition)) {
          errors.push('state "' + axis + '" option "' + option + '" must be an object');
        } else if (!isText(optionDefinition.doc)) {
          errors.push('state "' + axis + '" option "' + option + '" is missing doc');
        }
      });
    });

    if (!Array.isArray(matrix.usecases)) {
      errors.push('usecases must be a non-empty array');
    } else if (matrix.usecases.length === 0 && !allowEmptyUsecases) {
      errors.push('usecases must be a non-empty array');
    } else if (matrix.usecases.length > maxUsecases) {
      errors.push('usecases exceeds the maximum of ' + maxUsecases + ' scenarios');
    }

    var ids = new Set();
    (Array.isArray(matrix.usecases) ? matrix.usecases : []).forEach(function (usecase, index) {
      var label = 'use case #' + (index + 1);
      if (!isObject(usecase)) {
        errors.push(label + ' must be an object');
        return;
      }
      if (!isText(usecase.id)) errors.push(label + ' is missing id');
      else if (!ID_PATTERN.test(usecase.id.trim())) errors.push(label + ' has an unsafe id "' + usecase.id + '"');
      else if (ids.has(usecase.id.trim())) errors.push('duplicate use case id "' + usecase.id.trim() + '"');
      else ids.add(usecase.id.trim());
      if (!isText(usecase.name)) errors.push(label + ' is missing name');
      if (!isText(usecase.story)) errors.push(label + ' is missing story');
      if (!Array.isArray(usecase.rules)) errors.push(label + ' rules must be an array');
      else
        usecase.rules.forEach(function (rule, ruleIndex) {
          if (!isText(rule)) errors.push(label + ' rule #' + (ruleIndex + 1) + ' must be non-empty text');
        });

      if (!Array.isArray(usecase.screens) || usecase.screens.length === 0) {
        errors.push(label + ' must name at least one screen');
      } else {
        var seenScreens = new Set();
        usecase.screens.forEach(function (screen) {
          if (!screenPathIsSafe(screen)) {
            errors.push(label + ' has an unsafe screen "' + String(screen) + '"');
            return;
          }
          var clean = screen.trim();
          if (seenScreens.has(clean)) errors.push(label + ' repeats screen "' + clean + '"');
          seenScreens.add(clean);
          if (screenSet && !screenSet.has(clean)) errors.push(label + ' names a missing screen "' + clean + '"');
        });
      }

      var viewport = viewportFor((usecase.screens || [])[0], usecase);
      if (viewport.width < 1 || viewport.height < 1)
        errors.push(label + ' viewport must declare positive integer width and height');

      if (!isObject(usecase.state)) {
        errors.push(label + ' state must be an object');
        return;
      }
      Object.keys(usecase.state).forEach(function (axis) {
        var option = usecase.state[axis];
        if (!own(states, axis)) {
          errors.push(label + ' names unknown state axis "' + axis + '"');
          return;
        }
        if (!isObject(states[axis]) || !isObject(states[axis].options) || !own(states[axis].options, option)) {
          errors.push(label + ' names unknown option "' + axis + '.' + option + '"');
          return;
        }
        covered.add(axis + '\0' + option);
      });
      Object.keys(states).forEach(function (axis) {
        if (!own(usecase.state, axis)) errors.push(label + ' is missing state axis "' + axis + '"');
      });
    });

    if (requireCoverage) {
      Object.keys(states).forEach(function (axis) {
        Object.keys((states[axis] && states[axis].options) || {}).forEach(function (option) {
          if (!covered.has(axis + '\0' + option))
            errors.push('state "' + axis + '" option "' + option + '" is not covered by any use case');
        });
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function normalizeStates(states) {
    var result = {};
    Object.keys(states || {}).forEach(function (axis) {
      var definition = states[axis] || {};
      var normalized = { label: text(definition.label), doc: text(definition.doc), options: {} };
      if (!normalized.label) delete normalized.label;
      Object.keys(definition.options || {}).forEach(function (option) {
        var detail = definition.options[option] || {};
        normalized.options[option] = { label: text(detail.label), doc: text(detail.doc) };
        if (!normalized.options[option].label) delete normalized.options[option].label;
      });
      result[axis] = normalized;
    });
    return result;
  }

  function normalizeUsecase(usecase) {
    var screens = (usecase.screens || []).map(function (screen) {
      return text(screen);
    });
    var firstViewport = viewportFor(screens[0], usecase);
    var state = {};
    Object.keys(usecase.state || {}).forEach(function (axis) {
      state[axis] = String(usecase.state[axis]);
    });
    return {
      id: text(usecase.id),
      name: text(usecase.name),
      story: text(usecase.story),
      rules: (usecase.rules || []).map(text),
      screens: screens,
      viewport: {
        name: firstViewport.name,
        width: firstViewport.width,
        height: firstViewport.height,
      },
      state: state,
    };
  }

  function normalizeMatrix(matrix) {
    return {
      states: normalizeStates(matrix.states || {}),
      usecases: (matrix.usecases || []).map(normalizeUsecase),
    };
  }

  function queryForState(state, extra) {
    var query = new URLSearchParams();
    [state || {}, extra || {}].forEach(function (source) {
      Object.keys(source).forEach(function (key) {
        if (key !== 'nopanel' && source[key] != null) query.set(key, String(source[key]));
      });
    });
    var value = query.toString();
    return value ? '?' + value : '';
  }

  function deepLink(screen, state, extra) {
    var raw = String(screen || '');
    var hashAt = raw.indexOf('#');
    var hash = hashAt < 0 ? '' : raw.slice(hashAt);
    var beforeHash = hashAt < 0 ? raw : raw.slice(0, hashAt);
    var queryAt = beforeHash.indexOf('?');
    var pathname = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
    var current = new URLSearchParams(queryAt < 0 ? '' : beforeHash.slice(queryAt + 1));
    current.delete('nopanel');
    Object.keys(state || {}).forEach(function (key) {
      if (key !== 'nopanel' && state[key] != null) current.set(key, String(state[key]));
    });
    Object.keys(extra || {}).forEach(function (key) {
      if (key !== 'nopanel' && extra[key] != null) current.set(key, String(extra[key]));
    });
    var serialized = current.toString();
    return pathname + (serialized ? '?' + serialized : '') + hash;
  }

  function normalizedEntry(usecase) {
    var normalized = normalizeUsecase(usecase);
    var screens = normalized.screens.map(function (screen) {
      var viewport = viewportFor(screen, normalized);
      return {
        screen: screen,
        viewport: viewport.name,
        deepLink: deepLink(screen, normalized.state),
        width: viewport.width,
        height: viewport.height,
      };
    });
    return {
      id: normalized.id,
      name: normalized.name,
      story: normalized.story,
      rules: normalized.rules,
      state: normalized.state,
      deepLink: screens.length ? screens[0].deepLink : '',
      screens: screens,
    };
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    if (isObject(value))
      return (
        '{' +
        Object.keys(value)
          .sort()
          .map(function (key) {
            return JSON.stringify(key) + ':' + stableStringify(value[key]);
          })
          .join(',') +
        '}'
      );
    return JSON.stringify(value);
  }

  function fingerprintMatrix(matrix) {
    var input = stableStringify(normalizeMatrix(matrix));
    var hash = 2166136261;
    for (var index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return 'uc-v1-' + (hash >>> 0).toString(16).padStart(8, '0');
  }

  function stateCatalogSignature(states) {
    var catalog = {};
    Object.keys(states || {}).forEach(function (axis) {
      catalog[axis] = Object.keys((states[axis] && states[axis].options) || {});
    });
    return stableStringify(catalog);
  }

  function screensFromManifest(manifest) {
    var screens = [];
    var seen = new Set();
    ((manifest && manifest.rows) || []).forEach(function (row) {
      (row.frames || []).forEach(function (frame) {
        var page = String((frame && frame.page) || '').split(/[?#]/)[0];
        if (screenPathIsSafe(page) && !seen.has(page)) {
          seen.add(page);
          screens.push(page);
        }
      });
    });
    return screens;
  }

  return {
    MAX_USECASES: MAX_USECASES,
    MAX_IMPORT_BYTES: MAX_IMPORT_BYTES,
    ID_PATTERN: ID_PATTERN,
    validateMatrix: validateMatrix,
    normalizeMatrix: normalizeMatrix,
    normalizeUsecase: normalizeUsecase,
    normalizedEntry: normalizedEntry,
    viewportFor: viewportFor,
    queryForState: queryForState,
    deepLink: deepLink,
    fingerprintMatrix: fingerprintMatrix,
    stateCatalogSignature: stateCatalogSignature,
    screensFromManifest: screensFromManifest,
  };
});
