import {createSlice} from "@reduxjs/toolkit";

const initialState = {
    eliminatedGoalIds: [],
};

export const resultGoalEliminationSlice = createSlice({
    name: "resultGoalElimination",
    initialState,
    reducers: {
        toggleEliminatedGoal: (state, action) => {
            const id = action.payload;
            const idx = state.eliminatedGoalIds.indexOf(id);
            if (idx >= 0) {
                state.eliminatedGoalIds.splice(idx, 1);
            } else {
                state.eliminatedGoalIds.push(id);
            }
        },
        resetEliminatedGoals: (state) => {
            state.eliminatedGoalIds = [];
        },
    },
});

export const {toggleEliminatedGoal, resetEliminatedGoals} = resultGoalEliminationSlice.actions;
export default resultGoalEliminationSlice.reducer;
