'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const postgresql_1 = require("@mikro-orm/postgresql");
const core_1 = require("@owservable/core");
const postgres_backend_1 = __importDefault(require("./postgres.backend"));
const postgres_listener_1 = __importDefault(require("./postgres.listener"));
const tables_entities_map_1 = __importDefault(require("./tables.entities.map"));
const install_triggers_1 = __importDefault(require("./functions/install.triggers"));
const live_updates_1 = require("./decorators/live.updates");
const SCHEMA_SYNC_LOCK_KEY = 776277001;
class PostgresConnector {
    static init(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (PostgresConnector._orm)
                return PostgresConnector._orm;
            const { entities, host, port, user, password, dbName, channel = 'owservable', updateSchema = true, safe = true, triggers = true, ormOptions = {} } = options;
            const orm = yield postgresql_1.MikroORM.init(Object.assign({ entities,
                host,
                port,
                user,
                password,
                dbName }, ormOptions));
            console.log('[@owservable/postgres] -> PostgreSQL connected to', `${host}:${port}/${dbName}`);
            if (updateSchema || triggers) {
                yield PostgresConnector._withSchemaLock({ host, port, user, password, database: dbName }, () => __awaiter(this, void 0, void 0, function* () {
                    if (updateSchema) {
                        yield orm.schema.updateSchema({ safe });
                        console.log('[@owservable/postgres] -> PostgreSQL schema synchronized', safe ? '(safe mode)' : '');
                    }
                    if (triggers) {
                        const liveEntities = entities.filter((entity) => live_updates_1.PostgresLiveUpdatesRegistry.has(entity));
                        yield (0, install_triggers_1.default)(orm, liveEntities, channel);
                    }
                }));
            }
            const listener = postgres_listener_1.default.init({ host, port, user, password, database: dbName }, channel);
            for (const entity of entities) {
                const meta = orm.getMetadata().get(entity.name);
                const tableName = meta.tableName;
                tables_entities_map_1.default.addTableToEntityMapping(tableName, entity);
                core_1.BackendRegistry.register(tableName, new postgres_backend_1.default(orm, entity, listener));
            }
            PostgresConnector._orm = orm;
            return orm;
        });
    }
    static get orm() {
        return PostgresConnector._orm;
    }
    static em() {
        var _a;
        return (_a = PostgresConnector._orm) === null || _a === void 0 ? void 0 : _a.em.fork();
    }
    static close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield postgres_listener_1.default.stop();
            if (PostgresConnector._orm) {
                yield PostgresConnector._orm.close();
                PostgresConnector._orm = null;
            }
        });
    }
    static _withSchemaLock(config, execute) {
        return __awaiter(this, void 0, void 0, function* () {
            const lockClient = new pg_1.Client(config);
            yield lockClient.connect();
            try {
                yield lockClient.query('SELECT pg_advisory_lock($1)', [SCHEMA_SYNC_LOCK_KEY]);
                yield execute();
            }
            finally {
                try {
                    yield lockClient.query('SELECT pg_advisory_unlock($1)', [SCHEMA_SYNC_LOCK_KEY]);
                }
                finally {
                    yield lockClient.end();
                }
            }
        });
    }
    constructor() { }
}
exports.default = PostgresConnector;
//# sourceMappingURL=postgres.connector.js.map