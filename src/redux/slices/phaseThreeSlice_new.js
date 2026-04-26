import {createSlice} from '@reduxjs/toolkit'
import {PhaseThreeKeyValue} from "../../data/PhaseThreeKeyValue.js";
import {initialNodes3} from "../../pages/PhaseThree/phaseThree_nodes.js";
import {initialEdges3} from "../../pages/PhaseThree/phaseThree_edges.js";


const initialState = {
    nodeState: initialNodes3,
    edgeState: initialEdges3,
    resultName: "",
    selectedNodes: initialNodes3.filter(node => node.data?.isChosen).map(node => PhaseThreeKeyValue[node.id]).filter(Boolean),
    uploaded: 0,
}

export const phaseThreeSlice = createSlice({
    name: 'phaseThree',
    initialState,
    reducers: {
        resetPhaseThree: (state) => {
            state.nodeState = initialNodes3;
            state.edgeState = initialEdges3;
            state.resultName = "";
            state.selectedNodes = initialNodes3.filter(node => node.data?.isChosen).map(node => PhaseThreeKeyValue[node.id]).filter(Boolean);
            state.uploaded = 0;
        },
        connectEdge3: (state, action) => {
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
        updateNodes3: (state, action) => {
            state.nodeState = state.nodeState.map(node => {
                if (node.id === action.payload) {
                    node.data.isChosen = !node.data.isChosen;
                }
                return node;
            });
        },
        updateResultName3: (state, action) => {
            state.resultName = action.payload
        },
        setPhaseThreeState: (state, action) => {
            state.nodeState = action.payload.nodeState
            state.edgeState = action.payload.edgeState
            state.resultName = action.payload.resultName
            state.selectedNodes = action.payload.selectedNodes
            state.uploaded++;
        }
    },
})

export const {
    resetPhaseThree,
    connectEdge3,
    updateNodes3,
    updateResultName3,
    setPhaseThreeState
} = phaseThreeSlice.actions

export default phaseThreeSlice.reducer
