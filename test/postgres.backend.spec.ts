'use strict';

import {ReplaySubject, Subject} from 'rxjs';

import {wrap} from '@mikro-orm/core';

import PostgresBackend from '../src/postgres.backend';
import PostgresObservableTable from '../src/functions/observable.table';
import PostgresObservableTablesMap from '../src/functions/observable.tables.map';
import {UntranslatableQueryError} from '../src/functions/translate.query';

jest.mock('@mikro-orm/core', () => ({wrap: jest.fn(), raw: jest.fn((sql: string): any => Symbol(sql))}));

class UserEntity {}

describe('postgres.backend tests', () => {
	let em: any;
	let orm: any;
	let listener: any;
	let backend: PostgresBackend;

	const meta: any = {
		tableName: 'users',
		primaryKeys: ['id'],
		properties: {
			id: {type: 'number', fieldNames: ['id']},
			name: {type: 'string', fieldNames: ['name']},
			amount: {type: 'number', fieldNames: ['amount']}
		},
		props: [{name: 'id', fieldNames: ['id']}]
	};

	beforeEach(() => {
		PostgresObservableTablesMap.clear();
		em = {find: jest.fn(), findOne: jest.fn(), count: jest.fn()};
		orm = {getMetadata: (): any => ({get: (): any => meta}), em: {fork: jest.fn((): any => em)}};
		listener = {notifications: new Subject<any>(), lifecycle: new ReplaySubject<any>(1)};
		backend = new PostgresBackend(orm, UserEntity, listener);
		(wrap as any).mockImplementation((entity: any): any => ({toObject: (): any => ({...entity, mapped: true})}));
	});

	it('should expose the target table and entity', () => {
		expect(backend.target()).toBe('users');
		expect(backend.entity).toBe(UserEntity);
	});

	it('should return the same observable table from changes', () => {
		const changes: any = backend.changes();
		expect(changes).toBeInstanceOf(PostgresObservableTable);
		expect(backend.changes()).toBe(changes);
	});

	it('should find entities translating query, fields, paging, sort and populates', async () => {
		em.find.mockResolvedValue([{id: 1}, {id: 2}]);

		const result: any[] = await backend.find(
			{_id: 7, name: 'x', $and: [{_id: '3'}], $or: [{y: 1}], $nor: [{z: 2}]},
			{name: 1, secret: 0},
			{skip: 5, limit: 10},
			{a: 1, b: -1, c: 'desc', d: 'asc'},
			['rel', {path: 'other'}, {foo: 1}, null]
		);

		expect(em.find).toHaveBeenCalledWith(
			UserEntity,
			{id: 7, name: 'x', $and: [{id: '3'}], $or: [{y: 1}], $nor: [{z: 2}]},
			{
				fields: ['name'],
				orderBy: [{a: 'asc'}, {b: 'desc'}, {c: 'desc'}, {d: 'asc'}],
				offset: 5,
				limit: 10,
				populate: ['rel', 'other']
			}
		);
		expect(result).toEqual([
			{id: 1, mapped: true},
			{id: 2, mapped: true}
		]);
	});

	it('should translate $regex conditions into $re with inline case-insensitive flags', async () => {
		em.find.mockResolvedValue([]);

		await backend.find({name: {$regex: '^Jo', $options: 'i'}, note: {$regex: 'x$'}}, null, null, null, null);

		expect(em.find).toHaveBeenCalledWith(UserEntity, {name: {$re: '(?i)^Jo'}, note: {$re: 'x$'}}, expect.anything());
	});

	it('should decode PCRE hex escapes into postgres-safe literals', async () => {
		em.find.mockResolvedValue([]);

		await backend.find({name: {$regex: 'row\\x2dtwo\\x61\\x24', $options: 'i'}}, null, null, null, null);

		expect(em.find).toHaveBeenCalledWith(UserEntity, {name: {$re: '(?i)row\\-twoa\\$'}}, expect.anything());
	});

	it('should translate $expr regexMatch into a cast-to-text regex condition', async () => {
		em.find.mockResolvedValue([]);

		await backend.find({$or: [{$expr: {$regexMatch: {input: {$toString: '$amount'}, regex: '7'}}}, {name: {$regex: '7', $options: 'i'}}]}, null, null, null, null);

		const where: any = em.find.mock.calls[0][1];
		expect(where.$or).toHaveLength(2);

		const [castBranch, nameBranch] = where.$or;
		const castKeys: any[] = Reflect.ownKeys(castBranch);
		expect(castKeys).toHaveLength(1);
		expect(String(castKeys[0].description ?? castKeys[0])).toContain('cast("amount" as text)');
		expect(castBranch[castKeys[0]]).toEqual({$re: '7'});
		expect(nameBranch).toEqual({name: {$re: '(?i)7'}});
	});

	it('should match nothing when no $or branch is translatable', async () => {
		em.find.mockResolvedValue([]);

		await backend.find({$or: [{$expr: {$regexMatch: {input: {$toString: 'amount'}, regex: '7'}}}]}, null, null, null, null);

		expect(em.find).toHaveBeenCalledWith(UserEntity, {id: {$in: []}}, expect.anything());
	});

	it('should drop untranslatable $expr branches instead of passing them through', async () => {
		em.find.mockResolvedValue([]);

		await backend.find(
			{$or: [{$expr: null}, {$expr: {$unknownOp: 1}}, {$expr: {$regexMatch: {input: {$toString: '$ghost'}, regex: '7'}}}, {name: {$regex: 'a', $options: 'i'}}]},
			null,
			null,
			null,
			null
		);

		expect(em.find).toHaveBeenCalledWith(UserEntity, {$or: [{name: {$re: '(?i)a'}}]}, expect.anything());
	});

	it('should keep native operators', async () => {
		em.count.mockResolvedValue(0);

		await backend.count({age: {$gte: 5, $lte: 9}, tags: {$in: ['a', 'b']}, active: true, createdAt: new Date(0)});

		expect(em.count).toHaveBeenCalledWith(UserEntity, {age: {$gte: 5, $lte: 9}, tags: {$in: ['a', 'b']}, active: true, createdAt: new Date(0)});
	});

	it('should reject mongo-only conditions instead of dropping them', async () => {
		await expect(backend.count({ghost: {$type: 'string'}})).rejects.toThrow(UntranslatableQueryError);
		expect(em.count).not.toHaveBeenCalled();
	});

	it('should translate operator conditions nested in logical branches and on _id', async () => {
		em.find.mockResolvedValue([]);

		await backend.find({$or: [{name: {$regex: 'a', $options: 'i'}}, {_id: {$in: [1, 2]}}]}, null, null, null, null);

		expect(em.find).toHaveBeenCalledWith(UserEntity, {$or: [{name: {$re: '(?i)a'}}, {id: {$in: [1, 2]}}]}, expect.anything());
	});

	it('should select distinct attribute values with a translated query', async () => {
		const qb: any = {};
		qb.select = jest.fn((): any => qb);
		qb.where = jest.fn((): any => qb);
		qb.execute = jest.fn().mockResolvedValue([{name: 'a'}, {name: 'b'}, {name: null}]);
		em.createQueryBuilder = jest.fn((): any => qb);

		const values: any[] = await backend.distinct('name', {name: {$regex: 'a', $options: 'i'}});

		expect(em.createQueryBuilder).toHaveBeenCalledWith(UserEntity);
		expect(qb.select).toHaveBeenCalledWith(['name'], true);
		expect(qb.where).toHaveBeenCalledWith({name: {$re: '(?i)a'}});
		expect(values).toEqual(['a', 'b', null]);
	});

	it('should select distinct attribute values without a query', async () => {
		const qb: any = {};
		qb.select = jest.fn((): any => qb);
		qb.where = jest.fn((): any => qb);
		qb.execute = jest.fn().mockResolvedValue([{name: 'a'}]);
		em.createQueryBuilder = jest.fn((): any => qb);

		const values: any[] = await backend.distinct('name');

		expect(qb.where).toHaveBeenCalledWith({});
		expect(values).toEqual(['a']);
	});

	describe('sort translation', () => {
		const orderByFor = async (sort: any): Promise<any> => {
			em.find.mockResolvedValue([]);
			await backend.find({}, {}, undefined, sort, []);
			return em.find.mock.calls.at(-1)[2].orderBy;
		};

		it.each([undefined, null, {}])('should return undefined for empty sort %p', async (sort: any) => {
			expect(await orderByFor(sort)).toBeUndefined();
		});

		it.each([[['a']], ['a'], [1], [true]])('should return undefined for non-object sort %p', async (sort: any) => {
			expect(await orderByFor(sort)).toBeUndefined();
		});

		it.each([
			[1, 'asc'],
			['asc', 'asc'],
			['ASC', 'asc'],
			[-1, 'desc'],
			['-1', 'desc'],
			['desc', 'desc'],
			['DESC', 'desc'],
			['descending', 'desc'],
			['Descending', 'desc'],
			[0, 'asc'],
			[null, 'asc'],
			[undefined, 'asc'],
			['sideways', 'asc']
		])('should translate direction %p to %p', async (direction: any, expected: string) => {
			expect(await orderByFor({a: direction})).toEqual([{a: expected}]);
		});

		it('should keep the sort key order as priority', async () => {
			expect(await orderByFor({c: 1, a: -1, b: 1})).toEqual([{c: 'asc'}, {a: 'desc'}, {b: 'asc'}]);
		});

		it('should translate dotted keys into nested entries, one per key', async () => {
			expect(await orderByFor({'contact_person.first_name': 1, 'contact_person.last_name': -1, 'type_id.name.sr_latn': 'desc', code: 1})).toEqual([
				{contact_person: {first_name: 'asc'}},
				{contact_person: {last_name: 'desc'}},
				{type_id: {name: {sr_latn: 'desc'}}},
				{code: 'asc'}
			]);
		});

		it('should keep both entries when a flat key is a prefix of a dotted key', async () => {
			expect(await orderByFor({contact_person: 1, 'contact_person.first_name': -1})).toEqual([{contact_person: 'asc'}, {contact_person: {first_name: 'desc'}}]);
		});

		it('should keep both entries when a dotted key comes before its flat prefix', async () => {
			expect(await orderByFor({'contact_person.first_name': -1, contact_person: 1})).toEqual([{contact_person: {first_name: 'desc'}}, {contact_person: 'asc'}]);
		});

		it('should keep numeric path segments as object keys, not arrays', async () => {
			const orderBy: any = await orderByFor({'items.0.name': 1});
			expect(orderBy).toEqual([{items: {'0': {name: 'asc'}}}]);
			expect(Array.isArray(orderBy[0].items)).toBe(false);
		});

		it('should treat brackets in a key literally', async () => {
			expect(await orderByFor({'a[0].b': 1})).toEqual([{'a[0]': {b: 'asc'}}]);
		});

		it('should ignore empty path segments', async () => {
			expect(await orderByFor({'a..b': 1, '.c': -1, 'd.': 1})).toEqual([{a: {b: 'asc'}}, {c: 'desc'}, {d: 'asc'}]);
		});

		it('should drop keys without any path segment', async () => {
			expect(await orderByFor({'.': 1, '..': -1, '': 1})).toBeUndefined();
			expect(await orderByFor({'.': 1, a: -1})).toEqual([{a: 'desc'}]);
		});

		it.each(['__proto__.polluted', 'constructor.prototype.polluted', 'prototype.polluted', 'a.__proto__.polluted', 'a.constructor'])(
			'should drop unsafe key %p without polluting prototypes',
			async (key: string) => {
				expect(await orderByFor({[key]: 1, safe: 1})).toEqual([{safe: 'asc'}]);
				expect(({} as any).polluted).toBeUndefined();
				expect((Object.prototype as any).polluted).toBeUndefined();
			}
		);
	});

	it('should find entities with empty options translated to undefined', async () => {
		em.find.mockResolvedValue([]);

		const result: any[] = await backend.find(null, {}, undefined, {}, []);

		expect(em.find).toHaveBeenCalledWith(UserEntity, null, {
			fields: undefined,
			orderBy: undefined,
			offset: undefined,
			limit: undefined,
			populate: undefined
		});
		expect(result).toEqual([]);
	});

	it('should pass field arrays through untouched', async () => {
		em.find.mockResolvedValue([]);

		await backend.find(null, ['a', 'b'], null, null, null);

		expect(em.find).toHaveBeenCalledWith(UserEntity, null, {
			fields: ['a', 'b'],
			orderBy: undefined,
			offset: undefined,
			limit: undefined,
			populate: undefined
		});
	});

	it('should translate all-excluded field projections to undefined', async () => {
		em.find.mockResolvedValue([]);

		await backend.find(null, {a: 0, b: 0}, null, null, [{foo: 1}, null]);

		expect(em.find).toHaveBeenCalledWith(UserEntity, null, {
			fields: undefined,
			orderBy: undefined,
			offset: undefined,
			limit: undefined,
			populate: undefined
		});
	});

	it('should find one entity and map it', async () => {
		em.findOne.mockResolvedValue({id: 9});

		const result: any = await backend.findOne({_id: 9}, {a: 1}, ['p']);

		expect(em.findOne).toHaveBeenCalledWith(UserEntity, {id: 9}, {fields: ['a'], populate: ['p']});
		expect(result).toEqual({id: 9, mapped: true});
	});

	it('should pass through a null findOne result', async () => {
		em.findOne.mockResolvedValue(null);

		const result: any = await backend.findOne({name: 'x'}, {}, []);

		expect(result).toBeNull();
	});

	it('should find by id with a coerced primary key', async () => {
		em.findOne.mockResolvedValue({id: 5});

		const result: any = await backend.findById('5', {}, []);

		expect(em.findOne).toHaveBeenCalledWith(UserEntity, {id: 5}, {fields: undefined, populate: undefined});
		expect(result).toEqual({id: 5, mapped: true});
	});

	it('should count entities passing string queries through', async () => {
		em.count.mockResolvedValue(3);

		const result: number = await backend.count('raw query');

		expect(em.count).toHaveBeenCalledWith(UserEntity, 'raw query');
		expect(result).toBe(3);
	});

	it('should return the document as-is from populate and toJSON', async () => {
		const document: any = {id: 1};
		await expect(backend.populate(document, 'anything')).resolves.toBe(document);
		expect(backend.toJSON(document)).toBe(document);
	});

	it('should resolve virtuals into a clone of the document', async () => {
		const document: any = {keep: 1, v1: Promise.resolve('a'), v2: 'b'};

		const result: any = await backend.resolveVirtuals(document, ['v1', 'v2']);

		expect(result).toEqual({keep: 1, v1: 'a', v2: 'b'});
		expect(result).not.toBe(document);
		expect(document.v1).toBeInstanceOf(Promise);
	});

	it('should resolve no virtuals to a plain clone', async () => {
		const document: any = {keep: 1};

		const result: any = await backend.resolveVirtuals(document, []);

		expect(result).toEqual({keep: 1});
		expect(result).not.toBe(document);
	});
});
