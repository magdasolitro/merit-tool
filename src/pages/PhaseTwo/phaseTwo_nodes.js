export const initialNodes  = [
    {
        id: "principles",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Principles", top: "no"},
        draggable: false
    },
    {
        id: "ethics",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Ethics & Human-Centric Design", top: "no", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "fairness",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Fairness & Non-Discrimination", top: "no", isConnectable: true, isChosen: true,},
        draggable: false
    },
    {
        id: "transparency",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Transparency & Explainability", top: "no" , isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "robustness",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Robustness & Reliability", top: "no", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "privacy",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Privacy & Data Protection", top: "no", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "security",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Security & Technical Resilience", top: "no", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "accountability",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Accountability & Governance", top: "no", isConnectable: true, isChosen: false,},
        draggable: false
    },
    {
        id: "data-quality",
        type: "circle",
        position: {x: 2200, y: -200},
        data: {label: "Data Quality, Integrity & Provenance", top: "no", isConnectable: true, isChosen: false,},
        draggable: false
    },

    // final layer
    {
        id: "phase-two-result",
        type: "hexagon",
        position: {x: 2125, y: 1500},
        draggable: true,
    },
];
