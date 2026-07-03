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
const lodash_1 = require("lodash");
const observable_tables_map_1 = __importDefault(require("./functions/observable.tables.map"));
class PostgresBackend {
    constructor(orm, entity, listener) {
        this._orm = orm;
        this._entity = entity;
        this._listener = listener;
        const meta = orm.getMetadata().get(entity.name);
        this._tableName = meta.tableName;
        this._pkProperty = meta.primaryKeys[0];
    }
    target() {
        return this._tableName;
    }
    changes() {
        return this._observableTable();
    }
    find(query, fields, paging, sort, populates) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                fields: this._translateFields(fields),
                orderBy: this._translateSort(sort),
                offset: paging === null || paging === void 0 ? void 0 : paging.skip,
                limit: paging === null || paging === void 0 ? void 0 : paging.limit,
                populate: this._translatePopulates(populates)
            };
            const em = this._orm.em.fork();
            const entities = yield em.find(this._entity, this._translateQuery(query), options);
            return entities.map((entity) => this._toObject(entity));
        });
    }
    findOne(query, fields, populates) {
        return __awaiter(this, void 0, void 0, function* () {
            const em = this._orm.em.fork();
            const entity = yield em.findOne(this._entity, this._translateQuery(query), {
                fields: this._translateFields(fields),
                populate: this._translatePopulates(populates)
            });
            return entity ? this._toObject(entity) : entity;
        });
    }
    findById(id, fields, populates) {
        return __awaiter(this, void 0, void 0, function* () {
            const observableTable = this._observableTable();
            return this.findOne({ [this._pkProperty]: observableTable.coercePrimaryKey(id) }, fields, populates);
        });
    }
    count(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const em = this._orm.em.fork();
            return em.count(this._entity, this._translateQuery(query));
        });
    }
    populate(document, _populate) {
        return __awaiter(this, void 0, void 0, function* () {
            return document;
        });
    }
    toJSON(document) {
        return document;
    }
    resolveVirtuals(document, virtuals) {
        return __awaiter(this, void 0, void 0, function* () {
            const replacement = (0, lodash_1.cloneDeep)((0, lodash_1.omit)(document, virtuals));
            for (const virtual of virtuals) {
                replacement[virtual] = yield Promise.resolve(document[virtual]);
            }
            return replacement;
        });
    }
    get entity() {
        return this._entity;
    }
    _observableTable() {
        return observable_tables_map_1.default.get(this._orm, this._entity, this._listener);
    }
    _toObject(entity) {
        const { wrap } = require('@mikro-orm/core');
        return wrap(entity).toObject();
    }
    _translateQuery(query) {
        if (!query || (0, lodash_1.isString)(query))
            return query;
        if ((0, lodash_1.isArray)(query))
            return query.map((entry) => this._translateQuery(entry));
        const translated = {};
        (0, lodash_1.each)((0, lodash_1.keys)(query), (key) => {
            const value = query[key];
            if ('_id' === key)
                translated[this._pkProperty] = value;
            else if ('$and' === key || '$or' === key || '$nor' === key)
                translated[key] = this._translateQuery(value);
            else
                translated[key] = value;
        });
        return translated;
    }
    _translateSort(sort) {
        if ((0, lodash_1.isEmpty)(sort))
            return undefined;
        const orderBy = {};
        (0, lodash_1.each)((0, lodash_1.keys)(sort), (key) => {
            const direction = sort[key];
            orderBy[key] = -1 === direction || 'desc' === direction ? 'desc' : 'asc';
        });
        return orderBy;
    }
    _translateFields(fields) {
        if ((0, lodash_1.isEmpty)(fields))
            return undefined;
        if ((0, lodash_1.isArray)(fields))
            return fields;
        const included = (0, lodash_1.keys)(fields).filter((key) => !!fields[key]);
        return (0, lodash_1.isEmpty)(included) ? undefined : included;
    }
    _translatePopulates(populates) {
        if ((0, lodash_1.isEmpty)(populates))
            return undefined;
        const paths = populates
            .map((populate) => ((0, lodash_1.isString)(populate) ? populate : populate === null || populate === void 0 ? void 0 : populate.path))
            .filter(Boolean);
        return (0, lodash_1.isEmpty)(paths) ? undefined : paths;
    }
}
exports.default = PostgresBackend;
//# sourceMappingURL=postgres.backend.js.map