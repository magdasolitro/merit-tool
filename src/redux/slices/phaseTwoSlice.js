import {createSlice} from '@reduxjs/toolkit'
import {PhaseTwoKeyValue} from "../../data/PhaseTwoKeyValue.js";
import {initialNodes} from "../../pages/PhaseTwo/phaseTwo_nodes.js";
import {initialEdges} from "../../pages/PhaseTwo/phaseTwo_edges.js";


const initialState = {
    nodeState: initialNodes,
    edgeState: initialEdges,
    resultName: "",
    selectedNodes: initialNodes.filter(node => node.data?.isChosen).map(node => PhaseTwoKeyValue[node.id]).filter(Boolean),
    uploaded: 0,
}

export const phaseTwoSlice = createSlice({
    name: 'phaseTwo',
    initialState,
    reducers: {
        resetPhaseTwo: (state) => {
            state.nodeState = initialNodes;
            state.edgeState = initialEdges;
            state.resultName = "";
            state.selectedNodes = initialNodes.filter(node => node.data?.isChosen).map(node => PhaseTwoKeyValue[node.id]).filter(Boolean);
            state.uploaded = 0;
        },
        connectEdge2: (state, action) => {
            state.edgeState = action.payload
            state.selectedNodes = [] // reset selected nodes
            state.edgeState.filter(edge =>
                state.nodeState.some(node => node.id === edge.source && node.data?.isConnectable && node.data?.isChosen)
            )  
        },
        updateNodes2: (state, action) => {
            state.nodeState = action.payload
        },
        updateResultName2: (state, action) => {
            state.resultName = action.payload
        },
        setPhaseTwoState: (state, action) => {
            state.nodeState = action.payload.nodeState
            state.edgeState = action.payload.edgeState
            state.resultName = action.payload.resultName
            state.selectedNodes = action.payload.selectedNodes
            state.uploaded++;
        }
    },
})

export const {
    resetPhaseTwo,
    connectEdge2,
    updateNodes2,
    updateResultName2,
    setPhaseTwoState
} = phaseTwoSlice.actions

export default phaseTwoSlice.reducer
