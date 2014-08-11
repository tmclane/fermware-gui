


/**
 * Create and draw a line-graph for an individual zone
 */
function ZoneGraph(args) {
    var that = this;



    var optionalVariable = function(args, key, defaultValue) {
	if(!args[key]) {
	    return defaultValue
	} else {
	    return args[key]
	}
    }

    var requiredVariable = function(args, key) {
	if(!args[key]) {
	    throw new Error(key + " is required")
	}
	else {
	    return args[key]
	}
    }





    var containerId = requiredVariable(args, 'containerId');
    var zoneId = requiredVariable(args, 'zoneId');

    return {
        containerId: containerId,
        zone: zoneId,

        test: function() { console.log('ZoneGraph.test()'); }

    }
}
