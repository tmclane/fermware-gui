var Application = function(db_name) {
    var config = null;
    var db = $.couch.db(db_name);
    var graph = null;

    return {
        configuration: function(callback){
            var that = this;
            if (!that.config)
            {
                db.openDoc("config", {
                    success: function (d) {
                        that.config = d;
                        callback(that.config.name);
                    },
                    error: function () {
                        alert ("Failed to locate the configuration");
                    }
                });
            }
            else {
                callback(that.config);
            }
        },

        brewery_name: function(callback){
            this.configuration(callback);
        },

        zones: function(callback){
            this.configuration(function(config){
                callback(config.zones);
            });
        },

        draw_graph: function(graph_id){ //, sensor_ids, date_start, date_end){
            var that = this;
            if (!that.graph)
            {
                var margin = {top: 10, right: 10, bottom: 20, left: 30};
                var width = $(graph_id).width() - margin.left - margin.right;
                var height = $(graph_id).height() - margin.top - margin.bottom;

                var parseDate = function(Y,M,D,h,m,s) {
                    return new Date(Y, M, D, h, m, s);
                };

                var convertToArray = function(d) {

                };

                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                var line = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) { return x(d.date); })
                    .y(function(d) { return y(d.temperature); });

                var svg = d3.select(graph_id).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var query_string = function(sensor_id) {
                    var previous = new Date(new Date().getTime() - (8 * 60 * 60 * 1000));
                    return "?startkey=[\"" + sensor_id + "\",[" + previous.getFullYear() + "," +
                        (previous.getMonth() + 1) + "," + previous.getDate() + "," +
                        previous.getHours() + "]]&endkey=[\"" + sensor_id + "\",{}]";
                }

                var fetch_sensor_values = function(sensor_id, callback) {
                    d3.json("_view/by_date" + query_string(sensor_id),
                            function(viewdata) {
                                data = viewdata["rows"];

                                var sensor_data = new Object();

                                var count = 0;
                                var values = [];

                                data.forEach(function(d) {
                                    d.date = parseDate.apply(null, d.value.date);
                                    d.date.setMonth(d.date.getMonth() - 1);
                                    d.temperature = +d.value.F;
                                    count += 1;

                                    values.push(d);
                                });

                                sensor_data.name = sensor_id;
                                sensor_data.values = values;
                                sensor_data.count = count;

                                callback( sensor_data );
                            });
                }

                var render_graph = function(glycol_data, bottom_data) {
                    var data = glycol_data.values
                    var xmin = d3.min(data.map(function(d) { return d.date;}));
                    var xmax = d3.max(data.map(function(d) { return d.date;}));
                    var ymin = d3.min(data.map(function(d) { return d.temperature; }));
                    var ymax = d3.max(data.map(function(d) { return d.temperature; }));

                    x.domain([xmin, xmax]);
                    y.domain([ymin, ymax]);

                    //x.domain(d3.extent(data, function(d) { return d.date; }));
                    //y.domain(d3.extent(data, function(d) { return d.value; }));

                    svg.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(xAxis);

                    svg.append("g")
                        .attr("class", "y axis")
                        .call(yAxis)
                        .append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("y", 6)
                        .attr("dy", ".71em")
                        .style("text-anchor", "end")
                        .text("Temperature (F)");

                    svg.append("path")
                        .datum(data)
                        .attr("class", "line")
                        .attr("d", line);

                }

                fetch_sensor_values("Glycol",
                                    function(glycol_data) {
                                        fetch_sensor_values("Bottom",
                                                            function(bottom_data) {
                                                                console.log(glycol_data);
                                                                console.log(bottom_data);
                                                                render_graph(glycol_data);
                                                            });
                                        });

                that.graph = svg;
            }
        },

        switch_tab: function(from_tab, to_tab) {
            console.log(from_tab + " -> " + to_tab);
        }
    }
};


var application = new Application("fermentator");
