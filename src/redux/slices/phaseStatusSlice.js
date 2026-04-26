import {createSlice} from '@reduxjs/toolkit'

const initialState = {
    nextPhaseEnabled: false,
    currentPhase: 1,
    uploaded: 0,
    phase3Value: "Phase 3(a)",
    infoToggle: true,
}
export const phaseStatusSlice = createSlice({
    name: 'phaseStatus',
    initialState,
    reducers: {
        setNextPhaseEnabled: (state, action) => {
            state.nextPhaseEnabled = action.payload;
        },
        setCurrentPhase: (state, action) => {
            state.currentPhase = action.payload;
        },
        setPhaseStatusState: (state, action) => {
            state.nextPhaseEnabled = action.payload.nextPhaseEnabled;
            state.currentPhase = action.payload.currentPhase;
            state.uploaded++;
        },
        // setPhase3Value: (state, action) => {
        //     state.phase3Value = action.payload;
        // },
        toggleInfo: (state) => {
            state.infoToggle = !state.infoToggle;
        }
    },
});

export const {setNextPhaseEnabled, setCurrentPhase, setPhase3Value, setPhaseStatusState, toggleInfo} = phaseStatusSlice.actions;

export default phaseStatusSlice.reducer;
