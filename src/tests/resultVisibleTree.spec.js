import {computeVisibleResultTree} from "../pages/PhaseResult/resultVisibleTree.js";

const collectNodeIds = (forestRoots) => {
    const ids = new Set();

    const walk = (node) => {
        if (!node) {
            return;
        }

        ids.add(node.id);
        (Array.isArray(node.children) ? node.children : []).forEach(walk);
    };

    (Array.isArray(forestRoots) ? forestRoots : []).forEach(walk);
    return ids;
};

describe("computeVisibleResultTree", () => {
    it("hides AI Act articles when none of their related context factors are selected", () => {
        const visibleTree = computeVisibleResultTree({
            hiddenPhaseOneLeafIds: new Set(),
            phaseOneSelectedNodeIds: ["cf-9-1"],
        });

        const visibleIds = collectNodeIds(visibleTree);

        expect(visibleIds.has("goal-9")).toBe(true);
        expect(visibleIds.has("goal-10")).toBe(false);
        expect(visibleIds.has("goal-13")).toBe(false);
        expect(visibleIds.has("goal-14")).toBe(false);
        expect(visibleIds.has("goal-15")).toBe(false);
    });

    it("keeps an AI Act article visible when at least one related context factor is selected", () => {
        const visibleTree = computeVisibleResultTree({
            hiddenPhaseOneLeafIds: new Set(),
            phaseOneSelectedNodeIds: ["cf-15-5"],
        });

        const visibleIds = collectNodeIds(visibleTree);

        expect(visibleIds.has("goal-15")).toBe(true);
        expect(visibleIds.has("goal-9")).toBe(false);
    });

    it("never shows GDPR nodes in the result tree", () => {
        const visibleTree = computeVisibleResultTree({
            hiddenPhaseOneLeafIds: new Set(),
            phaseOneSelectedNodeIds: ["cf-9-1"],
        });

        const visibleIds = collectNodeIds(visibleTree);

        expect([...visibleIds].some((id) => String(id).startsWith("gdpr:"))).toBe(false);
    });
});
