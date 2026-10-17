'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadPrivateSourceInventory(root) {
  const file = path.join(root, '.qa-state', 'ir2026', 'source-inventory.local.json');
  if (!fs.existsSync(file)) throw new Error('private local source inventory is unavailable');
  const inventory = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(inventory.SOURCES)) throw new Error('private local source inventory is invalid');
  return inventory;
}

module.exports = { loadPrivateSourceInventory };