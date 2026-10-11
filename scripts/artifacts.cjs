const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
function writeText(filename, text) {
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  fs.writeFileSync(filename, text.replace(/\r\n?/g, '\n'), 'utf8');
  return fs.readFileSync(filename);
}
function writeJson(filename, value) { return writeText(filename, JSON.stringify(value, null, 2) + '\n'); }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function metrics(filename) {
  const saved = fs.readFileSync(filename);
  return {bytes: saved.length, characters: [...saved.toString('utf8')].length, sha256: sha256(saved)};
}
module.exports = {writeText, writeJson, sha256, metrics};
