import phaseThreeReducer, {
    setPhaseThreeState,
    updateNodes3,
} from "../redux/slices/phaseThreeSlice_new.js";

const getGdprNode = (state) => state.nodeState.find((node) => node.id === "gdpr");

describe("phaseThreeSlice_new", () => {
    it("keeps GDPR always hidden and non-interactive in the initial state", () => {
        const state = phaseThreeReducer(undefined, {type: "@@INIT"});
        const gdprNode = getGdprNode(state);

        expect(gdprNode.data?.isHidden).toBe(true);
        expect(gdprNode.data?.isConnectable).toBe(false);
        expect(gdprNode.data?.isChosen).toBe(false);
        expect(state.selectedNodeIds.includes("gdpr")).toBe(false);
    });

    it("ignores clicks on GDPR and re-normalizes loaded legacy state", () => {
        const initialState = phaseThreeReducer(undefined, {type: "@@INIT"});
        const afterClick = phaseThreeReducer(initialState, updateNodes3("gdpr"));

        expect(getGdprNode(afterClick)).toEqual(getGdprNode(initialState));

        const restoredState = phaseThreeReducer(
            initialState,
            setPhaseThreeState({
                nodeState: [
                    {
                        id: "gdpr",
                        type: "regulation",
                        position: {x: 0, y: 0},
                        data: {
                            label: "GDPR",
                            isHidden: false,
                            isConnectable: true,
                            isChosen: true,
                        },
                        draggable: false,
                    },
                ],
                edgeState: [],
                resultName: "",
                selectedNodes: ["gdpr"],
                selectedNodeIds: ["gdpr"],
            })
        );

        const gdprNode = getGdprNode(restoredState);

        expect(gdprNode.data?.isHidden).toBe(true);
        expect(gdprNode.data?.isConnectable).toBe(false);
        expect(gdprNode.data?.isChosen).toBe(false);
        expect(restoredState.selectedNodeIds.includes("gdpr")).toBe(false);
    });
});
