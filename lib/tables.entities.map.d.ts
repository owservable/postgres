export default class TablesEntitiesMap {
    static addTableToEntityMapping(tableName: string, entity: any): void;
    static getEntityByTable(tableName: string): any | null;
    static keys(): string[];
    static values(): any[];
    static clear(): void;
    private static readonly _entities;
    private constructor();
}
