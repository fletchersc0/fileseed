// userActions.js
(function(window) {
    'use strict';
    console.log("UserActions: Script execution started.");

    const SCREEN_TIME_HEAL = -0.005; const DONATION_FACTOR = -0.005;
    let screenLimited = false; let donations = { water: 0, soil: 0, trees: 0, air: 0 };

    function displayDonations() {
        const displayEl = document.getElementById('currentDonationsDisplay');
        if (displayEl) {
            let html = '<p><strong>Active Donations (per interval):</strong></p><ul>'; let has = false;
            for (const l in donations) { if (donations[l]>0) { html += `<li>${l.charAt(0).toUpperCase()+l.slice(1)}: $${donations[l].toFixed(2)}</li>`; has=true; }}
            if (!has) html += '<li>None</li>'; html += '</ul>'; displayEl.innerHTML = html;
        } else { console.warn("UserActions: 'currentDonationsDisplay' not found at displayDonations time.");}
    }

    const api = {
        toggleScreenTimeLimit: function(isLim) { screenLimited = !!isLim; console.log(`UserActions: Screen time limit: ${screenLimited}`); },
        setDonation: function(layer, amount) {
            if (donations.hasOwnProperty(layer)) { const numAmount = parseFloat(amount); donations[layer] = (!isNaN(numAmount) && numAmount >= 0) ? numAmount : 0; console.log(`UserActions: Donation for ${layer}: $${donations[layer].toFixed(2)}`);}
            else { console.warn(`UserActions: Invalid charity layer "${layer}".`);}
            displayDonations();
        },
        getHealingEffectsForInterval: function() {
            const effects = []; if (screenLimited) effects.push({ delta: SCREEN_TIME_HEAL, targetLayerName: null });
            for (const l in donations) { if (donations[l]>0) effects.push({ delta: donations[l]*DONATION_FACTOR, targetLayerName: l });}
            return effects;
        },
        init: function() {
            console.log("UserActions: init() called.");
            try {
                const screenToggle = document.getElementById('screenTimeToggle');
                if (screenToggle) { screenToggle.addEventListener('change', (e)=>api.toggleScreenTimeLimit(e.target.checked)); api.toggleScreenTimeLimit(screenToggle.checked); }
                else { console.warn("UserActions: 'screenTimeToggle' not found."); }
                const addDonation = document.getElementById('addDonationBtn');
                if (addDonation) { addDonation.addEventListener('click', () => { const cs = document.getElementById('charityTypeSelect'); const ai = document.getElementById('donationAmountInput'); if (cs&&ai) api.setDonation(cs.value, ai.value); else console.warn("UserActions: Charity select/amount input not found on click."); });}
                else { console.warn("UserActions: 'addDonationBtn' not found."); }
                displayDonations();
            } catch (e) { console.error("UserActions: Error during init()", e); }
            console.log("UserActions: init() finished.");
        }
    };
    window.userActions = api; console.log("UserActions: API exposed on window.");
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', api.init); } else { api.init(); }
})(window);