const Module = require('node:module');
const path = require('node:path');
const original = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...args) {
 if (request.startsWith('@/')) request = path.join(__dirname, '../scratch/other-register-tests/src', request.slice(2));
 return original.call(this, request, parent, ...args);
};
