import {createSlice} from '@reduxjs/toolkit'
import {PhaseOneKeyValue} from "../../data/PhaseOneKeyValue.js";
import {initialEdges} from "../../pages/PhaseOne/phaseOne_edges.js";
import {initialNodes} from "../../pages/PhaseOne/phaseOne_nodes.js";

const initialState = {
    edgeState: initialEdges,
    nodeState: initialNodes,
    resultName: "",
    selectedNodes: initialNodes.filter(node => node.data?.isChosen).map(node => PhaseOneKeyValue[node.id]).filter(Boolean),
    selectedNodeIds: [],
    uploaded: 0,
}

export const phaseOneSlice = createSlice({
    name: 'phaseOne',
    initialState,
    reducers: {
        connectEdge: (state, action) => {
            state.edgeState = action.payload
            const selectedNodeIds = [
                ...new Set(
                    state.edgeState
                        .filter((edge) => edge.target === "phase-one-result")
                        .map((edge) => edge.source)
                        .filter((sourceId) => sourceId !== "phase-one-result" && sourceId !== "context-factors")
                ),
            ];

            // Keep both raw IDs and legacy mapped representation for compatibility.
            state.selectedNodeIds = selectedNodeIds;
            state.selectedNodes = selectedNodeIds.map((id) => PhaseOneKeyValue[id] || id);
        },
        setNodeState: (state, action) => {
            state.nodeState = action.payload;
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
            state.selectedNodeIds = action.payload.selectedNodeIds || action.payload.selectedNodes || []
            state.uploaded++;
        }
    },
})

export const {connectEdge, setNodeState, updateResultName, setPhaseOneState, updateNodes} = phaseOneSlice.actions

export default phaseOneSlice.reducer
