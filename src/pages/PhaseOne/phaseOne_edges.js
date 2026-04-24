export const initialEdges = [
    // 1st edge
    {id: "e1-1", source: "compliance-context", target: "user", type: "straight"},
    {id: "e1-2", source: "compliance-context", target: "compliance-subject", type: "straight"},
    {id: "e1-3", source: "compliance-context", target: "compliance-goal", type: "straight"},
    {id: "e1-4", source: "compliance-context", target: "compliance-task", type: "straight"},

    // 2nd edge
    {id: "e2-1", source: "user", target: "user-role", type: "straight"},
    {id: "e2-2", source: "compliance-subject", target: "ai-system", type: "straight"},
    {id: "e2-3", source: "compliance-subject", target: "med-device", type: "straight"},
    {id: "e2-4", source: "compliance-goal", target: "goal-regulation", type: "straight"},


    // 3rd edge
    {id: "e3-0", source: "user-role",  target: "xor-user-role", type: "straight"},
    {id: "e3-1", source: "xor-user-role", sourceHandle: "operator_left",  target: "researcher", type: "straight"},
    {id: "e3-2", source: "xor-user-role", sourceHandle: "operator_bottom", target: "developer", type: "straight"},
    {id: "e3-3", source: "xor-user-role", sourceHandle: "operator_right", target: "deployer", type: "straight"},
    {id: "e3-4", source: "goal-regulation", target: "ai-act", type: "straight"},
    {id: "e3-5", source: "goal-regulation", target: "ehds", type: "straight"},
    {id: "e3-6", source: "goal-regulation", target: "mdr", type: "straight"},

    {id: "e3-7", source: "ai-system",  target: "xor-ai-system", type: "straight"},
    {id: "e3-8", source: "xor-ai-system", sourceHandle: "operator_left",  target: "unacceptable-risk", type: "straight"},
    {id: "e3-9", source: "xor-ai-system", sourceHandle: "operator_bottom", target: "high-risk", type: "straight"},
    {id: "e3-10", source: "xor-ai-system", sourceHandle: "operator_bottom", target: "medium-risk", type: "straight"},
    {id: "e3-11", source: "xor-ai-system", sourceHandle: "operator_right", target: "minimal-risk", type: "straight"},

    {id: "e3-12", source: "goal-regulation", target: "ai-act", type: "straight"},
    {id: "e3-13", source: "goal-regulation", target: "ehds", type: "straight"},
    {id: "e3-14", source: "goal-regulation", target: "mdr", type: "straight"},

    // final layer
    {
        id: "phase-one-result",
        type: "hexagon",
        position: {x: 2125, y: 1500},
        draggable: true,
    },
]