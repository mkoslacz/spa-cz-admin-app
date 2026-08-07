// Decode a Figma canvas.fig (kiwi format) into bounded JSONL nodes + tree summary.
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { decodeBinarySchema, compileSchema } = require('kiwi-schema');
const {
  CONVERTER_RESOURCE_BUDGET,
  ConverterBudgetError,
  assertWithinBudget,
  writeFileAtomically,
} = require('./converter-policy.js');

class DecodeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DecodeError';
    this.code = code;
  }
}

function createDependencies(overrides = {}) {
  return {
    compileSchema: overrides.compileSchema || compileSchema,
    decodeBinarySchema: overrides.decodeBinarySchema || decodeBinarySchema,
    fs: overrides.fs || fs,
    log: overrides.log || console.log,
    path: overrides.path || path,
    random: overrides.random || Math.random,
    zlib: overrides.zlib || zlib,
  };
}

function decodeError(code, message) {
  return new DecodeError(code, message);
}

function readBoundedFile(file, deps, budget = CONVERTER_RESOURCE_BUDGET) {
  let stat;
  try {
    stat = deps.fs.statSync(file);
  } catch (error) {
    throw decodeError('FIG_INPUT_UNREADABLE', 'could not stat ' + file + ': ' + error.message);
  }
  if (!stat.isFile()) throw decodeError('FIG_INPUT_UNREADABLE', 'canvas.fig is not a file: ' + file);
  if (stat.size > budget.maxInputBytes) {
    throw new ConverterBudgetError('maxInputBytes', stat.size, 'canvas.fig input', budget.maxInputBytes);
  }
  let data;
  try {
    data = deps.fs.readFileSync(file);
  } catch (error) {
    throw decodeError('FIG_INPUT_UNREADABLE', 'could not read ' + file + ': ' + error.message);
  }
  assertWithinBudget(data.length, 'maxInputBytes', 'canvas.fig input', budget);
  return data;
}

function parseFig(buffer, budget = CONVERTER_RESOURCE_BUDGET) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw decodeError('FIG_MALFORMED', 'canvas.fig is too short to contain a header');
  }
  assertWithinBudget(buffer.length, 'maxInputBytes', 'canvas.fig input', budget);
  const magic = buffer.subarray(0, 8).toString('latin1');
  if (!magic.startsWith('fig-')) throw decodeError('FIG_MALFORMED', 'bad magic: ' + magic);

  let offset = 8;
  const version = buffer.readUInt32LE(offset);
  offset += 4;
  const chunks = [];
  while (offset < buffer.length) {
    if (buffer.length - offset < 4) {
      throw decodeError('FIG_MALFORMED', 'truncated chunk length at byte ' + offset);
    }
    const length = buffer.readUInt32LE(offset);
    offset += 4;
    if (length > budget.maxInputBytes) {
      throw new ConverterBudgetError('maxInputBytes', length, 'compressed canvas chunk', budget.maxInputBytes);
    }
    if (length > buffer.length - offset) {
      throw decodeError('FIG_MALFORMED', 'truncated chunk body at byte ' + offset);
    }
    if (chunks.length >= budget.maxCanvasChunks) {
      throw new ConverterBudgetError(
        'maxCanvasChunks',
        chunks.length + 1,
        'canvas chunk count',
        budget.maxCanvasChunks
      );
    }
    chunks.push(buffer.subarray(offset, offset + length));
    offset += length;
  }
  if (chunks.length < 2) throw decodeError('FIG_MALFORMED', 'canvas.fig must contain schema and data chunks');
  return { chunks, magic, version };
}

function decompressionError(label, reasons) {
  return decodeError('FIG_DECOMPRESSION_FAILED', 'could not decompress ' + label + ' — ' + reasons.join('; '));
}

function inflateBounded(buffer, label, deps, budget = CONVERTER_RESOURCE_BUDGET) {
  const options = { maxOutputLength: budget.maxDecompressedBytes };
  const codecs = [
    ['deflate-raw', deps.zlib.inflateRawSync],
    ['deflate', deps.zlib.inflateSync],
    ['zstd', deps.zlib.zstdDecompressSync],
  ].filter(([, codec]) => typeof codec === 'function');
  const reasons = [];
  for (const [name, codec] of codecs) {
    try {
      const output = codec(buffer, options);
      assertWithinBudget(output.length, 'maxDecompressedBytes', label, budget);
      return Buffer.from(output);
    } catch (error) {
      if (error instanceof ConverterBudgetError) throw error;
      reasons.push(name + ': ' + error.message);
    }
  }
  throw decompressionError(label, reasons);
}

function createTraversalState(budget = CONVERTER_RESOURCE_BUDGET) {
  return {
    budget,
    resultEstimate: 0,
    steps: 0,
    visit(depth, label) {
      if (depth > budget.maxGraphDepth) {
        throw new ConverterBudgetError('maxGraphDepth', depth, label, budget.maxGraphDepth);
      }
      this.steps++;
      if (this.steps > budget.maxTraversalSteps) {
        throw new ConverterBudgetError('maxTraversalSteps', this.steps, label, budget.maxTraversalSteps);
      }
    },
    reserveJson(value, label) {
      let estimate = 0;
      if (typeof value === 'string') estimate = value.length * 6 + 2;
      else if (typeof value === 'number') estimate = 32;
      else if (typeof value === 'boolean') estimate = 5;
      else if (value === null) estimate = 4;
      else if (value !== undefined) estimate = 2;
      const next = this.resultEstimate + estimate;
      if (next > budget.maxResultBytes) {
        throw new ConverterBudgetError('maxResultBytes', next, label, budget.maxResultBytes);
      }
      this.resultEstimate = next;
    },
  };
}

function sanitize(value, state, depth = 0) {
  state.visit(depth, 'decoded value depth');
  if (value instanceof Uint8Array) {
    const output = value.length === 20 ? Buffer.from(value).toString('hex') : '<bytes:' + value.length + '>';
    state.reserveJson(output, 'decoded binary value');
    return output;
  }
  if (Array.isArray(value)) {
    state.reserveJson([], 'decoded array');
    return value.map(item => sanitize(item, state, depth + 1));
  }
  if (value && typeof value === 'object') {
    state.reserveJson({}, 'decoded object');
    const output = {};
    for (const property of Object.keys(value)) {
      state.reserveJson(property, 'decoded property name');
      if (property === 'vectorData' || property === 'commandsBlob') {
        output[property] = '<geo>';
        state.reserveJson(output[property], 'decoded geometry marker');
        continue;
      }
      output[property] = sanitize(value[property], state, depth + 1);
    }
    return output;
  }
  state.reserveJson(value, 'decoded scalar value');
  return value;
}

function createBoundedText(label, budget = CONVERTER_RESOURCE_BUDGET) {
  const parts = [];
  let bytes = 0;
  return {
    append(value) {
      const text = String(value);
      const next = bytes + Buffer.byteLength(text);
      assertWithinBudget(next, 'maxResultBytes', label, budget);
      parts.push(text);
      bytes = next;
    },
    toString() {
      return parts.join('');
    },
  };
}

function boundedDisplayName(value, label, budget) {
  const text = typeof value === 'string' ? value : String(value || '');
  assertWithinBudget(text.length * 6 + 2, 'maxResultBytes', label, budget);
  return JSON.stringify(text);
}

function gid(guid, budget = CONVERTER_RESOURCE_BUDGET) {
  if (!guid) return null;
  const sessionID = String(guid.sessionID);
  const localID = String(guid.localID);
  assertWithinBudget(
    sessionID.length * 6 + localID.length * 6 + 3,
    'maxResultBytes',
    'decoded node identifier',
    budget
  );
  return sessionID + ':' + localID;
}

function boundedNodeChanges(message, budget = CONVERTER_RESOURCE_BUDGET) {
  const nodeChanges = message && message.nodeChanges;
  if (!Array.isArray(nodeChanges)) throw decodeError('FIG_MALFORMED', 'decoded message does not contain nodeChanges');
  if (nodeChanges.length > budget.maxGraphNodes) {
    throw new ConverterBudgetError('maxGraphNodes', nodeChanges.length, 'decoded nodeChanges', budget.maxGraphNodes);
  }
  return nodeChanges;
}

function summaryDepth(value, budget = CONVERTER_RESOURCE_BUDGET) {
  if (value == null || value === '') return 1;
  const depth = Number(value);
  if (!Number.isSafeInteger(depth) || depth < 0) {
    throw decodeError('FIG_SUMMARY_DEPTH_INVALID', 'maxDepth must be a non-negative integer');
  }
  if (depth > budget.maxGraphDepth) {
    throw new ConverterBudgetError('maxGraphDepth', depth, 'tree summary maxDepth', budget.maxGraphDepth);
  }
  return depth;
}

function buildTreeSummary(nodeChanges, budget = CONVERTER_RESOURCE_BUDGET, maxDepth = 1) {
  const summaryLimit = summaryDepth(maxDepth, budget);
  const state = createTraversalState(budget);
  const byId = new Map();
  const children = new Map();
  for (const node of nodeChanges) {
    state.visit(0, 'decoded node traversal');
    const id = gid(node.guid, budget);
    if (!id) throw decodeError('FIG_MALFORMED', 'node without a guid');
    byId.set(id, node);
    const parent = node.parentIndex ? gid(node.parentIndex.guid, budget) : null;
    if (parent) {
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push({ id, pos: node.parentIndex.position });
    }
  }
  for (const entries of children.values()) {
    entries.sort((left, right) => (left.pos < right.pos ? -1 : left.pos > right.pos ? 1 : 0));
  }

  const lines = [];
  const text = createBoundedText('tree.txt result', budget);
  const appendLine = line => {
    text.append(lines.length ? '\n' : '');
    text.append(line);
    lines.push(line);
  };
  const roots = nodeChanges.filter(node => !node.parentIndex).map(node => gid(node.guid, budget));
  for (const root of roots) {
    const rootNode = byId.get(root);
    const rootName = typeof rootNode.name === 'string' ? rootNode.name : String(rootNode.name || '');
    assertWithinBudget(rootName.length * 6, 'maxResultBytes', 'tree root name', budget);
    appendLine('ROOT [' + rootNode.type + '] ' + rootName + ' id=' + root);
    const stack = (children.get(root) || [])
      .slice()
      .reverse()
      .map(child => ({ depth: 0, id: child.id }));
    while (stack.length) {
      const current = stack.pop();
      state.visit(current.depth, 'decoded tree traversal');
      const node = byId.get(current.id);
      if (!node || node.visible === false) continue;
      const size = node.size ? Math.round(node.size.x) + 'x' + Math.round(node.size.y) : '';
      appendLine(
        '  '.repeat(current.depth) +
          '[' +
          (node.type || '?') +
          '] ' +
          boundedDisplayName(node.name, 'tree node name', budget) +
          ' ' +
          size +
          ' id=' +
          current.id
      );
      if (current.depth >= summaryLimit) continue;
      const descendants = children.get(current.id) || [];
      for (let index = descendants.length - 1; index >= 0; index--) {
        stack.push({ depth: current.depth + 1, id: descendants[index].id });
      }
    }
  }
  return { byId, children, lines, text: text.toString() };
}

function decodeCanvas(buffer, deps, budget = CONVERTER_RESOURCE_BUDGET, maxDepth = 1) {
  const parsed = parseFig(buffer, budget);
  const schemaBytes = inflateBounded(parsed.chunks[0], 'schema chunk', deps, budget);
  const dataBytes = inflateBounded(parsed.chunks[1], 'data chunk', deps, budget);
  let schema;
  let message;
  try {
    schema = deps.compileSchema(deps.decodeBinarySchema(schemaBytes));
    message = schema.decodeMessage(dataBytes);
  } catch (error) {
    throw decodeError('FIG_DECODE_FAILED', 'could not decode canvas message: ' + error.message);
  }
  const nodeChanges = boundedNodeChanges(message, budget);
  const tree = buildTreeSummary(nodeChanges, budget, maxDepth);
  const sanitizeState = createTraversalState(budget);
  const nodesText = createBoundedText('nodes.jsonl result', budget);
  for (const node of nodeChanges) {
    const output = sanitize(node, sanitizeState);
    sanitizeState.reserveJson('_id', 'decoded derived property name');
    output._id = gid(node.guid, budget);
    sanitizeState.reserveJson(output._id, 'decoded node identifier');
    sanitizeState.reserveJson('_parent', 'decoded derived property name');
    output._parent = node.parentIndex ? gid(node.parentIndex.guid, budget) : null;
    sanitizeState.reserveJson(output._parent, 'decoded parent identifier');
    nodesText.append(JSON.stringify(output));
    nodesText.append('\n');
  }
  const nodesJsonl = nodesText.toString();
  const treeText = tree.text;
  return { message, nodeChanges, nodesJsonl, parsed, treeText };
}

function main(argv = process.argv.slice(2), overrides = {}) {
  const deps = createDependencies(overrides);
  const directory = argv[0];
  if (typeof directory !== 'string' || !directory)
    throw decodeError('FIG_INPUT_UNREADABLE', 'usage: node decode.js <directory>');
  const input = deps.path.join(directory, 'canvas.fig');
  const decoded = decodeCanvas(readBoundedFile(input, deps), deps, CONVERTER_RESOURCE_BUDGET, summaryDepth(argv[1]));
  const nodesPath = deps.path.join(directory, 'nodes.jsonl');
  const treePath = deps.path.join(directory, 'tree.txt');
  writeFileAtomically(nodesPath, decoded.nodesJsonl, { fs: deps.fs, random: deps.random });
  writeFileAtomically(treePath, decoded.treeText, { fs: deps.fs, random: deps.random });
  deps.log(
    'magic',
    JSON.stringify(decoded.parsed.magic),
    'version',
    decoded.parsed.version,
    'chunks',
    decoded.parsed.chunks.map(chunk => chunk.length)
  );
  deps.log(
    'nodeChanges:',
    decoded.nodeChanges.length,
    'blobs:',
    decoded.message.blobs ? decoded.message.blobs.length : 0
  );
  deps.log('tree lines:', decoded.treeText ? decoded.treeText.split('\n').length : 0, '-> tree.txt, nodes.jsonl');
  return { nodesPath, treePath };
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  DecodeError,
  boundedNodeChanges,
  buildTreeSummary,
  createDependencies,
  createTraversalState,
  decodeCanvas,
  inflateBounded,
  main,
  parseFig,
  readBoundedFile,
  sanitize,
  summaryDepth,
};
