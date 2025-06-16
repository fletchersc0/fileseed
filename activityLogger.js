// activityLogger.js
(function(window) {
    'use strict';
    console.log("ActivityLogger: Script execution started.");

    const CO2_PER_PAGE_LOAD = 1.0;
    const CO2_PER_SEARCH_LLM = 0.5;
    const CO2_PER_MEDIA_MINUTE = 5.0;
    let activityData = { pageLoads: 0, searchesLLM: 0, mediaMinutesStreamed: 0 };

    function calculateAccumulatedCO2() { return (activityData.pageLoads * CO2_PER_PAGE_LOAD) + (activityData.searchesLLM * CO2_PER_SEARCH_LLM) + (activityData.mediaMinutesStreamed * CO2_PER_MEDIA_MINUTE); }
    function resetCounters() { activityData.pageLoads = 0; activityData.searchesLLM = 0; activityData.mediaMinutesStreamed = 0; }

    const api = {
        logPageView: function() { activityData.pageLoads++; api.updateDisplay(); },
        logSearchOrLLMQuery: function() { activityData.searchesLLM++; api.updateDisplay(); },
        logMediaStreamed: function(minutes) { if (typeof minutes === 'number' && minutes > 0) activityData.mediaMinutesStreamed += minutes; api.updateDisplay(); },
        getAndResetAccumulatedCO2: function() { const co2 = calculateAccumulatedCO2(); resetCounters(); api.updateDisplay(); return co2; },
        updateDisplay: function() {
            const displayEl = document.getElementById('activityLogDisplay');
            if (displayEl) {
                const currentCO2 = calculateAccumulatedCO2();
                displayEl.innerHTML = `<p><strong>Simulated Activity Monitor (Current Period):</strong></p><ul>` +
                    `<li>Page Loads: ${activityData.pageLoads} (CO2: ${(activityData.pageLoads * CO2_PER_PAGE_LOAD).toFixed(1)}g)</li>` +
                    `<li>Searches/LLM: ${activityData.searchesLLM} (CO2: ${(activityData.searchesLLM * CO2_PER_SEARCH_LLM).toFixed(1)}g)</li>` +
                    `<li>Media Streamed: ${activityData.mediaMinutesStreamed.toFixed(1)} mins (CO2: ${(activityData.mediaMinutesStreamed * CO2_PER_MEDIA_MINUTE).toFixed(1)}g)</li>` +
                    `<li><strong>Total CO2 this period (approx): ${currentCO2.toFixed(1)}g</strong></li></ul>`;
            } else { console.warn("ActivityLogger: 'activityLogDisplay' element not found at updateDisplay time."); }
        },
        _simulationIntervalId: null,
        startAutomatedSimulation: function(interval = 10) { api.stopAutomatedSimulation(); api._simulationIntervalId = setInterval(() => { const r = Math.random(); if (r < 0.4) api.logPageView(); else if (r < 0.7) api.logSearchOrLLMQuery(); else api.logMediaStreamed(Math.random()*5+1); }, interval*1000); console.log(`ActivityLogger: Auto-sim started (interval ${interval}s).`); },
        stopAutomatedSimulation: function() { if (api._simulationIntervalId) { clearInterval(api._simulationIntervalId); api._simulationIntervalId = null; console.log("ActivityLogger: Auto-sim stopped."); } },
        init: function() {
            console.log("ActivityLogger: init() called.");
            try {
                api.updateDisplay();
                const btnMap = {'simPageViewBtn':()=>api.logPageView(), 'simSearchBtn':()=>api.logSearchOrLLMQuery(), 'simMediaBtn':()=>api.logMediaStreamed(10), 'startAutoSimBtn':()=>api.startAutomatedSimulation(5), 'stopAutoSimBtn':()=>api.stopAutomatedSimulation()};
                for (const id in btnMap) {
                    const btn = document.getElementById(id);
                    if (btn) btn.addEventListener('click', btnMap[id]);
                    else console.warn(`ActivityLogger: Button '${id}' not found in init.`);
                }
            } catch (e) { console.error("ActivityLogger: Error during init()", e); }
            console.log("ActivityLogger: init() finished.");
        }
    };
    window.activityLogger = api; console.log("ActivityLogger: API exposed on window.");
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', api.init); } else { api.init(); }
})(window);