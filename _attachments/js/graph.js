/**
 * Create and draw a multi-line graph for an individual zone
 */

var optionalArg = function(args, key, defaultValue) {
    if(!args[key]) {
	return defaultValue
    } else {
	return args[key]
    }
}

var requiredArg = function(args, key) {
    if(!args[key]) {
	throw new Error(key + " is required")
    }
    else {
	return args[key]
    }
}


function ZoneGraph(args) {
    var that = this;

    var containerId = requiredArg(args, 'containerId');
    var zoneId = requiredArg(args, 'zoneId');
    var configuration = requiredArg(args, 'configuration');

    var dateToArray = function(date) {
        return [date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds()]
    }

    var endkey = function(sensor_id, end_time) {
        if (end_time != null) {
            return "[\"" + sensor_id + "\",[" + dateToArray(end_time) + "]]";
        }
        else {
            return "[\"" + sensor_id + "\",[{}]]";
        }
    }

    var parseDate = function(Y,M,D,h,m,s, ms) {
        return new Date(Y, M - 1, D, h, m, s);
    }

    var query_string = function(sensor_id, start_time, end_time) {
        return "?startkey=[\"" + sensor_id + "\",[" + dateToArray(start_time).toString() +
            "]]&endkey=" + endkey(sensor_id, end_time);
    }

    var fetch_sensor_data = function(sensor_id, start_time, end_time, callback) {
        d3.json("_view/by_date" + query_string(sensor_id, start_time, end_time),
                function(viewdata) {
                    data = viewdata["rows"];

                    var count = 0;
                    var values = [];

                    data.forEach(function(d) {
                        d.date = parseDate.apply(null, d.key[1]);
                        d.temperature = +d.value.F;
                        count += 1;

                        values.push(d);
                    });

                    callback(null, {count: count,
                                    name: sensor_id,
                                    values: values});
                });
    }

    var fetch_sensors = function(sensor_ids, start_time, end_time, callback) {
        var q = queue(5);

        sensor_ids.forEach(function(s) {
            q.defer(function(c) { return fetch_sensor_data(s, start_time, end_time, c); });
        });

        q.awaitAll(function(error, results) {
            if (error){
                console.log(error);
            }

            callback(results);
        });
    }

    return {
        containerId: containerId,
        zone: zoneId,
        previous_date: function (hours) { return new Date(new Date().getTime() - (hours * 60 * 60 * 1000)); },
        fetch_sensors: function (start, end) { fetch_sensors(sensorIds, start, end, function(data){ console.log(data);})}
    }
}
