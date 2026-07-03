export declare class LiveUpdatesRegistry {
    static add(entity: any): void;
    static has(entity: any): boolean;
    static entities(): any[];
    static clear(): void;
    private static readonly _entities;
    private constructor();
}
declare const LiveUpdates: () => ClassDecorator;
export default LiveUpdates;
