document.addEventListener('DOMContentLoaded', function () {
    // Load the Excel data
    fetch("Data/YouGov_2024_general_election_MRP_2_cleaned.xlsx")
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: true });

            // Parse the data
            jsonData.forEach(d => {
                d.ConShare = parseFloat(d.ConShare);
                d.LabShare = parseFloat(d.LabShare);
                d.LibDemShare = parseFloat(d.LibDemShare);
                d.GreenShare = parseFloat(d.GreenShare);
                d.ReformShare = parseFloat(d.ReformShare);
                d.PlaidShare = parseFloat(d.PlaidShare);
                d.SNPShare = parseFloat(d.SNPShare);
                d.OthersShare = parseFloat(d.OthersShare);
            });

            // Define party colors with hardcoded mapping
            const partyColors = {
                'Labour': '#DC241f',
                'Conservatives': '#0087DC',
                'Lib Dems': '#FDBB30',
                'Green': '#6AB023',
                'Reform': '#12B6CF',
                'Plaid': '#3F8428',
                'SNP': '#FDF38E',
                'Others': '#808080'
            };

            // Function to lighten colors
            function lightenColor(color, percent) {
                const num = parseInt(color.slice(1), 16),
                    amt = Math.round(2.55 * percent),
                    R = (num >> 16) + amt,
                    G = (num >> 8 & 0x00FF) + amt,
                    B = (num & 0x0000FF) + amt;
                return `#${(0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
                             (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
                             (B < 255 ? B < 1 ? 0 : B : 255))
                            .toString(16).slice(1).toUpperCase()}`;
            }

            // Bar Chart: Number of Constituencies Won by Each Party
            const barData = d3.rollup(jsonData, v => v.length, d => d.Winner2024);
            const barChartData = Array.from(barData, ([party, count]) => ({ party, count }));
            barChartData.sort((a, b) => d3.descending(a.count, b.count));

            const barChartWidth = 400;
            const barChartHeight = 300;

            const barSvg = d3.select("#barChart")
                .append("svg")
                .attr("width", barChartWidth + 50)
                .attr("height", barChartHeight + 50)
                .append("g")
                .attr("transform", "translate(50,10)");

            const barX = d3.scaleBand()
                .domain(barChartData.map(d => d.party))
                .range([0, barChartWidth])
                .padding(0.1);

            const barY = d3.scaleLinear()
                .domain([0, d3.max(barChartData, d => d.count)])
                .nice()
                .range([barChartHeight, 0]);

            const barRects = barSvg.selectAll(".bar")
                .data(barChartData)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => barX(d.party))
                .attr("y", d => barY(d.count))
                .attr("width", barX.bandwidth())
                .attr("height", d => barChartHeight - barY(d.count))
                .attr("fill", d => partyColors[d.party])
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .attr("fill", lightenColor(partyColors[d.party], -20));
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                        .attr("fill", partyColors[d.party]);
                });

            // Add data labels
            barSvg.selectAll(".text")
                .data(barChartData)
                .enter()
                .append("text")
                .attr("class", "label")
                .attr("x", d => barX(d.party) + barX.bandwidth() / 2)
                .attr("y", d => barY(d.count) - 5)
                .attr("text-anchor", "middle")
                .text(d => d.count);

            barSvg.append("g")
                .attr("transform", `translate(0, ${barChartHeight})`)
                .call(d3.axisBottom(barX))
                .append("text")
                .attr("y", 35)
                .attr("x", barChartWidth / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "black")
                ;

            barSvg.append("g")
                .call(d3.axisLeft(barY))
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -40)
                .attr("x", -barChartHeight / 2)
                .attr("dy", "-5.1em")
                .attr("text-anchor", "middle")
                .attr("fill", "black")
                ;

            // Pie Chart: Overall Vote Share by Each Party
            const totalShare = d3.sum(jsonData, d => d.TotalShare);

            const pieData = [
                { party: 'Conservatives', share: d3.sum(jsonData, d => d.ConShare) / totalShare * 100 },
                { party: 'Labour', share: d3.sum(jsonData, d => d.LabShare) / totalShare * 100 },
                { party: 'Lib Dems', share: d3.sum(jsonData, d => d.LibDemShare) / totalShare * 100 },
                { party: 'Green', share: d3.sum(jsonData, d => d.GreenShare) / totalShare * 100 },
                { party: 'Reform', share: d3.sum(jsonData, d => d.ReformShare) / totalShare * 100 },
                { party: 'Plaid', share: d3.sum(jsonData, d => d.PlaidShare) / totalShare * 100 },
                { party: 'SNP', share: d3.sum(jsonData, d => d.SNPShare) / totalShare * 100 },
                { party: 'Others', share: d3.sum(jsonData, d => d.OthersShare) / totalShare * 100 },
            ];

            const pieChartWidth = 900;
            const pieChartHeight = 300;
            const radius = Math.min(pieChartWidth, pieChartHeight) / 2;

            const pieSvg = d3.select("#pieChart")
                .append("svg")
                .attr("width", pieChartWidth + 200)
                .attr("height", pieChartHeight + 200)
                .append("g")
                .attr("transform", `translate(${(pieChartWidth + 200) / 2}, ${(pieChartHeight + 200) / 2})`);

            const pie = d3.pie()
                .value(d => d.share);

            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            const outerArc = d3.arc()
                .innerRadius(radius * 1.3) // Adjusted inner radius
                .outerRadius(radius * 1.3); // Adjusted outer radius

            const piePaths = pieSvg.selectAll('path')
                .data(pie(pieData))
                .enter()
                .append('path')
                .attr('d', arc)
                .attr('fill', d => partyColors[d.data.party])
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .attr("fill", lightenColor(partyColors[d.data.party], -20));
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                        .attr("fill", partyColors[d.data.party]);
                });

            
            pieSvg.selectAll('polyline')
                .data(pie(pieData))
                .enter()
                .append('polyline')
                .attr('stroke', 'grey')  // Changed line color to grey
                .attr('stroke-width', '0.5px')  
                .attr('fill', 'none')
                .attr('points', function(d) {
                    const posA = arc.centroid(d); // line start position
                    const posB = outerArc.centroid(d); // line end position
                    let posC = outerArc.centroid(d); // label position
                    const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                    posC[0] = radius * 1.4 * (midangle < Math.PI ? 1 : -1);
                    if (d.data.party === 'Plaid') {
                        posC[0] = radius * 1.4; // Always place on the right
                    } else if (d.data.party === 'Others') {
                        posC[0] = radius * 1.4;
                        posC[1] -= 15; // Place higher
                    }
                    return [posA, posB, posC];
                });

            // Add text labels
            pieSvg.selectAll('text')
                .data(pie(pieData))
                .enter()
                .append('text')
                .attr('transform', function(d) {
                    let pos = outerArc.centroid(d);
                    const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                    if (d.data.party === 'Plaid') {
                        pos[0] = radius * 1.45; 
                    } else if (d.data.party === 'Others') {
                        pos[0] = radius * 1.45;
                        pos[1] -= 25; 
                    } else {
                        pos[0] = radius * 1.45 * (midangle < Math.PI ? 1 : -1); 
                    }
                    return `translate(${pos})`;
                })
                .attr('dy', '0.35em')
                .attr('text-anchor', function(d) {
                    if (d.data.party === 'Plaid' || d.data.party === 'Others') {
                        return 'start'; 
                    } else {
                        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                        return (midangle < Math.PI ? 'start' : 'end'); 
                    }
                })
                .style('font-size', '10px')  // Made the text smaller
                .text(d => `${d.data.party}: ${d.data.share.toFixed(1)}%`);










//HEATMAP
// HEATMAP
const regionShares = d3.rollup(jsonData, v => ({
    Con: d3.mean(v, d => d.ConShare),
    Lab: d3.mean(v, d => d.LabShare),
    LibDem: d3.mean(v, d => d.LibDemShare),
    Green: d3.mean(v, d => d.GreenShare),
    Reform: d3.mean(v, d => d.ReformShare),
    Plaid: d3.mean(v, d => d.PlaidShare),
    SNP: d3.mean(v, d => d.SNPShare),
    Others: d3.mean(v, d => d.OthersShare)
}), d => d.Region);

const heatMapData = Array.from(regionShares, ([region, shares]) => ({
    region,
    ...shares
}));

const parties = ['Con', 'Lab', 'LibDem', 'Green', 'Reform', 'Plaid', 'SNP', 'Others'];
const regions = heatMapData.map(d => d.region);

const margin = { top: 10, right: 0, bottom: 50, left: 150 }; // Increased left margin
const heatMapWidth = 400;
const heatMapHeight = 400 - margin.top - margin.bottom;

const heatSvg = d3.select("#heatMap")
    .append("svg")
    .attr("width", heatMapWidth + margin.left + margin.right)
    .attr("height", heatMapHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const heatX = d3.scaleBand()
    .domain(parties)
    .range([0, heatMapWidth])
    .padding(0.2);  // Increased padding to make squares smaller

const heatY = d3.scaleBand()
    .domain(regions)
    .range([0, heatMapHeight])
    .padding(0.2);  // Increased padding to make squares smaller

    
    const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateRdYlBu)  // This provides a diverging color scheme with strong contrast
    .domain([0, 1]);  // Adjust the domain according to your data range


heatSvg.append("g")
    .attr("transform", `translate(0, ${heatMapHeight})`)
    .call(d3.axisBottom(heatX))
    .append("text")
    .attr("y", 40)
    .attr("x", heatMapWidth / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    ;

heatSvg.append("g")
    .attr("transform", "translate(-10, 0)")  // Translate Y-axis to the right
    .call(d3.axisLeft(heatY))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -heatMapHeight / 2)
    .attr("dy", "-5.1em")
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    ;

heatSvg.selectAll()
    .data(heatMapData)
    .enter()
    .append("g")
    .selectAll("rect")
    .data(d => parties.map(key => ({ key, value: d[key], region: d.region })))
    .enter()
    .append("rect")
    .attr("x", d => heatX(d.key))
    .attr("y", d => heatY(d.region))
    .attr("width", heatX.bandwidth())
    .attr("height", heatY.bandwidth())
    .attr("fill", d => colorScale(d.value));  // Use color scale here

heatSvg.selectAll()
    .data(heatMapData)
    .enter()
    .append("g")
    .selectAll("text")
    .data(d => parties.map(key => ({ key, value: d[key], region: d.region })))
    .enter()
    .append("text")
    .attr("x", d => heatX(d.key) + heatX.bandwidth() / 2)
    .attr("y", d => heatY(d.region) + heatY.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .text(d => d.value.toFixed(1));

        });
});
