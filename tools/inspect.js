// Inspect nodes.jsonl: instance children?, fonts, colors, sample node props.
'use strict';

const fs = require('fs');

// Split ONLY on raw \n bytes — Figma text contains characters that confuse
// readline. Keeping this as a seam lets the executable use the real filesystem
// while tests exercise hostile local fixtures without a .fig export.
function* jsonlLines(file, overrides = {}) {
  const filesystem = overrides.fs || fs;
  const buffer = filesystem.readFileSync(file);
  let start = 0;
  for (let index = 0; index <= buffer.length; index++) {
    if (index === buffer.length || buffer[index] === 10) {
      if (index > start) yield buffer.subarray(start, index).toString('utf8');
      start = index + 1;
    }
  }
}

function rankedEntries(values, limit) {
  return Object.entries(values)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}

function inspectNodes(directory, overrides = {}) {
  if (typeof directory !== 'string' || !directory) throw new TypeError('directory is required');
  const path = (overrides.path || require('path')).join(directory, 'nodes.jsonl');
  const byId = new Map();
  for (const line of jsonlLines(path, overrides)) {
    const node = JSON.parse(line);
    byId.set(node._id, node);
  }

  const types = {};
  const fonts = {};
  const colors = {};
  const children = new Map();
  let instances = 0;
  let instancesWithChildren = 0;
  for (const node of byId.values()) {
    types[node.type] = (types[node.type] || 0) + 1;
    if (node._parent) children.set(node._parent, (children.get(node._parent) || 0) + 1);
  }
  for (const node of byId.values()) {
    if (node.type === 'INSTANCE') {
      instances++;
      if (children.get(node._id)) instancesWithChildren++;
    }
    if (node.fontName) {
      const font = `${node.fontName.family} / ${node.fontName.style}`;
      fonts[font] = (fonts[font] || 0) + 1;
    }
    for (const paint of node.fillPaints || []) {
      if (paint.type === 'SOLID' && paint.color && paint.visible !== false) {
        const color = paint.color;
        const hex =
          '#' +
          [color.r, color.g, color.b]
            .map(value =>
              Math.round(value * 255)
                .toString(16)
                .padStart(2, '0')
            )
            .join('');
        colors[hex] = (colors[hex] || 0) + 1;
      }
    }
  }

  const sample = predicate => {
    for (const node of byId.values()) if (predicate(node)) return node;
    return null;
  };
  return {
    colors: rankedEntries(colors, 30),
    fonts: rankedEntries(fonts, 15),
    instances,
    instancesWithChildren,
    samples: {
      text: sample(node => node.type === 'TEXT' && node.characters && node.characters.length > 5),
      instance: sample(node => node.type === 'INSTANCE'),
      autolayoutFrame: sample(node => node.type === 'FRAME' && node.stackMode && node.stackMode !== 'NONE'),
      imageFill: sample(node => (node.fillPaints || []).some(paint => paint.type === 'IMAGE')),
    },
    types: rankedEntries(types, Infinity),
  };
}

function inspectionLines(result) {
  const lines = [
    '== types ==',
    result.types.map(([type, count]) => `${type}:${count}`).join(' '),
    `== instances: ${result.instances}, with children in tree: ${result.instancesWithChildren}`,
    '== fonts ==',
    ...result.fonts.map(([font, count]) => `  ${count}\t${font}`),
    '== top solid colors ==',
    ...result.colors.map(([color, count]) => `  ${count}\t${color}`),
  ];
  const sampleLabels = {
    autolayoutFrame: 'AUTOLAYOUT FRAME',
    imageFill: 'IMAGE FILL',
    instance: 'INSTANCE',
    text: 'TEXT',
  };
  for (const [key, node] of Object.entries(result.samples)) {
    if (node) {
      lines.push(`== sample ${sampleLabels[key]} ==`);
      lines.push(JSON.stringify(node).slice(0, 1500));
    }
  }
  return lines;
}

function main(argv = process.argv.slice(2), overrides = {}) {
  const log = overrides.log || console.log;
  const result = inspectNodes(argv[0], overrides);
  for (const line of inspectionLines(result)) log(line);
  return result;
}

if (require.main === module) main();

module.exports = {
  inspectionLines,
  inspectNodes,
  jsonlLines,
  main,
  rankedEntries,
};
