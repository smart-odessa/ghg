// Simulation Data
const fuelData = {
    'Diesel': { emissionFactor_CO2: 3.17, emissionFactor_NOx: 0.02, consumptionRate: 0.18, color: '#1f77b4' },
    'LNG': { emissionFactor_CO2: 2.75, emissionFactor_NOx: 0.015, consumptionRate: 0.15, color: '#ff7f0e' },
    'Hydrogen': { emissionFactor_CO2: 0, emissionFactor_NOx: 0, consumptionRate: 0.2, color: '#2ca02c' },
    'Methanol': { emissionFactor_CO2: 1.37, emissionFactor_NOx: 0.02, consumptionRate: 0.22, color: '#d62728' },
    'Ammonia': { emissionFactor_CO2: 0, emissionFactor_NOx: 0.01, consumptionRate: 0.25, color: '#9467bd' }
};

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Update displayed values when sliders change
    ['distance', 'numSimulations', 'consumptionVariability', 'emissionVariability'].forEach(id => {
        const slider = document.getElementById(id);
        const display = document.getElementById(`${id}-value`);
        slider.addEventListener('input', () => {
            display.textContent = slider.value;
        });
    });

    // Run simulation when button is clicked
    document.getElementById('simulate-button').addEventListener('click', runSimulation);

    // Splash Screen Timeout
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 2000); // The splash screen will be visible for 2 seconds
});

// Function to detect mobile devices
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function runSimulation() {
    // Get user inputs
    const distance = parseFloat(document.getElementById('distance').value);
    const numSimulations = parseInt(document.getElementById('numSimulations').value);
    const consumptionVariability = parseFloat(document.getElementById('consumptionVariability').value) / 100;
    const emissionVariability = parseFloat(document.getElementById('emissionVariability').value) / 100;

    const selectedFuels = Array.from(document.querySelectorAll('.fuel-checkbox:checked')).map(cb => cb.value);

    // Check if at least one fuel is selected
    if (selectedFuels.length === 0) {
        alert('Please select at least one fuel to compare.');
        return;
    }

    // Baseline fuel (Diesel if selected, else first selected fuel)
    const baselineFuel = selectedFuels.includes('Diesel') ? 'Diesel' : selectedFuels[0];
    const baseline_CO2 = distance * fuelData[baselineFuel].consumptionRate * fuelData[baselineFuel].emissionFactor_CO2;

    // Initialize results
    const meanEmissions_CO2 = [];
    const meanEmissions_NOx = [];
    const confIntervals_CO2 = [];
    const confIntervals_NOx = [];
    const emissionReductions_CO2 = [];
    const colors = [];

    // Run Monte Carlo simulations for each fuel
    selectedFuels.forEach(fuel => {
        const data = fuelData[fuel];
        const consumptionSamples = randomNormal(numSimulations, data.consumptionRate, consumptionVariability * data.consumptionRate);
        const emissionSamples_CO2 = randomNormal(numSimulations, data.emissionFactor_CO2, emissionVariability * data.emissionFactor_CO2);
        const emissionSamples_NOx = randomNormal(numSimulations, data.emissionFactor_NOx, emissionVariability * data.emissionFactor_NOx);

        const emissions_CO2 = consumptionSamples.map((consumption, i) => distance * consumption * emissionSamples_CO2[i]);
        const emissions_NOx = consumptionSamples.map((consumption, i) => distance * consumption * emissionSamples_NOx[i]);

        // Calculate mean and confidence intervals
        meanEmissions_CO2.push(mean(emissions_CO2));
        meanEmissions_NOx.push(mean(emissions_NOx));
        confIntervals_CO2.push(confidenceInterval(emissions_CO2));
        confIntervals_NOx.push(confidenceInterval(emissions_NOx));

        // Calculate emission reductions compared to baseline
        emissionReductions_CO2.push(((baseline_CO2 - mean(emissions_CO2)) / baseline_CO2) * 100);

        // Collect colors
        colors.push(data.color);
    });

    // Generate plots with different colors
    plotEmissions('co2-plot', 'CO₂ Emissions with Confidence Intervals', selectedFuels, meanEmissions_CO2, confIntervals_CO2, colors);
    plotEmissions('nox-plot', 'NOₓ Emissions with Confidence Intervals', selectedFuels, meanEmissions_NOx, confIntervals_NOx, colors);

    // Display results
    displayResults(selectedFuels, baselineFuel, emissionReductions_CO2);
}

function plotEmissions(containerId, title, fuels, means, confIntervals, colors) {
    const data = fuels.map((fuel, i) => {
        return {
            x: [fuel],
            y: [means[i]],
            error_y: {
                type: 'data',
                symmetric: false,
                array: [confIntervals[i][1] - means[i]],
                arrayminus: [means[i] - confIntervals[i][0]],
                color: 'rgba(0,0,0,0.6)',
                thickness: 1.5,
                width: 3,
            },
            type: 'bar',
            name: fuel,
            marker: {
                color: colors[i],
                line: {
                    color: 'rgba(0,0,0,0.05)',
                    width: 1,
                }
            },
            hoverinfo: 'y',
        };
    });

    const layout = {
        title: {
            text: title,
            font: {
                family: 'SF Pro Display, sans-serif',
                size: 24,
                color: '#1d1d1f',
            },
        },
        xaxis: {
            title: 'Fuel Type',
            tickfont: {
                size: 14,
                color: '#1d1d1f',
            },
        },
        yaxis: {
            title: 'Emissions (kg)',
            tickfont: {
                size: 14,
                color: '#1d1d1f',
            },
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 60, b: 80 },
        bargap: 0.5,
    };

    // Detect if the user is on a mobile device
    const isMobile = isMobileDevice();

    // Adjust Plotly config options based on device
    const config = {
        responsive: true,
        scrollZoom: !isMobile,        // Disable scroll zoom on mobile devices
        displayModeBar: !isMobile,    // Hide mode bar on mobile devices
        doubleClick: false,           // Disable double-tap zoom on mobile
    };

    Plotly.newPlot(containerId, data, layout, config).then(() => {
        Plotly.animate(containerId, {
            data: data
        }, {
            transition: {
                duration: 500,
                easing: 'cubic-in-out'
            },
            frame: {
                duration: 500
            }
        });
    });
}

function displayResults(fuels, baselineFuel, reductions) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<h2>Emission Reductions in CO₂ Compared to ${baselineFuel}:</h2>`;
    const ul = document.createElement('ul');
    fuels.forEach((fuel, i) => {
        if (fuel !== baselineFuel) {
            const li = document.createElement('li');
            li.textContent = `Using ${fuel} achieves an estimated ${reductions[i].toFixed(2)}% reduction in CO₂ emissions compared to ${baselineFuel}.`;
            ul.appendChild(li);
        }
    });
    resultsDiv.appendChild(ul);
}

// Helper functions
function randomNormal(n, mean, stdDev) {
    return Array.from({ length: n }, () => {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); // Convert [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    });
}

function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function confidenceInterval(data) {
    data.sort((a, b) => a - b);
    const lowerIndex = Math.floor(data.length * 0.025);
    const upperIndex = Math.floor(data.length * 0.975);
    return [data[lowerIndex], data[upperIndex]];
}
