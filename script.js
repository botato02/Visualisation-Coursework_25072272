/* select elements from the HTML */
const mainchart = d3.select("#bar-chart");
const detailchart = d3.select("#detail-chart");
const tooltip = d3.select("#tooltip");
const seasonselect = d3.select("#season-select");

/* grouped the buttons for later use */
const metric_buttons = {
    total: d3.select("#metric-total"),
    gold: d3.select("#metric-gold"),
    silver: d3.select("#metric-silver"),
    bronze: d3.select("#metric-bronze")
};

/* store colours and chart sizes (calculate the actual drawable space for the chart) */
const bar_margin = { top: 40, right: 30, bottom: 60, left: 220 };
const bar_width = +mainchart.attr("width") - bar_margin.left - bar_margin.right;
const bar_height = +mainchart.attr("height") - bar_margin.top - bar_margin.bottom;

/* create a margin around the chart for axes and labels */
const barG = mainchart
    .append("g")
    .attr("transform", `translate(${bar_margin.left},${bar_margin.top})`);

const detail_margin = { top: 30, right: 20, bottom: 50, left: 55 };
const detail_width = +detailchart.attr("width") - detail_margin.left - detail_margin.right;
const detail_height = +detailchart.attr("height") - detail_margin.top - detail_margin.bottom;

const detailG = detailchart
    .append("g")
    .attr("transform", `translate(${detail_margin.left},${detail_margin.top})`);

/* state variables control the app's current state */
let olympic_data = [];
let selected_country = null;
let current_metric = "total";

/* load the csv file */
d3.csv("host_effect_final.csv", d => ({
    year: +d.year,
    season: d.season,
    country: d.host_country,

    bronze_host: +d.bronze_host,
    silver_host: +d.silver_host,
    gold_host: +d.gold_host,
    total_host: +d.total_host,

    baseline_bronze: +d.baseline_bronze,
    baseline_silver: +d.baseline_silver,
    baseline_gold: +d.baseline_gold,
    baseline_total: +d.baseline_total,

    host_effect_bronze: +d.host_effect_bronze,
    host_effect_silver: +d.host_effect_silver,
    host_effect_gold: +d.host_effect_gold,
    host_effect_total: +d.host_effect_total,

    bronze_2_before: +d.bronze_medal_2_before,
    silver_2_before: +d.silver_count_2_before,
    gold_2_before: +d.gold_medal_2_before,
    total_2_before: +d.total_medal_2_before,

    bronze_1_before: +d.bronze_medal_1_before,
    silver_1_before: +d.silver_count_1_before,
    gold_1_before: +d.gold_medal_1_before,
    total_1_before: +d.total_medal_1_before,

    bronze_1_after: +d.bronze_medal_1_after,
    silver_1_after: +d.silver_count_1_after,
    gold_1_after: +d.gold_medal_1_after,
    total_1_after: +d.total_medal_1_after,

    bronze_2_after: +d.bronze_medal_2_after,
    silver_2_after: +d.silver_count_2_after,
    gold_2_after: +d.gold_medal_2_after,
    total_2_after: +d.total_medal_2_after
})).then(data => {
    olympic_data = data;

    draw_barchart();
    update_buttons();

    /* make the page interactive, when buttons clicked the chart changes */
    seasonselect.on("change", () => draw_barchart());
    metric_buttons.total.on("click", () => {
        current_metric = "total";
        update_buttons();
        if (selected_country) draw_detailpanel(selected_country);
    });

    metric_buttons.gold.on("click", () => {
        current_metric = "gold";
        update_buttons();
        if (selected_country) draw_detailpanel(selected_country);
    });

    metric_buttons.silver.on("click", () => {
        current_metric = "silver";
        update_buttons();
        if (selected_country) draw_detailpanel(selected_country);
    });

    metric_buttons.bronze.on("click", () => {
        current_metric = "bronze";
        update_buttons();
        if (selected_country) draw_detailpanel(selected_country);
    });
});

function update_buttons() {
    d3.selectAll(".metric-btn").classed("active", false);
    metric_buttons[current_metric].classed("active", true);
}
/* this filters and sorts the data in descending order */
function get_filtered_sorted_data() {
    const selectedSeason = seasonselect.property("value");

    let data = selectedSeason === "All"
        ? [...olympic_data]
        : olympic_data.filter(d => d.season === selectedSeason);

    data.sort((a, b) => b.host_effect_total - a.host_effect_total);

    return data;
}

/* the main function that draws the bar chart */
function draw_barchart() {
    const data = get_filtered_sorted_data();

    /* clears the old chart before redrawing (needed when user clicks on different buttons)*/
    barG.selectAll("*").remove();

    if (data.length === 0) return; /* a safety check so it doesn't crush when no data is loaded */

    /* finds the most negative and positive effect value in the data, with 0 as the starting point for constant axis */
    const minEffect = Math.min(d3.min(data, d => d.host_effect_total), 0);
    const maxEffect = Math.max(d3.max(data, d => d.host_effect_total), 0);

    const x = d3.scaleLinear()
        .domain([minEffect, maxEffect])
        .nice()
        .range([0, bar_width]);

    const y = d3.scaleBand()
        .domain(data.map(d => `${d.country} (${d.year})`))
        .range([0, bar_height])
        .padding(0.18);

    /* colorBrewer-style diverging gradient for colour-blind friendliness */
    const colourScale = d3.scaleLinear()
        .domain([minEffect, 0, maxEffect])
        .range(["#2166ac", "#f7f7f7", "#b2182b"])
        .interpolate(d3.interpolateRgb); /* this will help D3 to blend the colours for gradient scale; idea from: https://observablehq.com/@d3/d3-interpolate */

    /* make sure to draw the x-axis at the bottom of the chart */
    /* then call the actual axis line, tick marks, numbers using x scale I defined earlier */
    barG.append("g")
        .attr("transform", `translate(0,${bar_height})`)
        .call(d3.axisBottom(x));

    /* same for y-axis */
    barG.append("g")
        .call(d3.axisLeft(y));

    /* adds the x-axis label */
    barG.append("text")
        .attr("class", "axis-label")
        .attr("x", bar_width / 2)
        .attr("y", bar_height + 42)
        .attr("text-anchor", "middle")
        .text("Percentage change in medal performance (%)");

    /* converts 0 into a pixel position using the x scale*/
    const zeroX = x(0);

    /* draw zero line */
    barG.append("line")
        .attr("class", "zero-line")
        .attr("x1", zeroX)
        .attr("x2", zeroX)
        .attr("y1", 0)
        .attr("y2", bar_height);

    /* draw bars with interactivity*/
    barG.selectAll(".bar")
        .data(data, d => `${d.country}-${d.year}-${d.season}`) /* binds the data array to all elements with class "bar" */
        .enter().append("rect") /* draws an svg rec for each one (which has been cleared) */
        .attr("class", "bar")
        .attr("y", d => y(`${d.country} (${d.year})`))
        .attr("x", d => x(Math.min(0, d.host_effect_total)))
        .attr("height", y.bandwidth())
        .attr("width", d => Math.abs(x(d.host_effect_total) - x(0)))
        .attr("fill", d => colourScale(d.host_effect_total))
        .on("mousemove", function (event, d) { /* fires when the mouse moves over a bar */
            d3.selectAll(".bar").attr("opacity", 0.35); /* fades all bars to 35% to dim the ones you are not hovering */
            const rowKey = `${d.country}-${d.year}-${d.season}`;
            barG.selectAll(".bar")
                .filter(v => `${v.country}-${v.year}-${v.season}` === rowKey)
                .attr("opacity", 1);
            tooltip /* makes the tooltip box visible + fills with HTML showing that country's stats */
                .style("opacity", 1)
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 20}px`)
                .html(`
                    <strong>${d.country}</strong><br>
                    ${d.year} ${d.season}<br>
                    <strong>Total host medals:</strong> ${d.total_host}<br>
                    <strong>Total medal baseline:</strong> ${formatMaybe(d.baseline_total)}<br>
                    <em>(average of 1 Games before and 1 Games after)</em><br>
                    <strong>Total host effect:</strong> ${formatMaybe(d.host_effect_total)}%<br>
                    Gold: ${d.gold_host} | Silver: ${d.silver_host} | Bronze: ${d.bronze_host}
                `);
        })
        .on("mouseleave", function () { /* fires when the mouse leaves the bar + restores all bars to full opacity */
            d3.selectAll(".bar").attr("opacity", 1);
            tooltip.style("opacity", 0);
        })
        .on("click", function (event, d) { /* fired when a bar is clicked, which call draw_barchart() and draw_detailpanel() */
            selected_country = d;
            draw_barchart();
            draw_detailpanel(d);
        });

    /* if the country is clicked, draw a border around its bar to show it is selected */
    /* this runs every time the chart redraws so the selection stays visible after filtering or switching metric */
    if (selected_country) {
        const selectedKey = `${selected_country.country}-${selected_country.year}-${selected_country.season}`;
        const selectedBar = data.find(v => `${v.country}-${v.year}-${v.season}` === selectedKey);

        if (selectedBar) {
            barG.append("rect")
                .attr("class", "selected-bar-outline")
                .attr("y", y(`${selectedBar.country} (${selectedBar.year})`) - 1)
                .attr("x", x(Math.min(0, selectedBar.host_effect_total)) - 1)
                .attr("height", y.bandwidth() + 2)
                .attr("width", Math.max(Math.abs(x(selectedBar.host_effect_total) - x(0)), 10) + 2)
                .attr("fill", "none")
                .attr("stroke", "#111")
                .attr("stroke-width", 1.5);
        }
    }

    /* average line drawn last so it stays on top */
    const avgEffect = d3.mean(data, d => d.host_effect_total);
    const avgX = x(avgEffect);

    barG.append("line")
        .attr("class", "avg-line")
        .attr("x1", avgX)
        .attr("x2", avgX)
        .attr("y1", 0)
        .attr("y2", bar_height);

    barG.append("text")
        .attr("x", avgX + 6)
        .attr("y", -10)
        .attr("font-size", 11)
        .attr("font-weight", 600)
        .text("Average host effect");

    if (selected_country) {
        const stillVisible = data.find(d =>
            d.country === selected_country.country &&
            d.year === selected_country.year &&
            d.season === selected_country.season
        );
        if (stillVisible) {
            draw_detailpanel(stillVisible);
        }
    }
}

/* the function that draws the detail panel on the right */
function draw_detailpanel(d) {
    detailG.selectAll("*").remove(); /* clears the previous chart before drawing the new one */

    /* get the correct cols depending on which medal type is selected (helper function below)*/
    const metricConfig = get_metric_config(current_metric, d);

    /* build the 5 data points for the line chart + filter out any missing values to stop from breaking */
    const detailData = [
        { label: "-2 Games", medals: metricConfig.minus2, isHost: false },
        { label: "-1 Games", medals: metricConfig.minus1, isHost: false },
        { label: "Host Year", medals: metricConfig.host, isHost: true },
        { label: "+1 Games", medals: metricConfig.plus1, isHost: false },
        { label: "+2 Games", medals: metricConfig.plus2, isHost: false }
    ].filter(v => v.medals !== null && Number.isFinite(v.medals));

    /* saftey check */
    if (detailData.length === 0) return;

    const x = d3.scalePoint()
        .domain(detailData.map(d => d.label))
        .range([0, detail_width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(detailData, d => d.medals)])
        .nice()
        .range([detail_height, 0]);

    detailG.append("g")
        .attr("transform", `translate(0,${detail_height})`)
        .call(d3.axisBottom(x));

    detailG.append("g")
        .call(d3.axisLeft(y));

    /* draws the connecting line between all data points */
    const line = d3.line()
        .x(v => x(v.label))
        .y(v => y(v.medals));

    detailG.append("path")
        .datum(detailData)
        .attr("fill", "none")
        .attr("stroke", "#8a8a8a")
        .attr("stroke-width", 2.2)
        .attr("d", line);

    /* draws a circle mark at each pint, host year red for pop-out effect */
    detailG.selectAll("circle")
        .data(detailData)
        .enter()
        .append("circle")
        .attr("cx", v => x(v.label))
        .attr("cy", v => y(v.medals))
        .attr("r", 5)
        .attr("fill", v => v.isHost ? "#c84f4f" : "#5b6f82");

    /* add medal count labels above each point */
    detailG.selectAll(".point-label")
        .data(detailData)
        .enter()
        .append("text")
        .attr("x", v => x(v.label))
        .attr("y", v => y(v.medals) - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .text(v => v.medals);

    /* updates the text stats below the chart */
    d3.select("#detail-title").text(`${d.country} — performance around host year`);
    d3.select("#stat-country").text(d.country);
    d3.select("#stat-year").text(`${d.year} ${d.season}`);
    d3.select("#stat-host").text(`${metricConfig.metricLabel} host medals: ${formatMaybe(metricConfig.host)}`);
    d3.select("#stat-baseline").text(`${metricConfig.metricLabel} baseline: ${formatMaybe(metricConfig.baseline)}`);
    d3.select("#baseline-note-text").text(
        `Baseline shown here refers to ${metricConfig.metricLabel.toLowerCase()} medals and is calculated as the average of 1 Games before and 1 Games after the host year.`
    );
    d3.select("#stat-effect").text(`${metricConfig.metricLabel} host effect: ${formatMaybe(metricConfig.effect)}%`);
}

/* returns the correct set of data cols for the selected medal type */
function get_metric_config(metric, d) {
    if (metric === "gold") {
        return {
            metricLabel: "Gold",
            host: d.gold_host,
            baseline: d.baseline_gold,
            effect: d.host_effect_gold,
            minus2: d.gold_2_before,
            minus1: d.gold_1_before,
            plus1: d.gold_1_after,
            plus2: d.gold_2_after
        };
    }

    if (metric === "silver") {
        return {
            metricLabel: "Silver",
            host: d.silver_host,
            baseline: d.baseline_silver,
            effect: d.host_effect_silver,
            minus2: d.silver_2_before,
            minus1: d.silver_1_before,
            plus1: d.silver_1_after,
            plus2: d.silver_2_after
        };
    }

    if (metric === "bronze") {
        return {
            metricLabel: "Bronze",
            host: d.bronze_host,
            baseline: d.baseline_bronze,
            effect: d.host_effect_bronze,
            minus2: d.bronze_2_before,
            minus1: d.bronze_1_before,
            plus1: d.bronze_1_after,
            plus2: d.bronze_2_after
        };
    }

    return {
        metricLabel: "Total",
        host: d.total_host,
        baseline: d.baseline_total,
        effect: d.host_effect_total,
        minus2: d.total_2_before,
        minus1: d.total_1_before,
        plus1: d.total_1_after,
        plus2: d.total_2_after
    };
}

/* keep the numbers clean */
function formatMaybe(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    return Number.isInteger(value) ? value : value.toFixed(1);
}