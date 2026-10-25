const Module = require('node:module');
const path = require('node:path');
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
 if (request.startsWith('@/')) request = path.join(process.cwd(), 'scratch/exporter-tests/src', request.slice(2));
 return original.call(this, request, parent, ...rest);
};
