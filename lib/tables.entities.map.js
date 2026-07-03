'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class TablesEntitiesMap {
    static addTableToEntityMapping(tableName, entity) {
        TablesEntitiesMap._entities.set(tableName, entity);
    }
    static getEntityByTable(tableName) {
        var _a;
        return (_a = TablesEntitiesMap._entities.get(tableName)) !== null && _a !== void 0 ? _a : null;
    }
    static keys() {
        return Array.from(TablesEntitiesMap._entities.keys());
    }
    static values() {
        return Array.from(TablesEntitiesMap._entities.values());
    }
    static clear() {
        TablesEntitiesMap._entities.clear();
    }
    constructor() { }
}
TablesEntitiesMap._entities = new Map();
exports.default = TablesEntitiesMap;
//# sourceMappingURL=tables.entities.map.js.map