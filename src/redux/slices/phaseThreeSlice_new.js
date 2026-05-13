import {createSlice} from '@reduxjs/toolkit'
import {PhaseThreeKeyValue} from "../../data/PhaseThreeKeyValue.js";
import {initialNodes3} from "../../pages/PhaseThree/phaseThree_nodes.js";
import {initialEdges3} from "../../pages/PhaseThree/phaseThree_edges.js";

const enforceFixedPhaseThreeRules = (nodes = []) => (
    (Array.isArray(nodes) ? nodes : []).map((node) => {
        if (node?.id !== "gdpr") {
            return node;
        }

        return {
            ...node,
            data: {
                ...node.data,
                isHidden: true,
                isChosen: false,
                isConnectable: false,
            },
        };
    })
);

const getVisibleSelectableNodeIds = (nodes = []) => (
    (Array.isArray(nodes) ? nodes : [])
        .filter((node) => node.data?.isConnectable && !node.data?.isHidden)
        .map((node) => node.id)
);

const normalizedInitialNodes3 = enforceFixedPhaseThreeRules(initialNodes3);

const initialState = {
    nodeState: normalizedInitialNodes3,
    edgeState: initialEdges3,
    resultName: "",
    selectedNodes: getVisibleSelectableNodeIds(normalizedInitialNodes3).map((id) => PhaseThreeKeyValue[id]).filter(Boolean),
    selectedNodeIds: getVisibleSelectableNodeIds(normalizedInitialNodes3),
    uploaded: 0,
}

export const phaseThreeSlice = createSlice({
    name: 'phaseThree',
    initialState,
    reducers: {
        resetPhaseThree: (state) => {
            state.nodeState = normalizedInitialNodes3;
            state.edgeState = initialEdges3;
            state.resultName = "";
            state.selectedNodeIds = getVisibleSelectableNodeIds(normalizedInitialNodes3);
            state.selectedNodes = state.selectedNodeIds.map((id) => PhaseThreeKeyValue[id]).filter(Boolean);
            state.uploaded = 0;
        },
        connectEdge3: (state, action) => {
            if (!Array.isArray(state.nodeState)) {
                console.error("nodeState is not an array: ", state.nodeState);
                return;
            }
            state.nodeState = enforceFixedPhaseThreeRules(state.nodeState);
            state.edgeState = action.payload
            const visibleNodeIds = getVisibleSelectableNodeIds(state.nodeState);

            state.selectedNodeIds = visibleNodeIds;
            state.selectedNodes = visibleNodeIds.map((id) => PhaseThreeKeyValue[id] || id);
        },
        updateNodes3: (state, action) => {
            if (action.payload === "aiact" || action.payload === "gdpr") {
                return;
            }
            state.nodeState = enforceFixedPhaseThreeRules(state.nodeState).map(node => {
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

            const visibleNodeIds = getVisibleSelectableNodeIds(state.nodeState);
            state.selectedNodeIds = visibleNodeIds;
            state.selectedNodes = visibleNodeIds.map((id) => PhaseThreeKeyValue[id] || id);
        },
        updateResultName3: (state, action) => {
            state.resultName = action.payload
        },
        setPhaseThreeState: (state, action) => {
            state.nodeState = enforceFixedPhaseThreeRules(action.payload.nodeState)
            state.edgeState = action.payload.edgeState
            state.resultName = action.payload.resultName
            const fallbackVisibleIds = getVisibleSelectableNodeIds(state.nodeState);
            state.selectedNodeIds = fallbackVisibleIds
            state.selectedNodes = fallbackVisibleIds.map((id) => PhaseThreeKeyValue[id] || id);
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
