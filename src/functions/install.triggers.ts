'use strict';

const _notifyFunctionSql = (channel: string): string => `
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

const _tableTriggerSql = (tableName: string, pkColumn: string): string => `
CREATE OR REPLACE TRIGGER "${tableName}_owservable_notify"
AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION owservable_notify('${pkColumn}');`;

const installTriggers = async (orm: any, entities: any[], channel: string = 'owservable'): Promise<void> => {
	const connection: any = orm.em.getConnection();

	await connection.execute(_notifyFunctionSql(channel));

	for (const entity of entities) {
		const meta: any = orm.getMetadata().get(entity.name);
		const tableName: string = meta.tableName;
		const pkProperty: string = meta.primaryKeys[0];
		const pkColumn: string = meta.properties[pkProperty]?.fieldNames?.[0] ?? pkProperty;

		await connection.execute(_tableTriggerSql(tableName, pkColumn));
		console.log(`[@owservable/postgres] -> installTriggers: live updates enabled for table "${tableName}"`);
	}
};
export default installTriggers;
