export const initialNodes3 = [
        {
            id: "reg-context",
            type: "circle",
            position: {x: 2200, y: -200},
            data: {label: "Regulatory Context", top: "no"},
            draggable: false
        },

        // 2nd layer        
        {
            id: "ai-act",
            type: "circle",
            position: {x: 2500, y: 800},
            data: {label: "EU AI Act", background: "black", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "ehds",
            type: "circle",
            position: {x: 2800, y: 800},
            data: {label: "EHDS", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "mdr",  
            type: "circle",
            position: {x: 3130, y: 800},
            data: {label: "MDR", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        
        // final layer
        {
            id: "phase-three-result",
            type: "hexagon",
            position: {x: 2125, y: 1500},
            draggable: true,
        },
    ]

export default initialNodes3;