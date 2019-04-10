import { t } from '../util/locale';
import { actionReflect } from '../actions';
import { behaviorOperation } from '../behavior';
import { geoExtent } from '../geo';
import { utilGetAllNodes } from '../util';


export function operationReflectShort(selectedIDs, context) {
    return operationReflect(selectedIDs, context, 'short');
}


export function operationReflectLong(selectedIDs, context) {
    return operationReflect(selectedIDs, context, 'long');
}


export function operationReflect(selectedIDs, context, axis) {
    axis = axis || 'long';
    var multi = (selectedIDs.length === 1 ? 'single' : 'multiple');
    var nodes = utilGetAllNodes(selectedIDs, context.graph());
    var coords = nodes.map(function(n) { return n.loc; });
    var extent = nodes.reduce(function(extent, node) {
        return extent.extend(node.extent(context.graph()));
    }, geoExtent());
    var _disabled;


    var operation = function() {
        var action = actionReflect(selectedIDs, context.projection)
            .useLongAxis(Boolean(axis === 'long'));
        context.perform(action, operation.annotation());
    };


    operation.available = function() {
        return nodes.length >= 3;
    };


    operation.disabled = function() {
        if (_disabled !== undefined) return _disabled;

        if (extent.area() && extent.percentContainedIn(context.extent()) < 0.8) {
            return _disabled = 'too_large';
        } else if (someMissing()) {
            return _disabled = 'not_downloaded';
        } else if (selectedIDs.some(context.hasHiddenConnections)) {
            return _disabled = 'connected_to_hidden';
        } else if (selectedIDs.some(incompleteRelation)) {
            return _disabled = 'incomplete_relation';
        }

        return _disabled = false;


        function someMissing() {
            var osm = context.connection();
            if (osm) {
                var missing = coords.filter(function(loc) { return !osm.isDataLoaded(loc); });
                if (missing.length) {
                    missing.forEach(function(loc) { context.loadTileAtLoc(loc); });
                    return true;
                }
            }
            return false;
        }

        function incompleteRelation(id) {
            var entity = context.entity(id);
            return entity.type === 'relation' && !entity.isComplete(context.graph());
        }
    };


    operation.tooltip = function() {
        var disable = operation.disabled();
        return disable ?
            t('operations.reflect.' + disable + '.' + multi) :
            t('operations.reflect.description.' + axis + '.' + multi);
    };


    operation.annotation = function() {
        return t('operations.reflect.annotation.' + axis + '.' + multi);
    };


    operation.id = 'reflect-' + axis;
    operation.keys = [t('operations.reflect.key.' + axis)];
    operation.title = t('operations.reflect.title.' + axis);
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}
