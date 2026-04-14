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
    // {id: "e2-4", source: "compliance-task", target: "task-analysis", type: "straight"},
    // {id: "e2-5", source: "compliance-task", target: "task-design", type: "straight"},
    // {id: "e2-6", source: "compliance-task", target: "task-development", type: "straight"},
    // {id: "e2-7", source: "compliance-task", target: "task-deployment", type: "straight"},
    // {id: "e2-8", source: "compliance-task", target: "task-maintenance", type: "straight"},    

    // 3rd edge
    {id: "e3-1", source: "user-role", target: "researcher", type: "straight"},
    {id: "e3-2", source: "user-role", target: "developer", type: "straight"},
    {id: "e3-3", source: "user-role", target: "deployer", type: "straight"},
    {id: "e3-4", source: "goal-regulation", target: "ai-act", type: "straight"},
    {id: "e3-5", source: "goal-regulation", target: "ehds", type: "straight"},
    {id: "e3-6", source: "goal-regulation", target: "mdr", type: "straight"},
    // {id: "e3-7", source: "task-analysis", target: "purpose-and-scope", type: "straight"},
    // {id: "e3-8", source: "task-analysis", target: "risk-assessment", type: "straight"},
    // {id: "e3-9", source: "task-analysis", target: "trustworthiness-requirements", type: "straight"},
    // {id: "e3-10", source: "task-analysis", target: "stakeholder-engagement", type: "straight"},
    // {id: "e3-11", source: "task-design", target: "data-collection", type: "straight"},
    // {id: "e3-12", source: "task-design", target: "architectural-design", type: "straight"},
    // {id: "e3-13", source: "task-design", target: "threat-modeling", type: "straight"},
    // {id: "e3-14", source: "task-design", target: "model-selection", type: "straight"},
    // {id: "e3-15", source: "task-development", target: "secure-coding", type: "straight"},
    // {id: "e3-16", source: "task-development", target: "model-training", type: "straight"},
    // {id: "e3-17", source: "task-development", target: "testing", type: "straight"},
    // {id: "e3-18", source: "task-development", target: "model-improv", type: "straight"},
    // {id: "e3-19", source: "task-deployment", target: "model-validation", type: "straight"},
    // {id: "e3-20", source: "task-deployment", target: "documentation", type: "straight"},
    // {id: "e3-21", source: "task-deployment", target: "controlled-rollout", type: "straight"},
    // {id: "e3-22", source: "task-deployment", target: "security-hardening", type: "straight"},
    // {id: "e3-23", source: "task-maintenance", target: "continuous-monitoring", type: "straight"},
    // {id: "e3-24", source: "task-maintenance", target: "feedback", type: "straight"},
    // {id: "e3-25", source: "task-maintenance", target: "model-updates", type: "straight"},
    // {id: "e3-26", source: "task-maintenance", target: "auditing", type: "straight"},
    // Dotted edges to phase-one-result
    {id: "d1", source: "researcher", target: "phase-one-result", type: "dotted"},
    {id: "d2", source: "ai-act", target: "phase-one-result", type: "dotted"},
    {id: "d3", source: "purpose-and-scope", target: "phase-one-result", type: "dotted"},
    {id: "d4", source: "trustworthiness-requirements", target: "phase-one-result", type: "dotted"},
    {id: "d5", source: "threat-modeling", target: "phase-one-result", type: "dotted"},
    {id: "d6", source: "secure-coding", target: "phase-one-result", type: "dotted"},
    {id: "d7", source: "testing", target: "phase-one-result", type: "dotted"},
    {id: "d8", source: "documentation", target: "phase-one-result", type: "dotted"},
    {id: "d9", source: "model-updates", target: "phase-one-result", type: "dotted"},
    {id: "d10", source: "auditing", target: "phase-one-result", type: "dotted"},];
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
            const xorNode = action.payload.match(/xor(\d+)$/);

            state.nodeState.map(node => {
                if (xorNode && node.id.includes(xorNode[0]) && node.id !== action.payload) {
                    node.data.isChosen = false;
                }
                if (node.id === action.payload) {
                    node.data.isChosen = !node.data.isChosen;
                }
            })
            // state.nodeState.map(node => {
            //         if (node.id === action.payload) {
            //             node.data.isChosen = !node.data.isChosen;
            //         }
            //     }
            // )
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
