'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresLiveUpdatesRegistry = void 0;
class PostgresLiveUpdatesRegistry {
    static add(entity) {
        PostgresLiveUpdatesRegistry._entities.add(entity);
    }
    static has(entity) {
        return PostgresLiveUpdatesRegistry._entities.has(entity);
    }
    static entities() {
        return Array.from(PostgresLiveUpdatesRegistry._entities);
    }
    static clear() {
        PostgresLiveUpdatesRegistry._entities.clear();
    }
    constructor() { }
}
exports.PostgresLiveUpdatesRegistry = PostgresLiveUpdatesRegistry;
PostgresLiveUpdatesRegistry._entities = new Set();
const PostgresLiveUpdates = () => {
    return (target) => {
        PostgresLiveUpdatesRegistry.add(target);
    };
};
exports.default = PostgresLiveUpdates;
//# sourceMappingURL=live.updates.js.map