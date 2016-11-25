$(function () {

  var plot_graph = function(){ 

    var width = 900,
    height = 400;

    $(".sknn_animation").empty()

    var svg = d3.select(".sknn_animation").append("svg")
      .attr("width", width)
      .attr("height", height);

    var pointGroup = svg.append("g").attr("class", "points");

    var distanceLineGroup = svg.append("g").attr("class", "dist_lines");

    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var graphWidth = 400;
    var graphHeight = 400;

    var simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(function(d) { return d.id; }))
      .force("charge", d3.forceManyBody().strength(-600))
      .force("center", d3.forceCenter(graphWidth / 2, graphHeight / 2));


    var pointsArray = [];

    var genPoint = function(arr){
      var randomPoint = {
        x: Math.floor((Math.random() * 20) - 10),
        y: Math.floor((Math.random() * 20) - 10)
      }
      arr.push(randomPoint);
    }
    
    genPoint(pointsArray);
    genPoint(pointsArray);
    genPoint(pointsArray);
    genPoint(pointsArray);
    genPoint(pointsArray);

    window.points = pointsArray;

    var getNextPoint = function(arr) {
      genPoint(arr);
      return arr.shift();
    }

    var dotWidth = 300;
    var dotHeight = 300;
    var translateX = 400;
    var translateY = 50;
    var select_node_time_scale = 1000;

    var xDotScale = d3.scaleLinear()
      .domain([-10, 10])
      .range([0 + translateX, dotWidth + translateX]);

    var yDotScale = d3.scaleLinear()
      .domain([-10, 10])
      .range([0 + translateY, dotHeight + translateY ]);



    var renderPoints = function(points){

      return new Promise(function(resolve){
        d3.select("#point_old")
          .remove();

        var opScale = d3.scaleLinear()
          .domain([0, 5])
          .range([1,0.1]);

        var rScale = d3.scaleLinear()
          .domain([0, 5])
          .range([4,2]);

        var sScale = d3.scaleLinear()
          .domain([0, 5])
          .range([2,0]);

        console.log(points);

        var pointCircles = pointGroup.selectAll(".point")
          .data(points)
          .enter()
          .append("circle")
          .attr("cx", function(d) { return xDotScale(d.x); })
          .attr("cy", function(d) { return yDotScale(d.y); })
          .attr("class","point");

        pointCircles = d3.selectAll(".point")
          .data(points)
          .transition()
          .duration(select_node_time_scale)
          .attr("r", function(d, idx){ return rScale(idx) })
          .attr("id", function(d, idx){ return "point_" + idx })
          .style("fill", "white")
          .style("stroke", "black")
          .style("stroke-width", function(d, idx){ return sScale(idx) + "px" })
          .style("stroke-opacity", function(d, idx){ return opScale(idx) })
          .on("end", resolve);
      });
    }

    var euclid = function(x1, y1, x2, y2){
      return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2)*(y1 - y2));
    }


    var getClosest = function(dots, point, current_node){
      var activeDots = dots.filter(function(d){
          return d.node == current_node.id;
      });

      var min = 100500;
      var min_point = null;
      $.each(activeDots, function(idx, d){
        var dist = euclid( point.x, point.y, d.x, d.y );
        if(dist < min){
          min = dist;
          min_point = d;
        }
      })
      return min_point;
    }





    var renderDistanceLines = function(dots, point, current_node, nodes){

      var opScale = d3.scaleLinear()
        .domain([0, euclid(-10, -10, 10, 10)/2])
        .range([1,0]);

      return new Promise( function(resolve){


        var activeDots = dots.filter(function(d){
          return d.node == current_node.id;
        })

        console.log(activeDots);

        distanceLineGroup.selectAll(".dist_line").remove();

        distanceLineGroup
          .selectAll("dist_line")
          .data(activeDots)
          .enter()
          .append('line')
          .attr("class", "dist_line")
          .attr("x1", function(d) { return xDotScale(point.x); })
          .attr("y1", function(d) { return yDotScale(point.y); })
          .attr("x2", function(d) { return xDotScale(d.x); })
          .attr("y2", function(d) { return yDotScale(d.y); })
          .style("stroke-opacity", 0)
          .style("stroke-width", 0)
          .transition()
          .duration(select_node_time_scale)
          .style("stroke-opacity", function(d){
            return opScale( euclid( point.x, point.y, d.x, d.y ) );
          }).style("stroke-width", function(d){
            return opScale( euclid( point.x, point.y, d.x, d.y ) ) * 2 + "px";
          }).transition().style("stroke", function(d){ return d3.rgb(color(d.to_node)); })
          .on("end", function(){
            var closest = nodes[getClosest(dots, point, current_node).to_node];
            d3.select("#point_0")
              .attr("id", "point_old")
              .attr("class", "point_old")
              .transition()
              .duration(select_node_time_scale)
              .attr("r", 5)
              .style("stroke", d3.rgb(color(closest.id)) )
              .transition()
              .attr("cx", closest.x)
              .attr("cy", closest.y)
              .on("end", resolve);
          })
      });
    }

    var hideDistLines = function(){
      return new Promise(function(resolve){
        distanceLineGroup
          .selectAll(".dist_line")
          .transition()
          .duration(select_node_time_scale)
          .style("stroke-opacity",0)
          .on("end", resolve);
      });
    }


    var data = d3.json("/data/graph.json", function(data) {

      // get graph
      function getGraph(data) {

        // get array with nodes objects
        function getNodes(data) {
          var nodesArr = [];
          var nodes = [];
          $.each(data, function (i) {
            var node = data[i][0];

            if (nodesArr.indexOf(node) == -1) {
              nodesArr.push(node);
            }
          });
          $.each(nodesArr, function (i) {
            var node = {};
            node.id = nodesArr[i];
            nodes.push(node);
          });
          return nodes;
        }

        // get array with links objects
        function getLinks(data) {
          var links = []; 
          $.each(data, function (i) {
            var link = {};
            link.source = data[i][0];
            link.target = data[i][1];
            links.push(link);
          });
          return links;
        }

        var graph = {};
        graph.nodes = getNodes(data);
        graph.links = getLinks(data);

        return graph;
      }

      var graph = getGraph(data);
      window.graph = graph;
      console.log(JSON.stringify(graph));

      // force layout 
      // add graph to svg
      var addForce = function(graph) {
        var width = graphWidth,
        height = graphHeight,
        r = 9,
        n = 100;

        svg.append("g")
          .attr("class", "graph")
          .style({
            "width": width + "px",
            "height": height + "px"
          });

        // var color = d3.scale.category20();
        var link = svg.select(".graph").selectAll(".link")
          .data(graph.links)
          .enter().append("line")
          .attr("class", "link")
          .attr("id", function(d) {
            return "link_" + d.source + "_" + d.target })
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; })
          .attr("marker-end", "url(#end)");

        var node = svg.select(".graph").selectAll(".node")
          .data(graph.nodes)
          .enter().append("circle")
          .attr("class", "node")
          .attr("id", function (d) { return "node_" + d.id; })
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; })
          .attr("r", r)
          .style("fill", function(d) { return d3.rgb(color(d.id)).brighter(3); })
          .style("stroke", function(d) { return d3.rgb(color(d.id)); })
          .on('mouseover', function(d){ hoverDots(window.dots, d.id); })
          .on('mouseout', function(d){ unhoverDots(window.dots); })
/*          .call(d3.drag()*/
              //.on("start", dragstarted)
              //.on("drag", dragged)
              /*.on("end", dragended));*/

        // build the arrow.
        svg.append("defs").selectAll("marker")
          .data(["end"])      // Different link/path types can be defined here
          .enter().append("svg:marker")    // This section adds in the arrows
          .attr("id", String)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 30)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .attr("fill", "#000")
          .append("svg:path")
          .attr("d", "M0,-5L10,0L0,5");

        simulation
          .nodes(graph.nodes)
          .on("tick", ticked);

        simulation.force("link")
          .links(graph.links);

        function ticked() {
          link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

          node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
        }


      } // eng of adding of force layout graph to svg

      var hoverDots = function(dots, id){
        if(dots){
          dots.filter(function(d){ return d.node != id })
            .style("stroke-width", "0px");

          dots.filter(function(d){ return d.node == id })
            .style("stroke-width", "2px")
            .style("stroke", "#000");
        }
      }

      var unhoverDots = function(dots){
        if(dots){
          dots.style("stroke-width", "0px");
        }
      }

      var colorDots = function(dots, id){
        if(dots){
          dots.filter(function(d){ return d.node != id })
            .transition()
            .duration(select_node_time_scale)
            .attr("r", 3)
            .style("fill", "#ccc");
          
          dots.filter(function(d){ return d.node == id })
            .transition()
            .delay(select_node_time_scale)
            .duration(select_node_time_scale)
            .style("fill", function(d) { return d3.rgb(color(d.to_node))})
            .attr("r", 5)
        }
      }

      var selectNode = function(graph, id){
        return new Promise(function(resolve){

          colorDots(window.dots, id);

          if(current_node){
            d3.select("#node_" + current_node.id)
              .transition()
              .duration(select_node_time_scale)
              .style("stroke-width", "1");

            d3.select("#link_" + current_node.id + "_" + id )
              .style("stroke-width", "1")
              .transition()
              .duration(select_node_time_scale)
              .style("stroke-width", "2")
              .transition()
              .duration(select_node_time_scale)
              .style("stroke-width", "1");
          }

          d3.select("#node_" + id)
            .transition()
            .delay(select_node_time_scale / 2)
            .duration(select_node_time_scale)
            .style("stroke-width", "5")
            .on("end", resolve);

          current_node = graph.nodes[id];

        });
      }

      
      var current_node = null;
      var next_node = 0;


      function main(){
        setTimeout(function(){
          selectNode(graph, next_node)
            .then(function(){ return renderPoints(pointsArray)})
            .then(function(){
              var point = getNextPoint(pointsArray);
              next_node = getClosest(window.dotsData, point, current_node).to_node;
              return renderDistanceLines(window.dotsData, point, current_node, graph.nodes)
            })
          .then(hideDistLines)
            .then(main)
        }, select_node_time_scale);
      }

     main(); 

      // Here is implementation of clusters
      // add dots
      function addDots() {




        d3.json("/data/viz.json", function(dots) {
          console.log(dots);


          window.dotsData = dots;


          var dotsGroup = svg.append("g");

          dotsGroup
            .attr("class", "dots");


          dots = dotsGroup.selectAll("circle")
            .data(dots)
            .enter().append("circle")
            .attr("class","dot")
            .attr("r", 3)
            .attr("cx", function(d) { return xDotScale(d.x); })
            .attr("cy", function(d) { return yDotScale(d.y); })
            .style("fill", "#ccc")
            // .style("fill", function(d) { return d3.rgb(color(d.to_node)); })
            //.style("transform", "translate(" + translateX + "px, " + translateY + "px)");

          // add axises
          // Horisontal Axis
          var hAxis = d3.axisBottom(xDotScale)
            .ticks(0);
          // .tickValues(dots.y);

          // Horisontal Guide
          var hGuide = d3.select('svg')
            .append('g')
            .attr("class", "haxis");

          hAxis(hGuide);

          hGuide.attr('transform', "translate(" + 0 + "," + (translateY + dotHeight / 2) + ")");


          hGuide.selectAll('path')
            .style('fill', 'none')
            .style('stroke', '#000');

          hGuide.selectAll('line')
            .style('stroke', '#000');

          // Vertical Axis
          var vAxis = d3.axisLeft(yDotScale)
            .ticks(0);

          // V Guide
          var vGuide = d3.select('svg')
            .append('g')
            .attr("class", "vaxis");

          vAxis(vGuide);

          vGuide.attr("transform", "translate(" + (translateX + dotWidth/2) + "," + 0 + ")");

          vGuide.selectAll('path')
            .style('fill', 'none')
            .style('stroke', '#000');

          vGuide.selectAll('line')
            .style('stroke', '#000');


          window.dots = dots;

        });
      } // end of function for a dots adding to svg 

      // all svg parts functions call
      addForce(graph);       // render graph
      addDots();             // render dots




    }); // end of data json closing


    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }


  }; // end of plot_graph()


  $(document).ready(function () {
    plot_graph();
  });
});
