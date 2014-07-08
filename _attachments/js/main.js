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
                var margin = {top: 10, right: 30, bottom: 50, left: 30};
                var width = window.outerWidth - margin.left - margin.right;
                var height = 400 - margin.top - margin.bottom;

                var parseDate = function(Y,M,D,h,m,s) {
                    return new Date(Y, M, D, h, m, s);
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

                d3.json("_view/by_date?startkey=[\"FridgeTemp\",[]]&endkey=[\"FridgeTemp\",{}]",
                        function(viewdata) {
                            data = viewdata["rows"];
                            var count = 0;

                            data.forEach(function(d) {
                                d.date = parseDate.apply(null, d.value.date);
                                d.temperature = +d.value.value;
                                count += 1;
                            });

                            var xmin = d3.min(data.map(function(d) { return d.date;})) - 10;
                            var xmax = d3.max(data.map(function(d) { return d.date;})) + 10;
                            var ymin = d3.min(data.map(function(d) { return d.temperature; }));
                            var ymax = d3.min(data.map(function(d) { return d.temperature; }));

                            x.domain([d3.min(data.map(function(d) { return d.date;})),
                                      d3.max(data.map(function(d) { return d.date;}))]);

                            y.domain([ymin, ymax + 20]);

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
                        });

                that.graph = svg;
            }
        }
    }
};

Fermware = new Application("fermentator");
