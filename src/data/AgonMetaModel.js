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
            position: {x: -700, y: 200},
            data: {label: "User", background: "black"},
            draggable: false
        },
        {
            id: "compliance-subject",
            type: "circle",
            position: {x: 700, y: 200},
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
        {
            id: "compliance-principles",
            type: "circle",
            position: {x: 3700, y: 200},
            data: {label: "Compliance Principles", background: "black"},
            draggable: false
        }
        // {
        //     id: "compliance-task",
        //     type: "circle",
        //     position: {x: 4250, y: 200},
        //     data: {label: "Compliance Task", background: "black"},
        //     draggable: false
        // },

        // 3rd layer
        {
            id: "user-role",
            type: "circle",
            position: {x: -700, y: 500},
            data: {label: "User Role"},
            draggable: false
        },
        {
            id: "ai-system",
            type: "circle",
            position: {x: 700, y: 500},
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
        // {
        //     id: "task-analysis",
        //     type: "circle",
        //     position: {x: 3400, y: 500},
        //     data: {label: "Task Analysis"},
        //     draggable: false
        // },
        // {
        //     id: "task-design",
        //     type: "circle",
        //     position: {x: 4000, y: 500},
        //     data: {label: "Task Design"},
        //     draggable: false
        // },
        // {
        //     id: "task-development",
        //     type: "circle",
        //     position: {x: 4500, y: 500},
        //     data: {label: "Task Development"},
        //     draggable: false
        // },
        // {
        //     id: "task-deployment",
        //     type: "circle",
        //     position: {x: 4900, y: 500},
        //     data: {label: "Task Deployment"},
        //     draggable: false
        // },
        // {
        //     id: "task-maintenance",
        //     type: "circle",
        //     position: {x: 5500, y: 500},
        //     data: {label: "Task Maintenance"},
        //     draggable: false
        // },

        // 4th layer
        {
            id: "researcher",
            type: "circle",
            position: {x: -1000, y: 800},
            data: {label: "Researcher", background: "black", isConnectable: true, isChosen: true,},
            draggable: false
        },
        {
            id: "developer",
            type: "circle",
            position: {x: -700, y: 800},
            data: {label: "Developer", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },
        {
            id: "deployer",
            type: "circle",
            position: {x: -400, y: 800},
            data: {label: "Deployer", background: "black", isConnectable: true, isChosen: false,},
            draggable: false
        },

        {
            id: "ai-act",
            type: "circle",
            position: {x: 1900, y: 800},
            data: {label: "EU AI Act", background: "black", isConnectable: true, isChosen: true,},
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

        // {
        //     id: "purpose-and-scope",
        //     type: "circle",
        //     position: {x: 3200, y: 800},
        //     data: {label: "Definition of AI Purpose and Scope", background: "black", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "risk-assessment",
        //     type: "circle",
        //     position: {x: 3350, y: 800},
        //     data: {label: "Risk Assessment", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "trustworthiness-requirements",
        //     type: "circle",
        //     position: {x: 3500, y: 800},
        //     data: {label: "Definition of Trustworthiness Requirements", background: "black", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "stakeholder-engagement",
        //     type: "circle",
        //     position: {x: 3650, y: 800},
        //     data: {label: "Stakeholder Engagement", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "data-collection",
        //     type: "circle",
        //     position: {x: 3800, y: 800},
        //     data: {label: "Data Collection", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "architectural-design",
        //     type: "circle",
        //     position: {x: 3950, y: 800},
        //     data: {label: "Architectural Design", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "threat-modeling",
        //     type: "circle",
        //     position: {x: 4200, y: 800},
        //     data: {label: "Threat Modeling", background: "black", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "model-selection",
        //     type: "circle",
        //     position: {x: 4350, y: 800},
        //     data: {label: "Model Selection", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "secure-coding",
        //     type: "circle",
        //     position: {x: 4500, y: 800},
        //     data: {label: "Secure Coding", background: "black", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "model-training",
        //     type: "circle",
        //     position: {x: 4650, y: 800},
        //     data: {label: "Model Training", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "testing",
        //     type: "circle",
        //     position: {x: 4800, y: 800},
        //     data: {label: "Testing", background: "black", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "model-improv",
        //     type: "circle",
        //     position: {x: 4950, y: 800},
        //     data: {label: "Model Improvement", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "model-validation",
        //     type: "circle",
        //     position: {x: 5200, y: 800},
        //     data: {label: "Model Validation", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "documentation",
        //     type: "circle",
        //     position: {x: 5350, y: 800},
        //     data: {label: "Documentation", background: "black", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "controlled-rollout",
        //     type: "circle",
        //     position: {x: 5500, y: 800},
        //     data: {label: "Controlled Rollout", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "security-hardening",
        //     type: "circle",
        //     position: {x: 5650, y: 800},
        //     data: {label: "Security Hardening", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "continuous monitoring",
        //     type: "circle",
        //     position: {x: 5800, y: 800},
        //     data: {label: "Continuous Monitoring", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "feedback",
        //     type: "circle",
        //     position: {x: 5950, y: 800},
        //     data: {label: "Feedback-Mechanism", background: "black", isConnectable: true, isChosen: false,},
        //     draggable: false
        // },
        // {
        //     id: "model-updates",
        //     type: "circle",
        //     position: {x: 6200, y: 800},
        //     data: {label: "Model Updates & Retraining", background: "black", isConnectable: true, isChosen: true,},
        //     draggable: false
        // },
        // {
        //     id: "auditing",
        //     type: "circle",
        //     position: {x: 6350, y: 800},
        //     data: {label: "Incident Response & Auditing", background: "black", isConnectable: true, isChosen: true,},
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