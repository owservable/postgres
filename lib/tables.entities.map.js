'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class PostgresTablesEntitiesMap {
    static addTableToEntityMapping(tableName, entity) {
        PostgresTablesEntitiesMap._entities.set(tableName, entity);
    }
    static getEntityByTable(tableName) {
        var _a;
        return (_a = PostgresTablesEntitiesMap._entities.get(tableName)) !== null && _a !== void 0 ? _a : null;
    }
    static keys() {
        return Array.from(PostgresTablesEntitiesMap._entities.keys());
    }
    static values() {
        return Array.from(PostgresTablesEntitiesMap._entities.values());
    }
    static clear() {
        PostgresTablesEntitiesMap._entities.clear();
    }
    constructor() { }
}
PostgresTablesEntitiesMap._entities = new Map();
exports.default = PostgresTablesEntitiesMap;
//# sourceMappingURL=tables.entities.map.js.map