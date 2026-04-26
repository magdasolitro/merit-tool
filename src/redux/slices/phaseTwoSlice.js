import {createSlice} from '@reduxjs/toolkit'
import {PhaseTwoKeyValue} from "../../data/PhaseTwoKeyValue.js";
import {initialNodes2} from "../../pages/PhaseTwo/phaseTwo_nodes.js";
import {initialEdges2} from "../../pages/PhaseTwo/phaseTwo_edges.js";


const initialState = {
    nodeState: initialNodes2,
    edgeState: initialEdges2,
    resultName: "",
    selectedNodes: initialNodes2.filter(node => node.data?.isChosen).map(node => PhaseTwoKeyValue[node.id]).filter(Boolean),
    uploaded: 0,
}

export const phaseTwoSlice = createSlice({
    name: 'phaseTwo',
    initialState,
    reducers: {
        resetPhaseTwo: (state) => {
            state.nodeState = initialNodes2;
            state.edgeState = initialEdges2;
            state.resultName = "";
            state.selectedNodes = initialNodes2.filter(node => node.data?.isChosen).map(node => PhaseTwoKeyValue[node.id]).filter(Boolean);
            state.uploaded = 0;
        },
        connectEdge2: (state, action) => {
            if (!Array.isArray(state.nodeState)) {
                console.error("nodeState is not an array: ", state.nodeState);
                return;
            }
            state.edgeState = action.payload
            state.selectedNodes = [] // reset selected nodes
            state.edgeState.filter(edge =>
                state.nodeState.some(node => node.id === edge.source && node.data?.isConnectable && node.data?.isChosen)
            )  
        },
        updateNodes2: (state, action) => {
            state.nodeState = state.nodeState.map(node => {
                if (node.id === action.payload) {
                    node.data.isChosen = !node.data.isChosen;
                }
                return node;
            });
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
