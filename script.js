// Simulation Data with Updated Emission Factors and Consumption Rates
const fuelData = {
    'Diesel': {
        emissionFactor_CO2: 3.17,   // kg CO₂ per kg of fuel
        emissionFactor_NOx: 0.02,   // kg NOₓ per kg of fuel
        consumptionRate: 0.18,      // tons per nautical mile
        color: '#1f77b4'
    },
    'LNG': {
        emissionFactor_CO2: 2.75,      // kg CO₂ per kg of fuel
        emissionFactor_NOx: 0.015,  // kg NOₓ per kg of fuel
        consumptionRate: 0.15,      // tons per nautical mile
        color: '#ff7f0e'
    },
    'Hydrogen': {
        emissionFactor_CO2: 0,         // kg CO₂ per kg of fuel
        emissionFactor_NOx: 0,         // kg NOₓ per kg of fuel
        consumptionRate: 0.20,      // tons per nautical mile
        color: '#2ca02c'
    },
    'Methanol': {
        emissionFactor_CO2: 1.37,      // kg CO₂ per kg of fuel
        emissionFactor_NOx: 0.02,      // kg NOₓ per kg of fuel
        consumptionRate: 0.22,      // tons per nautical mile
        color: '#d62728'
    },
    'Ammonia': {
        emissionFactor_CO2: 0,         // kg CO₂ per kg of fuel
        emissionFactor_NOx: 0.01,      // kg NOₓ per kg of fuel
        consumptionRate: 0.25,      // tons per nautical mile
        color: '#9467bd'
    }
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
    const baseline_CO2 = distance * fuelData[baselineFuel].consumptionRate * 1000 * fuelData[baselineFuel].emissionFactor_CO2;

    // Initialize results
    const mean_CO2 = {};
    const mean_NOx = {};
    const confIntervals_CO2 = {};
    const confIntervals_NOx = {};
    const emissionReductions_CO2 = {};
    const colors = [];

    // Run Monte Carlo simulations for each fuel
    selectedFuels.forEach(fuel => {
        const data = fuelData[fuel];

        // Generate random samples for consumption rates
        const consumptionSamples = randomNormal(numSimulations, data.consumptionRate, consumptionVariability * data.consumptionRate);

        // Generate random samples for emission factors
        const emissionSamples_CO2 = randomNormal(numSimulations, data.emissionFactor_CO2, emissionVariability * data.emissionFactor_CO2);
        const emissionSamples_NOx = randomNormal(numSimulations, data.emissionFactor_NOx, emissionVariability * data.emissionFactor_NOx);

        // Calculate emissions (kg)
        const emissions_CO2 = consumptionSamples.map((consumption, i) => distance * consumption * 1000 * emissionSamples_CO2[i]);
        const emissions_NOx = consumptionSamples.map((consumption, i) => distance * consumption * 1000 * emissionSamples_NOx[i]);

        // Calculate mean and confidence intervals
        mean_CO2[fuel] = mean(emissions_CO2);
        mean_NOx[fuel] = mean(emissions_NOx);
        confIntervals_CO2[fuel] = confidenceInterval(emissions_CO2);
        confIntervals_NOx[fuel] = confidenceInterval(emissions_NOx);

        // Calculate emission reductions compared to baseline
        emissionReductions_CO2[fuel] = ((baseline_CO2 - mean_CO2[fuel]) / baseline_CO2) * 100;

        // Collect colors
        colors.push(data.color);
    });

    // Generate plots
    plot('co2-plot', 'CO₂ Emissions with Confidence Intervals', selectedFuels, mean_CO2, confIntervals_CO2, colors);
    plot('nox-plot', 'NOₓ Emissions with Confidence Intervals', selectedFuels, mean_NOx, confIntervals_NOx, colors);

    // Display results
    displayResults(selectedFuels, baselineFuel, mean_CO2, confIntervals_CO2, mean_NOx, confIntervals_NOx, emissionReductions_CO2);
}

function plot(containerId, title, fuels, means, confIntervals, colors) {
    const data = fuels.map((fuel) => {
        return {
            x: [fuel],
            y: [means[fuel]],
            error_y: {
                type: 'data',
                visible: true,
                array: [confIntervals[fuel][1] - means[fuel]],
                arrayminus: [means[fuel] - confIntervals[fuel][0]],
                color: '#000',
                thickness: 1.5,
                width: 3,
            },
            type: 'bar',
            name: fuel,
            marker: {
                color: fuelData[fuel].color,
                line: {
                    color: 'rgba(0,0,0,0.1)',
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
                family: 'Arial, sans-serif',
                size: 18,
                color: '#333',
            },
        },
        xaxis: {
            title: 'Fuel Type',
            tickfont: {
                size: 12,
                color: '#333',
            },
        },
        yaxis: {
            title: 'Emissions (kg)',
            tickfont: {
                size: 12,
                color: '#333',
            },
        },
        plot_bgcolor: '#fff',
        paper_bgcolor: '#fff',
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

    Plotly.newPlot(containerId, data, layout, config);
}

function displayResults(fuels, baselineFuel, mean_CO2, confIntervals_CO2, mean_NOx, confIntervals_NOx, emissionReductions_CO2) {
    const resultsContainer = document.getElementById('results');
    let html = `<h2>Simulation Results</h2>`;
    fuels.forEach(fuel => {
        html += `
            <h3>${fuel}</h3>
            <ul>
                <li>Mean CO₂ Emissions: ${mean_CO2[fuel].toFixed(2)} kg (95% CI: ${confIntervals_CO2[fuel][0].toFixed(2)} - ${confIntervals_CO2[fuel][1].toFixed(2)} kg)</li>
                <li>Mean NOₓ Emissions: ${mean_NOx[fuel].toFixed(2)} kg (95% CI: ${confIntervals_NOx[fuel][0].toFixed(2)} - ${confIntervals_NOx[fuel][1].toFixed(2)} kg)</li>
                ${fuel !== baselineFuel ? `<li>CO₂ Emission Reduction Compared to ${baselineFuel}: ${emissionReductions_CO2[fuel].toFixed(2)}%</li>` : ''}
            </ul>
        `;
    });
    resultsContainer.innerHTML = html;
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
    const upperIndex = Math.ceil(data.length * 0.975) - 1;
    return [data[lowerIndex], data[upperIndex]];
}
