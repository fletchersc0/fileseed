// charitiesData.js
// Data store for real-world charities information

// Ensure this global variable is accessible by userActions.js
const charitiesData = [
    // Water
    {
        id: "wateraid",
        name: "WaterAid",
        category: "Water",
        website: "https://www.wateraid.org",
        missionHighlights: "Community-owned water, sanitation and hygiene (WASH) systems in 22 countries; goal to reach 400 million more people by 2035.",
        qualitySignals: "4-star Charity Navigator score (99 %). charitynavigator.org, wateraid.org"
    },
    {
        id: "charitywater",
        name: "charity: water",
        category: "Water",
        website: "https://www.charitywater.org",
        missionHighlights: "Funds boreholes, rain harvesters and solar pumps via local partners; every public dollar goes to fieldwork under its “100 % Model.”",
        qualitySignals: "GPS-tracked projects and a 96 % Charity Navigator score confirm accountability. charitywater.org, charitynavigator.org"
    },
    // Soil
    {
        id: "regenerationinternational",
        name: "Regeneration International",
        category: "Soil",
        website: "https://regenerationinternational.org",
        missionHighlights: "Global 501(c)(3) network scaling regenerative agriculture pilots from Nepal to West Africa, advocating for national soil-carbon targets.",
        qualitySignals: "Active hubs in 60+ countries; IRS-registered nonprofit. regenerationinternational.org"
    },
    {
        id: "justdiggit",
        name: "Justdiggit",
        category: "Soil",
        website: "https://justdiggit.org",
        missionHighlights: "Restores degraded African drylands using rain-capturing bunds and native reseeding; >300,000 ha regreened to date.",
        qualitySignals: "Public dashboard tracks carbon sequestered and land cooled. justdiggit.org"
    },
    // Trees
    {
        id: "edenreforestation",
        name: "Eden Reforestation Projects",
        category: "Trees",
        website: "https://eden-plus.org",
        missionHighlights: "Employs local communities to plant native species in 15 countries; surpassed the one-billion-tree mark in 2025.",
        qualitySignals: "4-star Charity Navigator rating; Forbes profile verifies milestone. forbes.com"
    },
    {
        id: "onetreeplanted",
        name: "One Tree Planted",
        category: "Trees",
        website: "https://onetreeplanted.org",
        missionHighlights: "“A dollar = a tree” model funding 394 science-vetted projects across 72 nations in 2023 alone.",
        qualitySignals: "Annual impact report lists 51.9 million seedlings planted and survival-rate audits. onetreeplanted.org"
    },
    // Air
    {
        id: "catf",
        name: "Clean Air Task Force (CATF)",
        category: "Air",
        website: "https://www.catf.us",
        missionHighlights: "Wins methane-leak rules, coal-plant retirements and shipping decarbonisation across the US, EU, India and Africa.",
        qualitySignals: "4-star Charity Navigator rating and well-documented policy wins. charitynavigator.org"
    },
    {
        id: "cleanairfund",
        name: "Clean Air Fund",
        category: "Air",
        website: "https://www.cleanairfund.org",
        missionHighlights: "Pooled-philanthropy vehicle that grants to local campaigns in Delhi, Accra, Warsaw and more; publishes the annual State of Global Air-Quality Funding benchmark.",
        qualitySignals: "2024 report evidences data-driven grant strategy. cleanairfund.org"
    },
    // Animals
    {
        id: "wwf",
        name: "World Wildlife Fund (WWF)",
        category: "Animals",
        website: "https://www.worldwildlife.org",
        missionHighlights: "3,700+ field projects in 100 countries; integrates science, finance and advocacy to curb deforestation and wildlife trade.",
        qualitySignals: "Maintains 4-star Charity Navigator rating; FY24 audit shows robust program spend. worldwildlife.org"
    },
    {
        id: "wcs",
        name: "Wildlife Conservation Society (WCS)",
        category: "Animals",
        website: "https://www.wcs.org",
        missionHighlights: "Safeguards >3 million sq mi of land & sea, with programmes in 60 countries and species-recovery work from jaguars to sharks.",
        qualitySignals: "2024 impact report details measurable population rebounds. wcs.org, cdn.wcs.org"
    },
    // Community
    {
        id: "greengrants",
        name: "Global Greengrants Fund",
        category: "Community",
        website: "https://www.greengrants.org",
        missionHighlights: "Issues small, rapid-response grants to frontline activists in 168 countries—over 15,000 grants since 1993.",
        qualitySignals: "4-star Charity Navigator rating and transparent grassroots case studies. charitynavigator.org, greengrants.org"
    },
    {
        id: "rareorg",
        name: "Rare",
        category: "Community",
        website: "https://rare.org",
        missionHighlights: "Uses behavioural-science “Pride” campaigns so fishers, farmers and city residents adopt conservation-positive habits; active in 60+ nations.",
        qualitySignals: "2024 year-in-review and peer-reviewed toolkit evidence behaviour-change results. rare.org, bi.team"
    }
];

console.log("charitiesData.js: Loaded charity data. Count:", charitiesData.length);