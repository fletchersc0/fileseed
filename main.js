// main.js
(function(window) {
    'use strict';
    console.log("MainSim: Script execution started. Version: Size50-Focus");

    // --- Configuration ---
    const SIZE = 50;
    const TILE = 12;
    const INDIVIDUAL_LAYERS = ["water", "soil", "trees", "air", "animals", "community"];
    const WEIGHTS = { water: 0.30, air: 0.25, soil: 0.20, trees: 0.15 };
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
        health={water:Array(SIZE).fill(null).map(()=>Array(SIZE).fill(1)),soil:Array(SIZE).fill(null).map(()=>Array(SIZE).fill(1))};
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
    const compositeHealth=(x,y)=>mask.water[y][x]?health.water[y][x]:(health.soil[y][x]+airMask[y][x])/2;
    function updateAnimals(){for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){if(!mask.soil[y][x]||community[y][x]||health.soil[y][x]<SOIL_QUALITY_THRESHOLD||airMask[y][x]<AIR_QUALITY_THRESHOLD){animals[y][x]=0;continue;}animals[y][x]=(rand(x,y,Date.now())<compositeHealth(x,y)*(trees[y][x]>TREE_NONE?1:0)*0.35)?1:0;}}
    function updateCommunities(){for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){if(!mask.soil[y][x]){community[y][x]=0;continue;}const cH=compositeHealth(x,y),sH=health.soil[y][x],aH=airMask[y][x],tD=treeDensity(x,y);if(community[y][x]){if(cH<COMMUNITY_DEGRADE_HEALTH_THRESHOLD||tD>MAX_TREE_DENSITY_FOR_COMMUNITY_SURVIVAL||tD<MIN_TREE_DENSITY_FOR_COMMUNITY_SURVIVAL||sH<SOIL_QUALITY_THRESHOLD||aH<AIR_QUALITY_THRESHOLD||trees[y][x]>TREE_NONE)community[y][x]=0;}else{if(animals[y][x]||trees[y][x]>TREE_NONE||sH<SOIL_QUALITY_THRESHOLD||aH<AIR_QUALITY_THRESHOLD)continue;if(nearWater(x,y)&&tD>=MIN_TREE_DENSITY_FOR_COMMUNITY_FOUNDING&&tD<=MAX_TREE_DENSITY_FOR_COMMUNITY_FOUNDING&&cH>0.75&&rand(x,y,Date.now())<COMMUNITY_FOUNDING_PROBABILITY)community[y][x]=1;}}}
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
        for(const layer of INDIVIDUAL_LAYERS){
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

    function applyStressToSimulation(overallDelta, targetLayerName = null) {
        console.log(`MainSim: applyStressToSimulation called. Delta: ${overallDelta}, Target: ${targetLayerName || "Global"}`);
        const layersToProcess = [];
        if (targetLayerName) {
            if (WEIGHTS.hasOwnProperty(targetLayerName)) { layersToProcess.push({ name: targetLayerName, amount: overallDelta });
            } else { console.warn(`MainSim: applyStressToSimulation - Targeted layer "${targetLayerName}" is not in WEIGHTS or not stressable.`); return; }
        } else { for (const layerName in WEIGHTS) { layersToProcess.push({ name: layerName, amount: overallDelta * WEIGHTS[layerName] }); } }
        if (layersToProcess.length === 0) { console.warn("MainSim: applyStressToSimulation - No layers to process."); return; }

        let airWasAffected = false;
        layersToProcess.forEach(({ name, amount }) => {
            if (name === "air") airWasAffected = true;
            const tilesToAffectCount = Math.floor(Math.abs(amount) * SIZE * SIZE * 0.1);
            console.log(`MainSim: Processing layer ${name}, Amount: ${amount.toFixed(4)}, Tiles to affect: ~${tilesToAffectCount}`);
            for (let i = 0; i < tilesToAffectCount; i++) {
                const x = Math.floor(rand(i, Date.now() + name.length) * SIZE);
                const y = Math.floor(rand(Date.now() + name.length, i) * SIZE);
                if (name === "water" && mask.water[y][x]) { health.water[y][x] = clamp(health.water[y][x] + (amount > 0 ? -1 : 1) * 0.15, 0, 1);
                } else if (name === "soil" && mask.soil[y][x]) { health.soil[y][x] = clamp(health.soil[y][x] + (amount > 0 ? -1 : 1) * 0.15, 0, 1);
                } else if (name === "trees" && mask.soil[y][x]) {
                    const currentTreeState = trees[y][x];
                    if (amount > 0) { if (currentTreeState === TREE_DENSE) trees[y][x] = TREE_NORMAL; else if (currentTreeState === TREE_NORMAL) trees[y][x] = TREE_SPARSE; else if (currentTreeState === TREE_SPARSE) trees[y][x] = TREE_NONE;
                    } else { if (community[y][x] === 1) continue; if (currentTreeState === TREE_NONE) trees[y][x] = TREE_SPARSE; else if (currentTreeState === TREE_SPARSE) trees[y][x] = TREE_NORMAL; else if (currentTreeState === TREE_NORMAL) trees[y][x] = TREE_DENSE;}
                } else if (name === "air") { airMask[y][x] = clamp(airMask[y][x] + (amount > 0 ? -1 : 1) * 0.15, 0, 1); }
            }
        });
        if (airWasAffected) diffuseAir();
        console.log("MainSim: applyStressToSimulation finished processing layers.");
    }

    function handleGlobalStress() { console.log("MainSim: Global Stress button clicked."); applyStressToSimulation(0.10); updateAnimals(); updateCommunities(); drawAllMaps(); }
    function handleGlobalHeal() { console.log("MainSim: Global Heal button clicked."); applyStressToSimulation(-0.10); updateAnimals(); updateCommunities(); drawAllMaps(); }

    function applyCO2Stress(){if(!window.activityLogger||!window.activityLogger.getAndResetAccumulatedCO2)return;const co2=window.activityLogger.getAndResetAccumulatedCO2();if(typeof co2!=='number'||isNaN(co2)||co2<=0)return;const s=co2*CO2_TO_STRESS_FACTOR;if(s<=0)return;const L=Object.keys(WEIGHTS);if(!L.length)return;const rL=L[Math.floor(rand(s,Date.now())*L.length)];console.log(`MainSim: CO2 Stress. Delta:${s.toFixed(4)}, Target:${rL} (from ${co2.toFixed(1)}g CO2)`);applyStressToSimulation(s,rL);}
    function applyHealing(){if(!window.userActions||!window.userActions.getHealingEffectsForInterval)return;const E=window.userActions.getHealingEffectsForInterval();if(E&&E.length){console.log("MainSim: Applying user healing:",E);E.forEach(e=>{if(typeof e.delta==='number'&&!isNaN(e.delta))applyStressToSimulation(e.delta,e.targetLayerName);});}}
    function processPeriodicActions(){console.log("MainSim: Processing periodic actions...");applyCO2Stress();applyHealing();updateAnimals();updateCommunities();drawAllMaps();nextPeriodicActionTime=Date.now()+PERIODIC_ACTION_INTERVAL;}
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