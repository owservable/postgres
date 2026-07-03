'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveUpdatesRegistry = void 0;
class LiveUpdatesRegistry {
    static add(entity) {
        LiveUpdatesRegistry._entities.add(entity);
    }
    static has(entity) {
        return LiveUpdatesRegistry._entities.has(entity);
    }
    static entities() {
        return Array.from(LiveUpdatesRegistry._entities);
    }
    static clear() {
        LiveUpdatesRegistry._entities.clear();
    }
    constructor() { }
}
exports.LiveUpdatesRegistry = LiveUpdatesRegistry;
LiveUpdatesRegistry._entities = new Set();
const LiveUpdates = () => {
    return (target) => {
        LiveUpdatesRegistry.add(target);
    };
};
exports.default = LiveUpdates;
//# sourceMappingURL=live.updates.js.map