export type PostgresConnectorOptionsType = {
    entities: any[];
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
    channel?: string;
    updateSchema?: boolean;
    safe?: boolean;
    triggers?: boolean;
    ormOptions?: any;
};
export default class PostgresConnector {
    static init(options: PostgresConnectorOptionsType): Promise<any>;
    static get orm(): any;
    static em(): any;
    static close(): Promise<void>;
    private static _orm;
    private static _withSchemaLock;
    private constructor();
}
