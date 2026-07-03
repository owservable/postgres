'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const observable_table_1 = __importDefault(require("./observable.table"));
class ObservableTablesMap {
    static init() {
        if (!ObservableTablesMap._instance)
            ObservableTablesMap._instance = new ObservableTablesMap();
        return ObservableTablesMap._instance;
    }
    static get(orm, entity, listener) {
        const instance = ObservableTablesMap.init();
        const map = instance._map;
        const meta = orm.getMetadata().get(entity.name);
        const tableName = meta.tableName;
        if (!map.get(tableName))
            map.set(tableName, new observable_table_1.default(orm, entity, listener));
        return map.get(tableName);
    }
    static clear() {
        if (ObservableTablesMap._instance)
            ObservableTablesMap._instance._map.clear();
    }
    constructor() {
        this._map = new Map();
    }
}
exports.default = ObservableTablesMap;
//# sourceMappingURL=observable.tables.map.js.map