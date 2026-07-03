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
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
class PostgresObservableTable extends rxjs_1.Subject {
    constructor(orm, entity, listener) {
        var _a;
        super();
        this._orm = orm;
        this._entity = entity;
        const meta = orm.getMetadata().get(entity.name);
        this._tableName = meta.tableName;
        this._pkProperty = meta.primaryKeys[0];
        const pkProp = meta.properties[this._pkProperty];
        this._pkIsNumeric = ['number', 'integer', 'bigint', 'smallint', 'float', 'double', 'decimal'].includes(String((_a = pkProp === null || pkProp === void 0 ? void 0 : pkProp.type) !== null && _a !== void 0 ? _a : '').toLowerCase());
        this._columnsToProperties = new Map();
        (0, lodash_1.each)(meta.props, (prop) => {
            var _a;
            (0, lodash_1.each)((_a = prop.fieldNames) !== null && _a !== void 0 ? _a : [], (fieldName) => {
                this._columnsToProperties.set(fieldName, prop.name);
            });
        });
        listener.notifications
            .pipe((0, operators_1.filter)((notification) => (notification === null || notification === void 0 ? void 0 : notification.table) === this._tableName))
            .subscribe({
            next: (notification) => {
                this._process(notification)
                    .then(() => null)
                    .catch((error) => {
                    console.error(`[@owservable/postgres] -> PostgresObservableTable[${this._tableName}] Error processing notification:`, { notification, error });
                });
            }
        });
        listener.lifecycle
            .pipe((0, operators_1.filter)((event) => 'live' === (event === null || event === void 0 ? void 0 : event.type)))
            .pipe((0, operators_1.skip)(1))
            .subscribe({
            next: () => this.next({})
        });
    }
    get tableName() {
        return this._tableName;
    }
    get pkProperty() {
        return this._pkProperty;
    }
    coercePrimaryKey(id) {
        return this._pkIsNumeric ? Number(id) : id;
    }
    _process(notification) {
        return __awaiter(this, void 0, void 0, function* () {
            const { op: operationType, id, changed } = notification;
            const ns = { coll: this._tableName };
            const documentKey = { _id: id };
            if ('delete' === operationType) {
                return this.next({ ns, documentKey, operationType });
            }
            const em = this._orm.em.fork();
            const entity = yield em.findOne(this._entity, { [this._pkProperty]: this.coercePrimaryKey(id) });
            if (!entity) {
                return this.next({ ns, documentKey, operationType });
            }
            const { wrap } = require('@mikro-orm/core');
            const fullDocument = wrap(entity).toObject();
            let updateDescription;
            if ('update' === operationType) {
                const updatedFields = {};
                (0, lodash_1.each)(changed !== null && changed !== void 0 ? changed : [], (column) => {
                    var _a;
                    const property = (_a = this._columnsToProperties.get(column)) !== null && _a !== void 0 ? _a : column;
                    updatedFields[property] = (0, lodash_1.get)(fullDocument, property, true);
                });
                updateDescription = { updatedFields, removedFields: [] };
            }
            this.next({ ns, documentKey, operationType, updateDescription, fullDocument });
        });
    }
}
exports.default = PostgresObservableTable;
//# sourceMappingURL=observable.table.js.map