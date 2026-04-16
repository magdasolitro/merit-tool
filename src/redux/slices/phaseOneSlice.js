import {createSlice} from '@reduxjs/toolkit'
import {PhaseOneKeyValue, PhaseOneSecondaryLogic} from "../../data/PhaseOneKeyValue.js";
import agonMetaModel from "../../data/AgonMetaModel.js";

const initialEdges = [
    // 1st edge
    {id: "e1-2", source: "compliance-context", target: "user", type: "straight"},
    {id: "e1-3", source: "compliance-context", target: "compliance-subject", type: "straight"},
    {id: "e1-4", source: "compliance-context", target: "compliance-goal", type: "straight"},
    {id: "e1-5", source: "compliance-context", target: "compliance-task", type: "straight"},

    // 2nd edge
    {id: "e2-1", source: "user", target: "user-role", type: "straight"},
    {id: "e2-2", source: "compliance-subject", target: "ai-system", type: "straight"},
    {id: "e2-3", source: "compliance-goal", target: "goal-regulation", type: "straight"},

    // 3rd edge
    {id: "e3-0", source: "user-role",  target: "xor-user-role", type: "straight"},
    {id: "e3-1", source: "xor-user-role", sourceHandle: "operator_left",  target: "researcher", type: "straight"},
    {id: "e3-2", source: "xor-user-role", sourceHandle: "operator_bottom", target: "developer", type: "straight"},
    {id: "e3-3", source: "xor-user-role", sourceHandle: "operator_right", target: "deployer", type: "straight"},
    {id: "e3-4", source: "goal-regulation", target: "ai-act", type: "straight"},
    {id: "e3-5", source: "goal-regulation", target: "ehds", type: "straight"},
    {id: "e3-6", source: "goal-regulation", target: "mdr", type: "straight"},

    // 4th edge
    {id: "ed4-0", source: "ai-act", target: "xor-risk-aiact", type: "straight"},
    {id: "ed4-1", source: "mdr", target: "xor-risk-mdr", type: "straight"},

    //5th edge
    {id: "ed5-0", source: "xor-risk-aiact", sourceHandle: "operator_left", target: "unacceptable-risk", type: "straight"},
    {id: "ed5-1", source: "xor-risk-aiact", target: "high-risk", sourceHandle: "operator_bottom", type: "straight"},
    {id: "ed5-2", source: "xor-risk-aiact", target: "medium-risk", sourceHandle: "operator_bottom", type: "straight"},
    {id: "ed5-3", source: "xor-risk-aiact", target: "minimal-risk", sourceHandle: "operator_right", type: "straight"},
    {id: "ed5-4", source: "xor-risk-mdr", sourceHandle: "operator_left", target: "III-risk", type: "straight"},
    {id: "ed5-5", source: "xor-risk-mdr", target: "IIb-risk", sourceHandle: "operator_bottom", type: "straight"},
    {id: "ed5-6", source: "xor-risk-mdr", target: "IIa-risk", sourceHandle: "operator_bottom", type: "straight"},
    {id: "ed5-7", source: "xor-risk-mdr", target: "I-risk", sourceHandle: "operator_right", type: "straight"},

    // // final edges
    // {id: "ed6-0", source: "researcher", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-1", source: "developer", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-2", source: "deployer", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-3", source: "unacceptable-risk", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-4", source: "high-risk", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-5", source: "limited-risk", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-6", source: "minimal-risk", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-7", source: "III-risk", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-8", source: "IIb-risk", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-9", source: "IIa-risk", target: "phase-one-result", type: "dotted"},
    // {id: "ed6-10", source: "I-risk", target: "phase-one-result", type: "dotted"},

    // final layer
    {
        id: "phase-one-result",
        type: "hexagon",
        position: {x: 2125, y: 1500},
        draggable: true,
    },
];

    
export { initialEdges };
const initialNodes = agonMetaModel.phaseOne;
const initialState = {
    edgeState: initialEdges,
    nodeState: initialNodes,
    resultName: "",
    selectedNodes: initialNodes.filter(node => node.data?.isChosen).map(node => PhaseOneKeyValue[node.id]).filter(Boolean),
    uploaded: 0,
}

export const phaseOneSlice = createSlice({
    name: 'phaseOne',
    initialState,
    reducers: {
        connectEdge: (state, action) => {
            state.edgeState = action.payload
            state.selectedNodes = [] // reset selected nodes
            const result = state.edgeState.slice(50)
            for (const edge of result) {
                PhaseOneKeyValue[edge.source] && state.selectedNodes.push(PhaseOneKeyValue[edge.source]);
            }
            for (const logic of PhaseOneSecondaryLogic) {
                const {requiredNodes, resultNode} = logic;
                if (resultNode && requiredNodes.every(node => state.selectedNodes.includes(node))) {
                    state.selectedNodes.push(resultNode);
                }
            }
        },
        updateNodes: (state, action) => {
            const xorEdge = state.edgeState.find(edge => edge.target === action.payload && edge.source.includes('xor'));
            const xorNode = xorEdge ? xorEdge.source : null;

            state.nodeState.map(node => {
                if (xorNode) {
                    const xorTargets = state.edgeState.filter(edge => edge.source === xorNode).map(edge => edge.target);
                    if (xorTargets.includes(node.id) && node.id !== action.payload) {
                        node.data.isChosen = false;
                    }
                }
                if (node.id === action.payload) {
                    node.data.isChosen = !node.data.isChosen;
                }
            })
        },
        updateResultName: (state, action) => {
            state.resultName = action.payload
        },
        setPhaseOneState: (state, action) => {
            state.edgeState = action.payload.edgeState
            state.nodeState = action.payload.nodeState
            state.resultName = action.payload.resultName
            state.selectedNodes = action.payload.selectedNodes
            state.uploaded++;
        }
    },
})

export const {connectEdge, updateResultName, setPhaseOneState, updateNodes} = phaseOneSlice.actions

export default phaseOneSlice.reducer
