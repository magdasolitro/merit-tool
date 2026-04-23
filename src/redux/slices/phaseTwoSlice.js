import {createSlice} from '@reduxjs/toolkit'
import xRegModel from "../../data/xRegModel.js";
import {initialEdges} from "../../pages/PhaseTwo/initial-edges.js";


const initialState = {
    nodeState: [],
    edgeState: initialEdges,
    hiddenEdges: [],
    hiddenNodes: [],
    hiddenTactics: [],
    nodeTree: xRegModel.phaseTwo,
    uploaded: 0,
}

export const phaseTwoSlice = createSlice({
    name: 'phaseTwo',
    initialState,
    reducers: {
        resetPhaseTwo: (state) => {
            state.nodeState = [];
            state.edgeState = initialEdges;
            state.hiddenEdges = [];
            state.hiddenNodes = [];
            state.hiddenTactics = [];
            state.uploaded = 0;
        },
        updateNodes: (state, action) => {
            state.nodeState = action.payload
        },
        setHiddenNodes: (state, action) => {
            state.hiddenNodes = action.payload;
        },
        filterEdges: (state, action) => {
            const {needNodes} = action.payload;
            const sourceNodes = [action.payload.clickedNode, ...needNodes]
            const tacticNodes = [...new Set(action.payload.tacticNodes)]
            state.hiddenEdges = [...state.hiddenEdges, state.edgeState.filter((edge) => {
                return sourceNodes.includes(edge.source) && tacticNodes.includes(edge.target)
            })].flat();
            state.edgeState = state.edgeState.filter((edge) => {
                return !(sourceNodes.includes(edge.source) && tacticNodes.includes(edge.target))
            })
            const tacticNodesToBeHidden = tacticNodes.filter(target => !state.edgeState.some(edge => edge.target === target));
            state.hiddenTactics = [...state.hiddenTactics, state.nodeState.filter((node) => {
                return tacticNodesToBeHidden.includes(node.id)
            })].flat();
            state.nodeState = state.nodeState.filter((node) => {
                return !tacticNodesToBeHidden.includes(node.id)
            })
        },
        addEdges: (state, action) => {
            const nodes = action.payload;
            const edgesToBeAdded = state.hiddenEdges.filter((edge) => {
                return nodes.includes(edge.source)
            })
            state.hiddenEdges = state.hiddenEdges.filter((edge) => {
                return !nodes.includes(edge.source)
            })
            state.edgeState = [...state.edgeState, ...edgesToBeAdded]
            const targetList = edgesToBeAdded.map(edge => edge.target)
            const check = targetList.every(target => state.nodeState.some(node => node.id === target));
            if(!check) {
                const tacticNodesToBeAdded = state.hiddenTactics.filter(target => targetList.includes(target.id));
                state.hiddenTactics = state.hiddenTactics.filter((node) => {
                    return !nodes.includes(node.id)
                })
                state.nodeState = [...state.nodeState, ...tacticNodesToBeAdded]
            }
        },
        hideEdges: (state, action) => {
            const edgesToFilter = action.payload;
            const edgeIds = edgesToFilter.map(edge => edge.id);
            state.edgeState = state.edgeState.filter((edge) => {
                return !edgeIds.includes(edge.id)
            })
            state.hiddenEdges = [...state.hiddenEdges, edgesToFilter];
        },
        toggleHidden: (state, action) => {
            state.nodeState.map((node) => {
                if (node.id === action.payload) {
                    node.data.isHidden = !node.data.isHidden
                }
            });
        },
        setPhaseTwoState: (state, action) => {
            state.nodeState = action.payload.nodeState
            state.edgeState = action.payload.edgeState
            state.hiddenEdges = action.payload.hiddenEdges
            state.hiddenNodes = action.payload.hiddenNodes
            state.hiddenTactics = action.payload.hiddenTactics
            state.uploaded++;
        }
    },
})

export const {
    updateNodes,
    setHiddenNodes,
    filterEdges,
    hideEdges,
    addEdges,
    toggleHidden,
    setPhaseTwoState,
    resetPhaseTwo
} = phaseTwoSlice.actions

export default phaseTwoSlice.reducer
