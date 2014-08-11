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
                var margin = {top: 10, right: 40, bottom: 20, left: 30};
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

                var render_graph = function(sensors) {
                    console.log(sensors);

                    var data = sensors[0].values;

                    x.domain(d3.extent(sensors[0].values, function(d) { return d.date; }));
                    y.domain([
                        d3.min(sensors, function(c) { return d3.min(c.values, function(v) { return v.temperature; }); }),
                        d3.max(sensors, function(c) { return d3.max(c.values, function(v) { return v.temperature; }); })
                    ]);



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


                    var lines = svg.selectAll(".sensors")
                        .data(sensors)
                        .enter().append("g")
                        .attr("class", "sensor");

                    lines.append("path")
                        .attr("class", "line")
                        .attr("d", function(d) { return line(d.values); })
                        .style("stroke-width", "4px");
//                        .style("stroke", function(d) { return color(d.name); });

                    lines.append("text")
                        .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
                        .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.temperature) + ")"; })
                        .attr("x", 3)
                        .attr("dy", ".35em")
                        .text(function(d) { return d.name; });

                }

                fetch_sensor_values("Glycol",
                                    function(glycol_data) {
                                        fetch_sensor_values("Bottom",
                                                            function(bottom_data) {
                                                                console.log(glycol_data);
                                                                console.log(bottom_data);
                                                                render_graph([glycol_data, bottom_data]);
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
