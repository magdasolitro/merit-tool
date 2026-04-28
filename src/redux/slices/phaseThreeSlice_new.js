import {createSlice} from '@reduxjs/toolkit'
import {PhaseThreeKeyValue} from "../../data/PhaseThreeKeyValue.js";
import {initialNodes3} from "../../pages/PhaseThree/phaseThree_nodes.js";
import {initialEdges3} from "../../pages/PhaseThree/phaseThree_edges.js";


const initialState = {
    nodeState: initialNodes3,
    edgeState: initialEdges3,
    resultName: "",
    selectedNodes: initialNodes3.filter(node => node.data?.isChosen).map(node => PhaseThreeKeyValue[node.id]).filter(Boolean),
    selectedNodeIds: initialNodes3.filter(node => node.data?.isConnectable && !node.data?.isHidden).map(node => node.id),
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
            state.selectedNodeIds = initialNodes3.filter(node => node.data?.isConnectable && !node.data?.isHidden).map(node => node.id);
            state.uploaded = 0;
        },
        connectEdge3: (state, action) => {
            if (!Array.isArray(state.nodeState)) {
                console.error("nodeState is not an array: ", state.nodeState);
                return;
            }
            state.edgeState = action.payload
            const visibleNodeIds = state.nodeState
                .filter((node) => node.data?.isConnectable && !node.data?.isHidden)
                .map((node) => node.id);

            state.selectedNodeIds = visibleNodeIds;
            state.selectedNodes = visibleNodeIds.map((id) => PhaseThreeKeyValue[id] || id);
        },
        updateNodes3: (state, action) => {
            state.nodeState = state.nodeState.map(node => {
                if (node.id === action.payload) {
                    if (node.data?.isConnectable) {
                        node.data.isHidden = !node.data?.isHidden;
                        node.data.isChosen = !node.data.isHidden;
                    } else {
                        node.data.isChosen = !node.data.isChosen;
                    }
                }
                return node;
            });

            const visibleNodeIds = state.nodeState
                .filter((node) => node.data?.isConnectable && !node.data?.isHidden)
                .map((node) => node.id);
            state.selectedNodeIds = visibleNodeIds;
            state.selectedNodes = visibleNodeIds.map((id) => PhaseThreeKeyValue[id] || id);
        },
        updateResultName3: (state, action) => {
            state.resultName = action.payload
        },
        setPhaseThreeState: (state, action) => {
            state.nodeState = action.payload.nodeState
            state.edgeState = action.payload.edgeState
            state.resultName = action.payload.resultName
            state.selectedNodes = action.payload.selectedNodes
            const fallbackVisibleIds = (action.payload.nodeState || [])
                .filter((node) => node.data?.isConnectable && !node.data?.isHidden)
                .map((node) => node.id);
            state.selectedNodeIds = action.payload.selectedNodeIds || fallbackVisibleIds
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
