const allowedFiles = ['src/tickets/build-ticket-request.ts','src/tickets/present-ticket.ts'];
function parseResponse(text) {
  const normalized = text.replace(/\r\n?/g,'\n').trim();
  const fenced = normalized.match(/^```json\s*\n([\s\S]*?)\n```$/);
  const value = JSON.parse(fenced ? fenced[1] : normalized);
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).sort().join(',') !== 'files,notes' || typeof value.notes !== 'string') throw new Error('Expected JSON files and notes');
  if (!value.files || Array.isArray(value.files) || typeof value.files !== 'object' ||
      Object.keys(value.files).sort().join(',') !== [...allowedFiles].sort().join(',')) throw new Error('Response must contain exactly the two allowed files');
  for (const [name,source] of Object.entries(value.files)) {
    if (typeof source !== 'string' || !source.trim() || source.includes('\0')) throw new Error('Invalid source: '+name);
    value.files[name] = source.replace(/\r\n?/g,'\n');
  }
  return value;
}
module.exports = {allowedFiles,parseResponse};
