'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const lodash_1 = require("lodash");
const folders_1 = require("@owservable/folders");
const _processFile = (folder, file, entities) => {
    const fullPath = path.join(folder, file);
    const entity = require(fullPath).default;
    if (!entity)
        throw new Error(`Entity not found in ${folder}/${file}`);
    entities.push(entity);
};
const _isExcluded = (folder, exclude) => {
    if (!exclude)
        return false;
    return (0, lodash_1.isString)(exclude)
        ? (0, lodash_1.endsWith)(folder, exclude)
        : !!(0, lodash_1.find)(exclude, (e) => (0, lodash_1.endsWith)(folder, e));
};
const _processEntities = (folder, entities, exclude) => {
    if (_isExcluded(folder, exclude))
        return;
    const subfolderNames = fs.readdirSync(folder);
    const itemStats = subfolderNames.map((fileName) => {
        const fullPath = path.join(folder, fileName);
        const stat = fs.lstatSync(fullPath);
        return {
            name: fileName,
            fullPath,
            isDirectory: stat.isDirectory()
        };
    });
    const files = itemStats.filter((item) => !item.isDirectory);
    const folders = itemStats.filter((item) => item.isDirectory);
    files.forEach((file) => {
        const ext = path.extname(file.name);
        if (ext !== '.ts' && ext !== '.js')
            return;
        _processFile(folder, file.name, entities);
    });
    folders.forEach((subFolder) => _processEntities(subFolder.fullPath, entities, exclude));
};
const processEntities = (root, name = 'entities', exclude) => {
    const entities = [];
    const folders = (0, folders_1.listSubfoldersByName)(root, name);
    folders.forEach((folder) => _processEntities(folder, entities, exclude));
    return entities;
};
exports.default = processEntities;
//# sourceMappingURL=process.entities.js.map