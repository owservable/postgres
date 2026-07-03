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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEntities = exports.installTriggers = exports.ObservableTablesMap = exports.ObservableTable = exports.LiveUpdatesRegistry = exports.LiveUpdates = exports.TablesEntitiesMap = exports.PostgresListener = exports.PostgresConnector = exports.PostgresBackend = void 0;
const postgres_backend_1 = __importDefault(require("./postgres.backend"));
exports.PostgresBackend = postgres_backend_1.default;
const postgres_connector_1 = __importDefault(require("./postgres.connector"));
exports.PostgresConnector = postgres_connector_1.default;
const postgres_listener_1 = __importDefault(require("./postgres.listener"));
exports.PostgresListener = postgres_listener_1.default;
const tables_entities_map_1 = __importDefault(require("./tables.entities.map"));
exports.TablesEntitiesMap = tables_entities_map_1.default;
const live_updates_1 = __importStar(require("./decorators/live.updates"));
exports.LiveUpdates = live_updates_1.default;
Object.defineProperty(exports, "LiveUpdatesRegistry", { enumerable: true, get: function () { return live_updates_1.LiveUpdatesRegistry; } });
const observable_table_1 = __importDefault(require("./functions/observable.table"));
exports.ObservableTable = observable_table_1.default;
const observable_tables_map_1 = __importDefault(require("./functions/observable.tables.map"));
exports.ObservableTablesMap = observable_tables_map_1.default;
const install_triggers_1 = __importDefault(require("./functions/install.triggers"));
exports.installTriggers = install_triggers_1.default;
const process_entities_1 = __importDefault(require("./functions/process.entities"));
exports.processEntities = process_entities_1.default;
const OwservablePostgres = {};
exports.default = OwservablePostgres;
//# sourceMappingURL=owservable.postgres.js.map