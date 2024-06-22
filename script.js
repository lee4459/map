// script.js

// Set dimensions for the map and sidebar
const mapWidth = window.innerWidth * 0.7; // 70% of window width
const mapHeight = window.innerHeight;
const sidebarWidth = window.innerWidth * 0.3; // 30% of window width


const svg = d3.select("#map")
    .attr("width", mapWidth)
    .attr("height", mapHeight)
    .append("g");

// Create a projection and path generator
const projection = d3.geoMercator()
    .scale(mapWidth / 2 / Math.PI)  // Adjust scale based on map width
    .translate([mapWidth / 2, mapHeight / 2]);
const path = d3.geoPath().projection(projection);

// Initialize continent and country data
let continentData = {};

// Define initial zoom transform
let initialTransform = d3.zoomIdentity;

// Define a zoom behavior
const zoom = d3.zoom()
    .scaleExtent([1, 8])  // Limit zoom scale from 1x to 8x
    .on("zoom", zoomed);

// Apply the zoom behavior to the SVG element
svg.call(zoom);

// Function to handle zooming
function zoomed(event) {
    svg.selectAll("path")
        .attr("transform", event.transform); // Apply transform to all paths

    svg.selectAll("image.marker")  // Select all markers
        .attr("transform", event.transform);  // Apply the same transform to markers

    // Update the position of all visible tooltips
    d3.selectAll(".tooltip").each(function(d) {
        let tooltip = d3.select(this);
        if (tooltip.style("display") !== "none") {
            let country = tooltip.attr("data-country");
            let marker = svg.selectAll("image.marker").filter(function(d) {
                return d.properties.name === country;
            });

            if (marker.node()) {
                let x = parseFloat(marker.attr("x")) + parseFloat(marker.attr("width")) / 2;
                let y = parseFloat(marker.attr("y")) + parseFloat(marker.attr("height")) / 2;
                let left = (x * event.transform.k + event.transform.x);
                let top = (y * event.transform.k + event.transform.y);

                // Ensure the tooltip stays within map boundaries
                let tooltipWidth = tooltip.node().offsetWidth;
                let tooltipHeight = tooltip.node().offsetHeight;
                if (left + tooltipWidth > mapWidth) {
                    left = mapWidth - tooltipWidth;
                }
                if (top + tooltipHeight > mapHeight) {
                    top = mapHeight - tooltipHeight;
                }
                if (left < 0) left = 0;
                if (top < 0) top = 0;

                tooltip.style("left", left + "px")
                       .style("top", top + "px");
            }
        }
    });

    // Store the current zoom transform
    currentTransform = event.transform;
}







// Load and display the continent map
d3.json("countries_with_continents.geojson").then(function(data) {
    // Parse GeoJSON data and initialize visitor counts
    data.features.forEach(function(feature) {
        const continent = feature.properties.continent;
        const country = feature.properties.name;

        // Initialize visitor count to 0
        if (!continentData[continent]) {
            continentData[continent] = {};
        }
        continentData[continent][country] = {
            visitors: Math.floor(Math.random() * 100) // Random visitor
        };
    });

    // Append paths for each country
    svg.selectAll("path")
        .data(data.features)
        .enter().append("path")
        .attr("class", "continent")
        .attr("d", path)
        .on("mouseover", function(event, d) {
            d3.select(this).classed("highlight", true);
        })
        .on("mouseout", function(event, d) {
            d3.select(this).classed("highlight", false);
        })
        .on("click", function(event, d) {
            const continent = d.properties.continent;
            filterByContinent(continent);
        });

    // Store the initial zoom transform
    initialTransform = d3.zoomTransform(svg.node());

    // Update sidebar with horizontal bar chart of visitor counts
    updateSidebar();

    // Update sidebar with donut chart of visitor percentages
    updateDonutChart();



   
let visitedCountries = {
    "China": "中國的北京，非常喜歡那裡的文化和食物。",
    "USA": "美國的紐約，那裡的生活節奏很快。",
  
};


svg.selectAll("image.marker")
    .data(data.features.filter(function(d) {
        return visitedCountries[d.properties.name];
    }))
    .enter().append("image")
    .attr("class", "marker")
    .attr("x", function(d) {
        return projection(d3.geoCentroid(d))[0] - 25; // Offset for centering the marker
    })
    .attr("y", function(d) {
        return projection(d3.geoCentroid(d))[1] - 25; // Offset for centering the marker
    })
    .attr("width", 50)  // Set marker width
    .attr("height", 50)  // Set marker height
    .attr("href", "pin.png")  // Set image URL
    .attr("data-country", function(d) {
        return d.properties.name;
    })
    .style("display", function(d) {
        return visitedCountries[d.properties.name] ? null : "none";
    })
    .on("click", function(event, d) {
        let tooltip = d3.select(".tooltip[data-country='" + d.properties.name + "']");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .attr("data-country", d.properties.name);
        }

        if (tooltip.style("display") === "none") {
            let marker = d3.select(this);
            let x = parseFloat(marker.attr("x")) + parseFloat(marker.attr("width")) / 2;
            let y = parseFloat(marker.attr("y")) + parseFloat(marker.attr("height")) / 2;
            let left = (x * currentTransform.k + currentTransform.x);
            let top = (y * currentTransform.k + currentTransform.y);

            // Ensure the tooltip stays within map boundaries
            let tooltipWidth = tooltip.node().offsetWidth;
            let tooltipHeight = tooltip.node().offsetHeight;
            if (left + tooltipWidth > mapWidth) {
                left = mapWidth - tooltipWidth;
            }
            if (top + tooltipHeight > mapHeight) {
                top = mapHeight - tooltipHeight;
            }
            if (left < 0) left = 0;
            if (top < 0) top = 0;

            tooltip.html(visitedCountries[d.properties.name])
                .style("left", left + "px")
                .style("top", top + "px")
                .style("display", "block");
        } else {
            tooltip.style("display", "none");
        }
    });





});

// Function to update sidebar with visitor counts by continent
function updateSidebar() {
    // Calculate total visitor counts for each continent
    const continentVisitorCounts = Object.keys(continentData).map(continent => {
        return {
            continent: continent,
            visitors: d3.sum(Object.values(continentData[continent]), d => d.visitors)
        };
    });

    // Sort data by visitor counts in descending order
    continentVisitorCounts.sort((a, b) => b.visitors - a.visitors);

    // Define dimensions and margins for the bar chart
    const chartHeight = 300;
    const barHeight = 30; // Height of each bar
    const margin = { top: 20, right: 20, bottom: 30, left: 150 };

    // Calculate total width based on sidebar width and margins
    const totalWidth = sidebarWidth - margin.left - margin.right;

    // Create scales for x and y axes
    const x = d3.scaleLinear()
        .domain([0, d3.max(continentVisitorCounts, d => d.visitors)])
        .nice()
        .range([0, totalWidth]);

    const y = d3.scaleBand()
        .domain(continentVisitorCounts.map(d => d.continent))
        .range([0, chartHeight])
        .padding(0.1);

    // Create SVG for the bar chart
    const svgSidebar = d3.select("#bar-chart")
        .append("svg")
        .attr("width", sidebarWidth)
        .attr("height", chartHeight);

    // Add grid lines for x-axis
    svgSidebar.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisBottom(x)
            .tickSize(-chartHeight)
            .tickFormat('')
        )
        .selectAll("line")
        .attr("stroke", "#e0e0e0"); // Customize grid line color

    // Add bars to the chart
    svgSidebar.selectAll("rect")
        .data(continentVisitorCounts)
        .enter().append("rect")
        .attr("x", margin.left)
        .attr("y", d => y(d.continent))
        .attr("width", d => x(d.visitors))
        .attr("height", y.bandwidth())
        .attr("fill", "#69b3a2");

    // Add numbers inside bars
    svgSidebar.selectAll(".bar-label")
        .data(continentVisitorCounts)
        .enter().append("text")
        .attr("class", "bar-label")
        .attr("x", d => margin.left + x(d.visitors) - 5) // Position text inside the bar, near the right edge
        .attr("y", d => y(d.continent) + y.bandwidth() / 2)
        .text(d => d.visitors) // Display visitor count
        .attr("dy", ".35em")
        .attr("fill", "black")
        .attr("font-size", "12px")
        .attr("text-anchor", "end"); // Right-align the text
    // Add y-axis
    svgSidebar.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y).tickSizeOuter(0));

    // Add x-axis
    svgSidebar.append("g")
        .attr("transform", `translate(${margin.left}, ${chartHeight})`)
        .call(d3.axisBottom(x).ticks(5));

    // Add x-axis label
    svgSidebar.append("text")
        .attr("transform", `translate(${margin.left + totalWidth / 2}, ${chartHeight + margin.bottom})`)
        .style("text-anchor", "middle")
        .text("Visitor Count");

    // Style adjustments
    svgSidebar.selectAll(".tick line").attr("stroke", "#e0e0e0"); // Customize tick line color
}

// Function to update sidebar with donut chart of visitor percentages by continent
function updateDonutChart() {
    // Calculate total visitor counts for each continent
    const continentVisitorCounts = Object.keys(continentData).map(continent => {
        return {
            continent: continent,
            visitors: d3.sum(Object.values(continentData[continent]), d => d.visitors)
        };
    });

    // Calculate total visitors
    const totalVisitors = d3.sum(continentVisitorCounts, d => d.visitors);

    // Calculate visitor percentages for each continent
    const visitorPercentages = continentVisitorCounts.map(d => {
        return {
            continent: d.continent,
            percentage: (d.visitors / totalVisitors) * 100
        };
    });

    // Set dimensions and radius for the donut chart
    const width = 500;
    const height = 300;
    const radius = Math.min(300, height) / 2;

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create SVG for the donut chart
    const svgDonut = d3.select("#donut-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2-100}, ${height / 2})`);

    // Create arc generator
    const arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(radius - 70);

    // Create pie generator
    const pie = d3.pie()
        .sort(null)
        .value(d => d.percentage);

    // Create arcs for the donut chart
    const arcs = svgDonut.selectAll(".arc")
        .data(pie(visitorPercentages))
        .enter().append("g")
        .attr("class", "arc");

    // Append paths to arcs
    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.continent));

    // Add labels to arcs
    arcs.append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", ".35em");

    // Create legend for the donut chart
    const legend = svgDonut.selectAll(".legend")
        .data(visitorPercentages)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(100, ${-height / 2 + i * 20})`);

    // Append color rectangles to legend
    legend.append("rect")
        .attr("x", width / 2 - 18)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => color(d.continent));

    // Append text to legend
    legend.append("text")
    .attr("x", width / 2 - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .text(d => `${d.continent}: ${d.percentage.toFixed(1)}%`);

}

// Function to filter the map by continent
function filterByContinent(continent) {
    // Display paths of the selected continent and hide others
    svg.selectAll("path")
        .style("display", function(d) {
            return d.properties.continent === continent ? null : "none";
        });

    // Display markers of the selected continent and hide others
    svg.selectAll("image.marker")
        .style("display", function(d) {
            return d.properties.continent === continent ? null : "none";
        });

    // Hide tooltips of countries not in the selected continent
    d3.selectAll(".tooltip").each(function(d) {
        let tooltip = d3.select(this);
        let country = tooltip.attr("data-country");

        // Check if the country is in the selected continent
        let isInContinent = svg.selectAll("image.marker").filter(function(d) {
            return d.properties.name === country && d.properties.continent === continent;
        }).node();

        // Hide the tooltip if the country is not in the selected continent
        if (!isInContinent) {
            tooltip.style("display", "none");
        }
    });
}




// Add event listener to the reset button
document.getElementById("reset-button").addEventListener("click", function() {
    // Reset display of all paths
    svg.selectAll("path")
        .style("display", null);

    // Reset display of all markers
    svg.selectAll("image.marker")
        .style("display", null);

    // Reset zoom to initial transform
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);

    d3.selectAll(".tooltip")
    .style("display", "none");
});

