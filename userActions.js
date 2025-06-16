// userActions.js
(function(window) {
    'use strict';
    console.log("UserActions: Script execution started. Granular Charity Support Version.");

    // Ensure charitiesData is loaded
    if (typeof charitiesData === 'undefined' || !Array.isArray(charitiesData)) {
        console.error("UserActions: charitiesData is not loaded or not an array! Check script load order in HTML.");
        // Provide a fallback to prevent further errors if charitiesData is missing
        window.charitiesData = []; // Assign to window to avoid 'charitiesData is not defined' if it truly wasn't.
    }


    const SCREEN_TIME_HEAL_DELTA = -0.005; // Fixed delta for screen time
    const SUPPORT_POINT_TO_HEAL_DELTA_FACTOR = -0.005; // Each "point" translates to this much healing delta

    const SUPPORT_TIERS = {
        "0": { points: 0, label: "None (0 pts)" },
        "1": { points: 1, label: "Tier 1 (1 pt)" },
        "3": { points: 3, label: "Tier 2 (3 pts)" },
        "5": { points: 5, label: "Tier 3 (5 pts)" }
    };

    let screenTimeLimited = false;
    let charitySupportLevels = {}; // Stores { charityId: pointsValue, ... }

    function initializeCharitySupportLevels() {
        charitiesData.forEach(charity => {
            charitySupportLevels[charity.id] = 0; // Default to 0 points (None)
        });
    }

    function buildCharitySelectionUI() {
        const uiArea = document.getElementById('charitySelectionUiArea');
        if (!uiArea) {
            console.warn("UserActions: 'charitySelectionUiArea' not found.");
            return;
        }
        uiArea.innerHTML = ''; // Clear previous content (e.g., "Loading...")

        const categories = {};
        charitiesData.forEach(charity => {
            if (!categories[charity.category]) {
                categories[charity.category] = [];
            }
            categories[charity.category].push(charity);
        });

        for (const categoryName in categories) {
            const categoryGroupDiv = document.createElement('div');
            categoryGroupDiv.className = 'charity-category-group';
            
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = `Support ${categoryName} Initiatives:`;
            categoryGroupDiv.appendChild(categoryHeader);

            categories[categoryName].forEach(charity => {
                const charityItemDiv = document.createElement('div');
                charityItemDiv.className = 'charity-item';
                
                const charityNameStrong = document.createElement('strong');
                charityNameStrong.textContent = charity.name;
                charityItemDiv.appendChild(charityNameStrong);
                charityItemDiv.appendChild(document.createElement('br'));

                for (const tierValue in SUPPORT_TIERS) {
                    const tier = SUPPORT_TIERS[tierValue];
                    const labelEl = document.createElement('label');
                    const radioEl = document.createElement('input');
                    radioEl.type = 'radio';
                    radioEl.name = `support_${charity.id}`; // Unique name per charity
                    radioEl.value = tier.points;
                    radioEl.id = `radio_${charity.id}_${tier.points}`;
                    if (tier.points === 0) radioEl.checked = true; // Default to "None"

                    labelEl.htmlFor = radioEl.id;
                    labelEl.appendChild(radioEl);
                    labelEl.appendChild(document.createTextNode(` ${tier.label}`));
                    charityItemDiv.appendChild(labelEl);
                }
                categoryGroupDiv.appendChild(charityItemDiv);
            });
            uiArea.appendChild(categoryGroupDiv);
        }
    }
    
    function updateCharitySupportSummaryDisplay() {
        const displayEl = document.getElementById('currentSupportDisplay');
        if (!displayEl) {
            console.warn("UserActions: 'currentSupportDisplay' element not found.");
            return;
        }

        let html = '<h3>Current Support Commitments (per interval):</h3><ul>';
        let hasActiveSupport = false;

        charitiesData.forEach(charity => {
            const points = charitySupportLevels[charity.id] || 0;
            if (points > 0) {
                const tierLabel = Object.values(SUPPORT_TIERS).find(t => t.points === points)?.label || `${points} pts`;
                html += `<li><strong>${charity.name} (${charity.category}):</strong> ${tierLabel}</li>`;
                hasActiveSupport = true;
            }
        });
        
        if (screenTimeLimited) {
             html += `<li><strong>Global:</strong> Screen Time Limit Active (Gentle Heal)</li>`;
             hasActiveSupport = true;
        }

        if (!hasActiveSupport) {
            html += '<li>No support commitments active.</li>';
        }
        html += '</ul>';
        displayEl.innerHTML = html;
    }


    function applyAndStoreSupportSettings() {
        console.log("UserActions: Applying support settings.");
        charitiesData.forEach(charity => {
            const radioGroupName = `support_${charity.id}`;
            const selectedRadio = document.querySelector(`input[name="${radioGroupName}"]:checked`);
            if (selectedRadio) {
                charitySupportLevels[charity.id] = parseInt(selectedRadio.value, 10);
            } else {
                charitySupportLevels[charity.id] = 0; // Default to 0 if somehow none is selected
            }
        });
        // Screen time limit is updated directly by its event listener
        updateCharitySupportSummaryDisplay();
        console.log("UserActions: Stored support levels:", charitySupportLevels);
    }

    function displayCharityDetailsModal() {
        const modalBody = document.getElementById('charityDetailsModalBody');
        const modal = document.getElementById('charityDetailsModal');
        if (!modalBody || !modal) {
            console.warn("UserActions: Charity details modal elements not found.");
            return;
        }
        modalBody.innerHTML = ''; // Clear previous content

        charitiesData.forEach(charity => {
            const card = document.createElement('div');
            card.className = 'charity-detail-card';
            card.innerHTML = `
                <h3>${charity.name} (${charity.category})</h3>
                <p><strong>Website:</strong> <a href="${charity.website}" target="_blank" rel="noopener noreferrer">${charity.website}</a></p>
                <p><strong>Mission Highlights:</strong> ${charity.missionHighlights}</p>
                <p><strong>Quality Signals:</strong> ${charity.qualitySignals}</p>
            `;
            modalBody.appendChild(card);
        });
        modal.style.display = 'block';
    }

    function hideCharityDetailsModal() {
        const modal = document.getElementById('charityDetailsModal');
        if (modal) modal.style.display = 'none';
    }


    const api = {
        getHealingEffectsForInterval: function() {
            const effects = [];
            // Add effects from charity support
            for (const charityId in charitySupportLevels) {
                const pointsValue = charitySupportLevels[charityId];
                if (pointsValue > 0) {
                    const charity = charitiesData.find(c => c.id === charityId);
                    if (charity) {
                        const delta = pointsValue * SUPPORT_POINT_TO_HEAL_DELTA_FACTOR;
                        effects.push({ delta: delta, targetLayerName: charity.category.toLowerCase() });
                         console.log(`UserActions: Healing effect for ${charity.name} (${charity.category}): ${delta.toFixed(4)} from ${pointsValue} pts`);
                    }
                }
            }

            // Add effect from screen time limit
            if (screenTimeLimited) {
                effects.push({ delta: SCREEN_TIME_HEAL_DELTA, targetLayerName: null }); // Null target means global
                console.log(`UserActions: Screen time global heal effect: ${SCREEN_TIME_HEAL_DELTA}`);
            }
            return effects;
        },
        init: function() {
            console.log("UserActions: init() called.");
            try {
                initializeCharitySupportLevels();
                buildCharitySelectionUI(); // Dynamically create the charity selection UI

                const screenToggle = document.getElementById('screenTimeToggle');
                if (screenToggle) {
                    screenToggle.addEventListener('change', (e) => {
                        screenTimeLimited = e.target.checked;
                        console.log(`UserActions: Screen time limit toggled: ${screenTimeLimited}`);
                        updateCharitySupportSummaryDisplay(); // Update summary when this changes
                    });
                    screenTimeLimited = screenToggle.checked; // Initialize based on current state
                } else { console.warn("UserActions: 'screenTimeToggle' not found."); }

                const applySettingsBtn = document.getElementById('applySupportSettingsBtn');
                if (applySettingsBtn) {
                    applySettingsBtn.addEventListener('click', applyAndStoreSupportSettings);
                } else { console.warn("UserActions: 'applySupportSettingsBtn' not found."); }

                const learnMoreBtn = document.getElementById('learnAboutCharitiesBtn');
                if (learnMoreBtn) {
                    learnMoreBtn.addEventListener('click', displayCharityDetailsModal);
                } else { console.warn("UserActions: 'learnAboutCharitiesBtn' not found.");}

                const closeModalBtn = document.getElementById('closeCharityModalBtn');
                if (closeModalBtn) {
                    closeModalBtn.addEventListener('click', hideCharityDetailsModal);
                } else { console.warn("UserActions: 'closeCharityModalBtn' not found.");}
                
                // Close modal if user clicks outside of modal-content
                const charityModal = document.getElementById('charityDetailsModal');
                if (charityModal) {
                    window.addEventListener('click', function(event) {
                        if (event.target == charityModal) {
                            hideCharityDetailsModal();
                        }
                    });
                }


                updateCharitySupportSummaryDisplay(); // Initial display of support summary
            } catch (e) { console.error("UserActions: Error during init()", e); }
            console.log("UserActions: init() finished.");
        }
    };
    window.userActions = api; console.log("UserActions: API exposed on window.");
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', api.init); } else { api.init(); }
})(window);
