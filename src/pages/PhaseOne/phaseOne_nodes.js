export const initialNodes = [
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
            position: {x: 1000, y: 200},
            data: {label: "User", background: "black"},
            draggable: false
        },
        {
            id: "compliance-subject",
            type: "circle",
            position: {x: 2200, y: 200},
            data: {label: "Compliance Subject", background: "black"},
            draggable: false
        },
        {
            id: "compliance-task",
            type: "circle",
            position: {x: 3800, y: 200},
            data: {label: "Compliance Task", background: "black"},
            draggable: false
        },

        // 3rd layer
        {
            id: "user-role",
            type: "circle",
            position: {x: 1000, y: 500},
            data: {label: "User Role"},
            draggable: false
        },
        {
            id: "ai-system",
            type: "circle",
            position: {x: 2000, y: 500},
            data: {label: "AI System"},
            draggable: false
        },
        {
            id: "med-device",
            type: "circle",
            position: {x: 2400, y: 500},
            data: {label: "Medical Device", isConnectable: true, isChosen: false,},
            draggable: false
        },        

        // 4th layer
        {
            id: "xor-user-role",
            type: "operator",
            position: {x: 1025, y: 650},
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
            position: {x: 2025, y: 650},
            data: {label: "XOR"},
            draggable: false
        },

        
        {
            id: "unacceptable-risk",
            type: "circle",
            position: {x: 1760, y: 800},
            data: {label: "Unacceptable Risk", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "high-risk",
            type: "circle",
            position: {x: 1920, y: 800},
            data: {label: "High Risk", isConnectable: true, isChosen: true,},
            draggable: false
        },
        {
            id: "medium-risk",
            type: "circle",
            position: {x: 2080, y: 800},
            data: {label: "Medium Risk", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "minimal-risk",
            type: "circle",
            position: {x: 2240, y: 800},
            data: {label: "Minimal Risk", isConnectable: true, isChosen: false,},
            draggable: false
        },

        // final layer
        {
            id: "phase-one-result",
            type: "hexagon",
            position: {x: 2125, y: 1500},
            draggable: true,
        },
    ]

export default initialNodes;