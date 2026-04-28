export const initialNodes3 = [
        // 2nd layer        
        {
            id: "gdpr",
            type: "regulation",
            position: {x: 1800, y: 800},
            data: {label: "GDPR", background: "black", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "ehds",
            type: "regulation",
            position: {x: 2200, y: 800},
            data: {label: "EHDS", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "mdr",  
            type: "regulation",
            position: {x: 2600, y: 800},
            data: {label: "MDR", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        
    //     // final layer
    //     {
    //         id: "phase-three-result",
    //         type: "hexagon",
    //         position: {x: 2125, y: 1500},
    //         draggable: true,
    //     },
    ]

export default initialNodes3;