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
const _notifyFunctionSql = (channel) => `
CREATE OR REPLACE FUNCTION owservable_notify() RETURNS trigger AS $$
DECLARE
	pk_column text := TG_ARGV[0];
	pk_value text;
	changed text[];
BEGIN
	IF TG_OP = 'DELETE' THEN
		pk_value := to_jsonb(OLD) ->> pk_column;
	ELSE
		pk_value := to_jsonb(NEW) ->> pk_column;
	END IF;

	IF TG_OP = 'UPDATE' THEN
		SELECT array_agg(o.key) INTO changed
		FROM jsonb_each(to_jsonb(OLD)) o
		JOIN jsonb_each(to_jsonb(NEW)) n ON o.key = n.key
		WHERE o.value IS DISTINCT FROM n.value;
	END IF;

	PERFORM pg_notify(
		'${channel}',
		json_build_object('table', TG_TABLE_NAME, 'op', lower(TG_OP), 'id', pk_value, 'changed', changed)::text
	);
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;`;
const _tableTriggerSql = (tableName, pkColumn) => `
CREATE OR REPLACE TRIGGER "${tableName}_owservable_notify"
AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION owservable_notify('${pkColumn}');`;
const installTriggers = (orm_1, entities_1, ...args_1) => __awaiter(void 0, [orm_1, entities_1, ...args_1], void 0, function* (orm, entities, channel = 'owservable') {
    var _a, _b, _c;
    const connection = orm.em.getConnection();
    yield connection.execute(_notifyFunctionSql(channel));
    for (const entity of entities) {
        const meta = orm.getMetadata().get(entity.name);
        const tableName = meta.tableName;
        const pkProperty = meta.primaryKeys[0];
        const pkColumn = (_c = (_b = (_a = meta.properties[pkProperty]) === null || _a === void 0 ? void 0 : _a.fieldNames) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : pkProperty;
        yield connection.execute(_tableTriggerSql(tableName, pkColumn));
        console.log(`[@owservable/postgres] -> installTriggers: live updates enabled for table "${tableName}"`);
    }
});
exports.default = installTriggers;
//# sourceMappingURL=install.triggers.js.map