const agonMetaModel = {
    phaseOne: [
        {
            id: "compliance-context",
            type: "circle",
            position: {x: 2200, y: -200},
            data: {label: "Compliance Context", top: "no"},
            draggable: false
        },

        // 2nd layer
        {
            id: "user",
            type: "circle",
            position: {x: 500, y: 200},
            data: {label: "User", background: "black"},
            draggable: false
        },
        {
            id: "compliance-subject",
            type: "circle",
            position: {x: 1300, y: 200},
            data: {label: "Compliance Subject", background: "black"},
            draggable: false
        },
        {
            id: "compliance-goal",
            type: "circle",
            position: {x: 2200, y: 200},
            data: {label: "Compliance Goal", background: "black"},
            draggable: false
        },

        // 3rd layer
        {
            id: "user-role",
            type: "circle",
            position: {x: 500, y: 500},
            data: {label: "User Role"},
            draggable: false
        },
        {
            id: "ai-system",
            type: "circle",
            position: {x: 1300, y: 500},
            data: {label: "AI System", isConnectable: true, isChosen: true,},
            draggable: false
        },
        {
            id: "goal-regulation",
            type: "circle",
            position: {x: 2185, y: 500},
            data: {label: "Goal Regulation", size: 130},
            draggable: false
        },

        // 4th layer
        {
            id: "xor-user-role",
            type: "operator",
            position: {x: 525, y: 650},
            data: {label: "XOR"},
            draggable: false
        },
        {
            id: "researcher",
            type: "circle",
            position: {x: 300, y: 800},
            data: {label: "Researcher", background: "black", isConnectable: true, isChosen: true,},
            draggable: false
        },
        {
            id: "developer",
            type: "circle",
            position: {x: 500, y: 800},
            data: {label: "Developer", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "deployer",
            type: "circle",
            position: {x: 700, y: 800},
            data: {label: "Deployer", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "xor-ai-system",
            type: "operator",
            position: {x: 1325, y: 650},
            data: {label: "XOR"},
            draggable: false
        },

        {
            id: "ai-act",
            type: "circle",
            position: {x: 1900, y: 800},
            data: {label: "EU AI Act", background: "black", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "ehds",
            type: "circle",
            position: {x: 2200, y: 800},
            data: {label: "EHDS", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "mdr",
            type: "circle",
            position: {x: 2500, y: 800},
            data: {label: "MDR", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },

        // 5th layer
        // {
        //     id: "xor-risk-aiact",
        //     type: "operator",
        //     position: {x: 1925, y: 950},
        //     data: {label: "XOR"},
        //     draggable: false
        // },
        {
            id: "unacceptable-risk",
            type: "circle",
            position: {x: 1000, y: 800},
            data: {label: "Unacceptable Risk", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "high-risk",
            type: "circle",
            position: {x: 1200, y: 800},
            data: {label: "High Risk", isConnectable: true, isChosen: true,},
            draggable: false
        },
        {
            id: "medium-risk",
            type: "circle",
            position: {x: 1400, y: 800},
            data: {label: "Medium Risk", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "minimal-risk",
            type: "circle",
            position: {x: 1600, y: 800},
            data: {label: "Minimal Risk", isConnectable: true, isChosen: false,},
            draggable: false
        },

        // {
        //     id: "xor-risk-mdr",
        //     type: "operator",
        //     position: {x: 2525, y: 950},
        //     data: {label: "XOR"},
        //     draggable: false
        // },
        // {
        //     id: "III-risk",
        //     type: "circle",
        //     position: {x: 2350, y: 1050},
        //     data: {label: "III Class", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "IIb-risk",
        //     type: "circle",
        //     position: {x: 2450, y: 1050},
        //     data: {label: "IIb Class", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "IIa-risk",
        //     type: "circle",
        //     position: {x: 2550, y: 1050},
        //     data: {label: "IIa Class", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "I-risk",
        //     type: "circle",
        //     position: {x: 2650, y: 1050},
        //     data: {label: "I Class", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },

        // final layer
        {
            id: "phase-one-result",
            type: "hexagon",
            position: {x: 2125, y: 1500},
            draggable: true,
        },
    ],
    phaseTwo: [],
    phaseThree: [],
}

export default agonMetaModel;