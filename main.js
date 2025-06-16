// main.js
(function(window) {
    'use strict';
    console.log("MainSim: Script execution started. Version: GranularCharitySupport-Focus");

    // --- Configuration ---
    const SIZE = 50;
    const TILE = 12;
    const INDIVIDUAL_LAYERS = ["water", "soil", "trees", "air", "animals", "community"]; // Used for individual map drawing
    const ALL_CATEGORIES = ["water", "soil", "trees", "air", "animals", "community"]; // Used for healing targets
    const WEIGHTS = { water: 0.30, air: 0.25, soil: 0.20, trees: 0.15 }; // For global stress/heal distribution
    const SOIL_QUALITY_THRESHOLD = 0.3; const AIR_QUALITY_THRESHOLD = 0.3;
    const INITIAL_COMMUNITIES_COUNT = 10;
    const COMMUNITY_FOUNDING_PROBABILITY = 0.002;
    const COMMUNITY_DEGRADE_HEALTH_THRESHOLD = 0.45;
    const MIN_TREE_DENSITY_FOR_COMMUNITY_FOUNDING = 0.3;
    const MAX_TREE_DENSITY_FOR_COMMUNITY_FOUNDING = 0.7;
    const MIN_TREE_DENSITY_FOR_COMMUNITY_SURVIVAL = 0.15;
    const MAX_TREE_DENSITY_FOR_COMMUNITY_SURVIVAL = 0.8;
    const TREE_STRESS_RESILIENCE_FACTOR = 0.65;
    const TREE_NONE = 0; const TREE_SPARSE = 1; const TREE_NORMAL = 2; const TREE_DENSE = 3;
    const CANVAS_BACKGROUND_COLOR = "#222";

    const PERIODIC_ACTION_INTERVAL = 10 * 60 * 1000;
    // const PERIODIC_ACTION_INTERVAL = 15 * 1000; // For testing
    const CO2_TO_STRESS_FACTOR = 0.001;
    let periodicActionsTimerId = null;
    let nextPeriodicActionTime = 0;
    let countdownIntervalId = null;

    let mask, health, trees, animals, community, airMask;
    let individualCanvases = {};
    let ctxComposite = null;

    const rand = (x,y,s=0)=>Math.abs(Math.sin(x*12.9898+y*78.233+s)*43758.5453)%1;
    const clamp = (v,min,max)=>v<min?min:v>max?max:v;
    const lerpC = (c1,c2,t)=>`rgb(${Math.round(c1[0]+(c2[0]-c1[0])*t)},${Math.round(c1[1]+(c2[1]-c1[1])*t)},${Math.round(c1[2]+(c2[2]-c1[2])*t)})`;

    function initializeDataAndState() {
        console.log(`MainSim: Initializing data arrays for SIZE ${SIZE}x${SIZE} and game state.`);
        mask={water:Array(SIZE).fill(null).map(()=>Array(SIZE).fill(0)),soil:Array(SIZE).fill(null).map(()=>Array(SIZE).fill(0))};
        // Initialize health for all categories, including animals and community (though not directly healed by charities in WEIGHTS)
        health = {};
        ALL_CATEGORIES.forEach(cat => {
            health[cat] = Array(SIZE).fill(null).map(() => Array(SIZE).fill(1));
        });
        // Overwrite specific health for water and soil as they have masks
        health.water=Array(SIZE).fill(null).map(()=>Array(SIZE).fill(1));
        health.soil=Array(SIZE).fill(null).map(()=>Array(SIZE).fill(1));


        trees=Array(SIZE).fill(null).map(()=>Array(SIZE).fill(TREE_NONE)); animals=Array(SIZE).fill(null).map(()=>Array(SIZE).fill(0));
        community=Array(SIZE).fill(null).map(()=>Array(SIZE).fill(0)); airMask=Array(SIZE).fill(null).map(()=>Array(SIZE).fill(1));
        for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){if(rand(x,y)<0.2)mask.water[y][x]=1;else mask.soil[y][x]=1;}
        for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(mask.soil[y][x]&&rand(x,y,1)<0.5)trees[y][x]=TREE_NORMAL;
        let placed=0,att=0; const maxAttempts = SIZE * SIZE * 2;
        while(placed<INITIAL_COMMUNITIES_COUNT && att < maxAttempts){
            const x=Math.floor(rand(att,Date.now())*SIZE); const y=Math.floor(rand(Date.now(),att)*SIZE); att++;
            if(!mask.soil[y][x]||trees[y][x]>TREE_NONE||community[y][x])continue;
            const td=treeDensity(x,y);
            if(nearWater(x,y)&&td>=MIN_TREE_DENSITY_FOR_COMMUNITY_FOUNDING&&td<=MAX_TREE_DENSITY_FOR_COMMUNITY_FOUNDING){ community[y][x]=1;placed++; }
        } console.log(`MainSim: Placed ${placed} initial communities out of ${INITIAL_COMMUNITIES_COUNT} desired.`);
    }

    const treeDensity=(cx,cy,r=2)=>{let t=0,s=0;for(let yy=Math.max(0,cy-r);yy<=Math.min(SIZE-1,cy+r);yy++)for(let xx=Math.max(0,cx-r);xx<=Math.min(SIZE-1,cx+r);xx++)if(mask.soil[yy][xx]){t++;if(trees[yy][xx]>TREE_NONE)s++;}return t?s/t:0;};
    const nearWater=(cx,cy,r=3)=>{for(let yy=Math.max(0,cy-r);yy<=Math.min(SIZE-1,cy+r);yy++)for(let xx=Math.max(0,cx-r);xx<=Math.min(SIZE-1,cx+r);xx++)if(mask.water[yy][xx])return true;return false;};
    const compositeHealth=(x,y)=>mask.water[y][x]?health.water[y][x]:(health.soil[y][x]+airMask[y][x])/2; // This might need review if animals/community health matters
    
    function updateAnimals(){
        // Animal presence can depend on general land health (soil, trees) and air quality.
        // For now, we assume animals are not directly "healed" by donations but benefit from overall ecosystem health.
        for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
            if(!mask.soil[y][x]||community[y][x]||health.soil[y][x]<SOIL_QUALITY_THRESHOLD||airMask[y][x]<AIR_QUALITY_THRESHOLD){animals[y][x]=0;continue;}
            animals[y][x]=(rand(x,y,Date.now())<compositeHealth(x,y)*(trees[y][x]>TREE_NONE?1:0)*0.35)?1:0;
        }
    }
    function updateCommunities(){
        // Community presence can depend on water, land health, and tree density.
        // Not directly "healed" by donations but benefits from overall ecosystem health.
        for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
            if(!mask.soil[y][x]){community[y][x]=0;continue;}
            const cH=compositeHealth(x,y),sH=health.soil[y][x],aH=airMask[y][x],tD=treeDensity(x,y);
            if(community[y][x]){
                if(cH<COMMUNITY_DEGRADE_HEALTH_THRESHOLD||tD>MAX_TREE_DENSITY_FOR_COMMUNITY_SURVIVAL||tD<MIN_TREE_DENSITY_FOR_COMMUNITY_SURVIVAL||sH<SOIL_QUALITY_THRESHOLD||aH<AIR_QUALITY_THRESHOLD||trees[y][x]>TREE_NONE)community[y][x]=0;
            }else{
                if(animals[y][x]||trees[y][x]>TREE_NONE||sH<SOIL_QUALITY_THRESHOLD||aH<AIR_QUALITY_THRESHOLD)continue;
                if(nearWater(x,y)&&tD>=MIN_TREE_DENSITY_FOR_COMMUNITY_FOUNDING&&tD<=MAX_TREE_DENSITY_FOR_COMMUNITY_FOUNDING&&cH>0.75&&rand(x,y,Date.now())<COMMUNITY_FOUNDING_PROBABILITY)community[y][x]=1;
            }
        }
    }
    function diffuseAir(){const tA=Array(SIZE).fill(null).map(()=>Array(SIZE).fill(0));for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){let s=0,c=0;for(let yy=Math.max(0,y-1);yy<=Math.min(SIZE-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(SIZE-1,x+1);xx++){s+=airMask[yy][xx];c++;}tA[y][x]=c?s/c:airMask[y][x];}for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)airMask[y][x]=airMask[y][x]*0.8+tA[y][x]*0.2;}

    const PALETTE = { waterGood:[42,106,255], waterBad:[15,22,33], soilGood:[139,90,43], soilBad:[210,180,140], airGood:[173,216,230], airBad:[100,100,100], treeSparse:[144,238,144],treeNormal:[46,139,87],treeDense:[0,100,0], animal:"#f5e642", community:"#ff8c00"};
    function drawCompositeMap() {
        if (!ctxComposite) return; ctxComposite.clearRect(0,0,SIZE*TILE,SIZE*TILE);
        for (let y=0;y<SIZE;y++) for (let x=0;x<SIZE;x++) {
            let tileColor=CANVAS_BACKGROUND_COLOR;
            if(mask.water[y][x]) tileColor=lerpC(PALETTE.waterBad,PALETTE.waterGood,health.water[y][x]);
            else if(mask.soil[y][x]){
                tileColor=lerpC(PALETTE.soilBad,PALETTE.soilGood,health.soil[y][x]);
                if(trees[y][x]>TREE_NONE) tileColor=trees[y][x]===TREE_SPARSE?`rgb(${PALETTE.treeSparse.join()})`:trees[y][x]===TREE_NORMAL?`rgb(${PALETTE.treeNormal.join()})`:`rgb(${PALETTE.treeDense.join()})`;
                if(animals[y][x]) tileColor=PALETTE.animal;
                if(community[y][x]) tileColor=PALETTE.community;
            }
            ctxComposite.fillStyle=tileColor; ctxComposite.fillRect(x*TILE,y*TILE,TILE,TILE);
        }
        ctxComposite.fillStyle="#000"; ctxComposite.font="bold 12px sans-serif"; ctxComposite.fillText("Composite View",4,14);
    }
    function drawIndividualLayerMaps() {
        if(Object.keys(individualCanvases).length===0)return;
        const layerDrawFuncs = {
            water: (x,y)=>mask.water[y][x]?lerpC(PALETTE.waterBad,PALETTE.waterGood,health.water[y][x]):CANVAS_BACKGROUND_COLOR,
            soil: (x,y)=>mask.soil[y][x]?lerpC(PALETTE.soilBad,PALETTE.soilGood,health.soil[y][x]):CANVAS_BACKGROUND_COLOR,
            trees: (x,y)=>{if(!mask.soil[y][x])return CANVAS_BACKGROUND_COLOR;switch(trees[y][x]){case TREE_SPARSE:return`rgb(${PALETTE.treeSparse.join()})`;case TREE_NORMAL:return`rgb(${PALETTE.treeNormal.join()})`;case TREE_DENSE:return`rgb(${PALETTE.treeDense.join()})`;default:return CANVAS_BACKGROUND_COLOR;}},
            air: (x,y)=>lerpC(PALETTE.airBad,PALETTE.airGood,airMask[y][x]),
            animals: (x,y)=>animals[y][x]?PALETTE.animal:CANVAS_BACKGROUND_COLOR,
            community: (x,y)=>community[y][x]?PALETTE.community:CANVAS_BACKGROUND_COLOR
        };
        for(const layer of INDIVIDUAL_LAYERS){ // INDIVIDUAL_LAYERS defined for canvas creation
            if(!individualCanvases[layer]||!individualCanvases[layer].getContext)continue;
            const ctx=individualCanvases[layer].getContext('2d'); ctx.clearRect(0,0,SIZE*TILE,SIZE*TILE);
            for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){ctx.fillStyle=layerDrawFuncs[layer](x,y);ctx.fillRect(x*TILE,y*TILE,TILE,TILE);}
            ctx.fillStyle="#fff";ctx.font="12px sans-serif";ctx.fillText(layer==='air'?`${layer} ${Math.round(avgLayerValue(airMask)*100)}%`:layer,4,14);
        }
    }
    function drawAllMaps() { try { drawIndividualLayerMaps(); drawCompositeMap(); updateCache(); } catch(e){ console.error("MainSim: Error in drawAllMaps", e);}}
    function avgLayerValue(arr,pMask){let s=0,c=0;for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){if(pMask){if(pMask[y][x]){s+=arr[y][x];c++;}}else{s+=arr[y][x];c++;}}return c?s/c:0;}
    function percentPresence(arr,isTree){let p=0,r=0;for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){if(isTree){if(mask.soil[y][x]){r++;if(arr[y][x]>TREE_NONE)p++;}}else{r++;if(arr[y][x]===1)p++;}}return r?(p/r)*100:0;}
    function updateCache(){const cd=document.getElementById("cache");if(!cd)return;cd.innerHTML="<h2>Ecosystem Stats</h2>";const add=(l,v)=>{const d=document.createElement("div");d.className="cache-item";d.textContent=`${l}: ${v}`;cd.appendChild(d);};add("Water Health",(avgLayerValue(health.water,mask.water)*100).toFixed(0)+"%");add("Soil Health",(avgLayerValue(health.soil,mask.soil)*100).toFixed(0)+"%");add("Tree Coverage",percentPresence(trees,true).toFixed(0)+"% soil");add("Air Quality",(avgLayerValue(airMask)*100).toFixed(0)+"%");add("Animal Presence",percentPresence(animals).toFixed(0)+"% map");add("Community Presence",percentPresence(community).toFixed(0)+"% map");}

    // This function applies stress or healing to the simulation
    function applyStressToSimulation(overallDelta, targetLayerName = null) {
        // Note: targetLayerName here can be 'water', 'soil', 'trees', 'air'.
        // 'animals' and 'community' are not directly targeted by WEIGHTS for global stress/heal,
        // and user healing actions from userActions.js will also target these core categories.
        // Their health/presence is an emergent property of the health of these core layers.
        console.log(`MainSim: applyStressToSimulation. Delta: ${overallDelta.toFixed(4)}, Target: ${targetLayerName || "Global"}`);
        
        const layersToProcess = [];
        if (targetLayerName) { // Specific layer targeted (e.g., by user healing action)
            // Ensure targetLayerName is one of the core stressable/healable layers
            if (health.hasOwnProperty(targetLayerName.toLowerCase()) || targetLayerName.toLowerCase() === "trees" || targetLayerName.toLowerCase() === "air") {
                 layersToProcess.push({ name: targetLayerName.toLowerCase(), amount: overallDelta });
            } else if (WEIGHTS.hasOwnProperty(targetLayerName.toLowerCase())) { // Fallback for global stress distribution if a WEIGHTS key is passed
                 layersToProcess.push({ name: targetLayerName.toLowerCase(), amount: overallDelta });
            } else {
                console.warn(`MainSim: applyStressToSimulation - Invalid or non-targetable layer "${targetLayerName}".`);
                return;
            }
        } else { // Global stress/heal, distribute according to WEIGHTS
            for (const layerName in WEIGHTS) {
                layersToProcess.push({ name: layerName, amount: overallDelta * WEIGHTS[layerName] });
            }
        }

        if (layersToProcess.length === 0) { console.warn("MainSim: applyStressToSimulation - No valid layers to process."); return; }

        let airWasAffected = false;
        layersToProcess.forEach(({ name, amount }) => {
            if (name === "air") airWasAffected = true;
            // Adjust tile affect count: more tiles for larger impact, fewer for smaller
            const baseTileFactor = 0.1; // Affect ~10% of tiles for a moderate delta
            const tilesToAffectCount = Math.max(1, Math.floor(Math.abs(amount) * SIZE * SIZE * baseTileFactor * 5)); // Ensure at least 1 tile for small deltas, scale up
            
            console.log(`MainSim: Processing layer ${name}, Amount: ${amount.toFixed(4)}, Tiles to affect: ~${tilesToAffectCount}`);

            for (let i = 0; i < tilesToAffectCount; i++) {
                const x = Math.floor(rand(i, Date.now() + name.length) * SIZE);
                const y = Math.floor(rand(Date.now() + name.length, i) * SIZE);
                
                const changeFactor = 0.15; // How much each affected tile changes

                if (name === "water" && mask.water[y][x] && health.water) {
                    health.water[y][x] = clamp(health.water[y][x] + (amount > 0 ? -1 : 1) * changeFactor, 0, 1);
                } else if (name === "soil" && mask.soil[y][x] && health.soil) {
                    health.soil[y][x] = clamp(health.soil[y][x] + (amount > 0 ? -1 : 1) * changeFactor, 0, 1);
                } else if (name === "trees" && mask.soil[y][x]) { // Trees are on soil
                    const currentTreeState = trees[y][x];
                    if (amount > 0) { // Stress
                        if (currentTreeState === TREE_DENSE) trees[y][x] = TREE_NORMAL;
                        else if (currentTreeState === TREE_NORMAL) trees[y][x] = TREE_SPARSE;
                        else if (currentTreeState === TREE_SPARSE) trees[y][x] = TREE_NONE;
                    } else { // Heal (negative amount)
                        if (community[y][x] === 1) continue; // No tree growth on community tiles
                        if (currentTreeState === TREE_NONE) trees[y][x] = TREE_SPARSE;
                        else if (currentTreeState === TREE_SPARSE) trees[y][x] = TREE_NORMAL;
                        else if (currentTreeState === TREE_NORMAL) trees[y][x] = TREE_DENSE;
                    }
                } else if (name === "air") { // Air quality affects all tiles
                    airMask[y][x] = clamp(airMask[y][x] + (amount > 0 ? -1 : 1) * changeFactor, 0, 1);
                }
            }
        });
        if (airWasAffected) diffuseAir();
        console.log("MainSim: applyStressToSimulation finished processing layers.");
    }

    function handleGlobalStress() { console.log("MainSim: Global Stress button clicked."); applyStressToSimulation(0.10, null); updateAnimals(); updateCommunities(); drawAllMaps(); }
    function handleGlobalHeal() { console.log("MainSim: Global Heal button clicked."); applyStressToSimulation(-0.10, null); updateAnimals(); updateCommunities(); drawAllMaps(); }

    function applyCO2StressFromLogger(){
        if(!window.activityLogger|| typeof window.activityLogger.getAndResetAccumulatedCO2 !== 'function') {console.warn("MainSim: activityLogger.getAndResetAccumulatedCO2 not available."); return;}
        const co2=window.activityLogger.getAndResetAccumulatedCO2();
        if(typeof co2!=='number'||isNaN(co2)||co2<=0)return;
        const stressDelta=co2*CO2_TO_STRESS_FACTOR;
        if(stressDelta<=0)return;
        const weightedLayers=Object.keys(WEIGHTS);
        if(!weightedLayers.length)return;
        // Apply CO2 stress proportionally to WEIGHTS (simulating broad environmental impact)
        console.log(`MainSim: Applying CO2 Stress (total delta: ${stressDelta.toFixed(4)}) from ${co2.toFixed(1)}g CO2, distributed by WEIGHTS.`);
        applyStressToSimulation(stressDelta, null); // null target means distribute via WEIGHTS
    }

    function applyUserHealingActions(){
        if(!window.userActions || typeof window.userActions.getHealingEffectsForInterval !== 'function') {console.warn("MainSim: userActions.getHealingEffectsForInterval not available."); return;}
        const healingEffects = window.userActions.getHealingEffectsForInterval();
        if(healingEffects && healingEffects.length > 0){
            console.log("MainSim: Applying user healing actions:", healingEffects);
            healingEffects.forEach(effect => {
                if(typeof effect.delta === 'number' && !isNaN(effect.delta) && effect.delta < 0) { // Ensure delta is negative for healing
                    // targetLayerName from userActions will be 'water', 'soil', 'trees', 'air', or null for global
                     applyStressToSimulation(effect.delta, effect.targetLayerName);
                } else {
                    // console.warn("MainSim: Invalid healing effect received:", effect);
                }
            });
        }
    }

    function processPeriodicActions(){
        console.log("MainSim: Processing periodic actions...");
        applyCO2StressFromLogger();
        applyUserHealingActions();
        updateAnimals(); // Animals update based on new health state
        updateCommunities(); // Communities update based on new health state
        drawAllMaps(); // Redraw everything
        nextPeriodicActionTime=Date.now()+PERIODIC_ACTION_INTERVAL;
    }

    function updateCountdown(){const dE=document.getElementById("periodicActionCountdownDisplay");if(!dE)return;if(nextPeriodicActionTime<=0){dE.textContent="Next Action: (Initializing)";return;}const tL=nextPeriodicActionTime-Date.now();if(tL<=0){dE.textContent="Next Action: Processing...";return;}const s=Math.floor(tL/1000)%60,m=Math.floor(tL/(1000*60));dE.textContent=`Next Action in: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
    function startPeriodicCycle(){if(periodicActionsTimerId)clearInterval(periodicActionsTimerId);if(countdownIntervalId)clearInterval(countdownIntervalId);nextPeriodicActionTime=Date.now()+PERIODIC_ACTION_INTERVAL;periodicActionsTimerId=setInterval(processPeriodicActions,PERIODIC_ACTION_INTERVAL);countdownIntervalId=setInterval(updateCountdown,1000);console.log(`MainSim: Periodic cycle started (interval ${PERIODIC_ACTION_INTERVAL/1000/60}m).`);updateCountdown();}

    function init() {
        console.log("MainSim: init() called.");
        try {
            if (!window.activityLogger || typeof window.activityLogger.getAndResetAccumulatedCO2 !== 'function') { throw new Error("activityLogger API not available or getAndResetAccumulatedCO2 is missing."); }
            if (!window.userActions || typeof window.userActions.getHealingEffectsForInterval !== 'function') { throw new Error("userActions API not available or getHealingEffectsForInterval is missing."); }
            console.log("MainSim: Dependencies (activityLogger, userActions) confirmed.");

            const mapsDiv = document.getElementById("maps");
            if (!mapsDiv) throw new Error("'maps' div for individual layers is missing.");
            INDIVIDUAL_LAYERS.forEach(layer=>{const c=document.createElement("canvas");c.width=c.height=SIZE*TILE;c.className="mapCanvas";c.title=layer;mapsDiv.appendChild(c);individualCanvases[layer]=c;});
            console.log("MainSim: Individual layer canvases created.");

            const compCanvas = document.getElementById("compositeMapCanvas");
            if (!compCanvas) throw new Error("'compositeMapCanvas' element is missing.");
            compCanvas.width=SIZE*TILE; compCanvas.height=SIZE*TILE; ctxComposite=compCanvas.getContext("2d");
            if (!ctxComposite) throw new Error("Failed to get 2D context for compositeMapCanvas.");
            console.log("MainSim: Composite map canvas initialized.");

            initializeDataAndState();
            updateAnimals(); updateCommunities();

            const stressBtnEl = document.getElementById("stressBtn");
            if(stressBtnEl) { stressBtnEl.addEventListener("click", handleGlobalStress); console.log("MainSim: Stress button listener attached."); }
            else { console.warn("MainSim: stressBtn not found."); }

            const healBtnEl = document.getElementById("healBtn");
            if(healBtnEl) { healBtnEl.addEventListener("click", handleGlobalHeal); console.log("MainSim: Heal button listener attached."); }
            else { console.warn("MainSim: healBtn not found."); }
            
            // userActions.init() is called automatically when userActions.js loads and DOM is ready.
            // It will set up its own UI and listeners.

            startPeriodicCycle();
            console.log("MainSim: Performing initial processPeriodicActions and draw.");
            processPeriodicActions();

        } catch (e) {
            console.error("MainSim: CRITICAL ERROR during init():", e.message, e.stack);
            alert(`Simulation critical error: ${e.message}\nCheck console for more details.`);
            if(periodicActionsTimerId) clearInterval(periodicActionsTimerId); if(countdownIntervalId) clearInterval(countdownIntervalId);
            return;
        }
        console.log("MainSim: init() finished successfully. Simulation should be running.");
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
    console.log("MainSim: Script finished parsing.");
})(window);
