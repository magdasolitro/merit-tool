

export const initialNodes2  = [
    {
        id: "principles",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Principles"},
        draggable: false
    },
    {
        id: "ethics",
        type: "circle",
        position: {x: 1800, y: 400},
        data: {label: "Ethics & Human-Centric Design", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "fairness",
        type: "circle",
        position: {x: 1200, y: 400},
        data: {label: "Fairness & Non-Discrimination", isConnectable: true, isChosen: true,},
        draggable: false
    },
    {
        id: "transparency",
        type: "circle",
        position: {x: 1600, y: 400},
        data: {label: "Transparency & Explainability" , isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "robustness",
        type: "circle",
        position: {x: 2000, y: 400},
        data: {label: "Robustness & Reliability", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "privacy",
        type: "circle",
        position: {x: 2400, y: 400},
        data: {label: "Privacy & Data Protection", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "security",
        type: "circle",
        position: {x: 2800, y: 400},
        data: {label: "Security & Technical Resilience", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "accountability",
        type: "circle",
        position: {x: 3200, y: 400},
        data: {label: "Accountability & Governance", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "data-quality",
        type: "circle",
        position: {x: 3600, y: 400},
        data: {label: "Data Quality, Integrity & Provenance", isConnectable: true, isChosen: false,},
        draggable: false
    },

    // final layer
    {
        id: "phase-two-result",
        type: "hexagon",
        position: {x: 2125, y: 1000},
        draggable: true,
    },
];
