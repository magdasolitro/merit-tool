import {
    estimateNodeSize,
    normalizeTreePositions as normalizeAIActTreePositions,
    raw_AIActNodes,
} from "./AIAct_nodes.js";
import {
    normalizeTreePositions as normalizeGDPRTreePositions,
    raw_GDPRNodes,
} from "../../data/GDPR_nodes.js";
import {initialNodes as phaseOneInitialNodes} from "../PhaseOne/phaseOne_nodes.js";

/** Maps AI Act / regulation tree node id → distinct CF labels that list it in unlocks (Phase 1 selection). */
export const buildUnlockContributorLabelsByTargetId = (selectedCfIds) => {
    const selected = new Set(Array.isArray(selectedCfIds) ? selectedCfIds : []);
    const map = new Map();

    phaseOneInitialNodes.forEach((node) => {
        if (!node?.data?.isConnectable || !selected.has(node.id)) {
            return;
        }
        const unlocks = Array.isArray(node.unlocks) ? node.unlocks : [];
        if (unlocks.length === 0) {
            return;
        }
        const cfName = node.data?.label ?? node.id;
        unlocks.forEach((targetId) => {
            if (typeof targetId !== "string") {
                return;
            }
            if (!map.has(targetId)) {
                map.set(targetId, []);
            }
            map.get(targetId).push(cfName);
        });
    });

    map.forEach((labels, key) => {
        map.set(key, [...new Set(labels)].sort((a, b) => a.localeCompare(b)));
    });

    return map;
};

export const mergeUnlockContributorHintsIntoFlatNodes = (flatNodes, contributorByTargetId) => {
    if (!contributorByTargetId || contributorByTargetId.size === 0) {
        return flatNodes;
    }
    return flatNodes.map((node) => {
        const labels = contributorByTargetId.get(node.id);
        if (!labels?.length) {
            return node;
        }
        return {
            ...node,
            data: {
                ...node.data,
                unlockContributorLabels: labels,
            },
        };
    });
};

export const flattenTreeNodes = (treeNodes) => {
    const flatNodes = [];
    const getChildren = (node) => Array.isArray(node?.children) ? node.children : [];
    const walk = (node, structuralParentId = undefined) => {
        flatNodes.push({
            id: node.id,
            type: node.type,
            position: {
                x: Number(node?.position?.x ?? 0),
                y: Number(node?.position?.y ?? 0),
            },
            data: {...node.data},
            draggable: node.draggable ?? false,
            parentId: structuralParentId ?? node.parentId,
            aiActLink: node.aiActLink ?? null,
        });

        getChildren(node).forEach((child) => walk(child, node.id));
    };

    treeNodes.forEach((rootNode) => walk(rootNode));

    return flatNodes;
};

export const applyAiActLinksToFlatNodes = (flatNodes) => {
    const nodes = flatNodes.map((node) => ({...node}));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const linkEdges = [];
    nodes.forEach((node) => {
        if (!node.aiActLink || !node.id.startsWith("gdpr:")) {
            return;
        }
        const aiActTarget = nodeById.get(node.aiActLink);
        if (!aiActTarget) {
            return;
        }

        linkEdges.push({
            id: `${aiActTarget.id}->${node.id}:link`,
            source: aiActTarget.id,
            target: node.id,
            type: "dotted",
            style: {stroke: "#ffffff"},
        });
    });

    return {nodes, linkEdges};
};

export const collectEdgesFromFlatNodes = (flatNodes) => (
    flatNodes
        .filter((node) => node?.parentId)
        .map((node) => ({
            id: `${node.parentId}->${node.id}`,
            source: node.parentId,
            target: node.id,
            type: "straight",
        }))
);

const namespaceTree = (treeNodes, prefix) => {
    const walk = (node) => {
        const namespacedId = `${prefix}${node.id}`;
        const namespacedParentId = node.parentId ? `${prefix}${node.parentId}` : undefined;
        return {
            ...node,
            id: namespacedId,
            ...(namespacedParentId ? {parentId: namespacedParentId} : {}),
            children: Array.isArray(node.children) ? node.children.map(walk) : node.children,
        };
    };
    return treeNodes.map(walk);
};

const GDPR_REGULATION_ROOT_ID = "gdpr-regulation-root";
const GDPR_ROOT_TO_GOALS_GAP_PX = 1000;

const deepCloneForestRoots = (roots) => JSON.parse(JSON.stringify(roots ?? []));

const collectForestBounds = (forestRoots) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const visit = (node) => {
        if (!node) {
            return;
        }
        const x = Number(node?.position?.x ?? 0);
        const y = Number(node?.position?.y ?? 0);
        const {width, height} = estimateNodeSize(node);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + width);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + height);
        (Array.isArray(node.children) ? node.children : []).forEach(visit);
    };
    (Array.isArray(forestRoots) ? forestRoots : []).forEach(visit);
    return {minX, maxX, minY, maxY};
};

const buildGdprForestWithRegulationRoot = (visibleGdprGoalRoots) => {
    const goals = deepCloneForestRoots(visibleGdprGoalRoots);
    if (goals.length === 0) {
        return null;
    }
    goals.forEach((goalRoot) => {
        goalRoot.parentId = GDPR_REGULATION_ROOT_ID;
    });

    const metaRoot = {
        id: GDPR_REGULATION_ROOT_ID,
        type: "root",
        data: {
            isHidden: false,
            label: "GDPR",
            top: "no",
        },
        draggable: false,
        children: goals,
    };

    const {minX, maxX, minY} = collectForestBounds(goals);
    if (Number.isFinite(minX) && Number.isFinite(minY)) {
        const rootSize = estimateNodeSize(metaRoot);
        const centerX = (minX + maxX) / 2;
        metaRoot.position = {
            x: centerX - rootSize.width / 2,
            y: minY - GDPR_ROOT_TO_GOALS_GAP_PX - rootSize.height,
        };
    }

    const namespaced = namespaceTree([metaRoot], "gdpr:");
    return namespaced[0] ?? null;
};

const collectDescendantsByType = (node, type, acc = []) => {
    if (!node || !Array.isArray(node.children)) {
        return acc;
    }

    node.children.forEach((child) => {
        if (child?.type === type) {
            acc.push(child);
        }
        collectDescendantsByType(child, type, acc);
    });

    return acc;
};

const buildVisibleAIActTree = (hiddenPhaseOneLeafIds) => {
    const baseTree = hiddenPhaseOneLeafIds.size === 0
        ? raw_AIActNodes
        : raw_AIActNodes.map((rootNode) => {
            if (!Array.isArray(rootNode.children)) {
                return rootNode;
            }

            const filteredGoals = rootNode.children.filter((goalNode) => {
                const goalContextFactors = collectDescendantsByType(goalNode, "context-factor");
                return !goalContextFactors.some((cfNode) => hiddenPhaseOneLeafIds.has(cfNode.id));
            });

            return {
                ...rootNode,
                children: filteredGoals,
            };
        });

    return normalizeAIActTreePositions(baseTree);
};

const GDPR_GAP_BELOW_AI_ACT_CM = 10;
const CM_TO_CSS_PX = 96 / 2.54;

const collectForestMaxBottomY = (forestRoots) => {
    let maxBottom = -Infinity;
    const walk = (node) => {
        const y = Number(node?.position?.y ?? 0);
        const {height} = estimateNodeSize(node);
        maxBottom = Math.max(maxBottom, y + height);
        (Array.isArray(node.children) ? node.children : []).forEach(walk);
    };
    (Array.isArray(forestRoots) ? forestRoots : []).forEach((root) => walk(root));
    return Number.isFinite(maxBottom) ? maxBottom : 0;
};

const shiftSubtreeBy = (node, dx, dy) => {
    if (!node) {
        return;
    }
    node.position = {
        x: Number(node?.position?.x ?? 0) + dx,
        y: Number(node?.position?.y ?? 0) + dy,
    };
    (Array.isArray(node.children) ? node.children : []).forEach((ch) => shiftSubtreeBy(ch, dx, dy));
};

const positionGdprForestBelowAiAct = (gdprForestRoots, aiActForestRoots, gapPx) => {
    const roots = Array.isArray(gdprForestRoots) ? gdprForestRoots : [];
    if (roots.length === 0) {
        return;
    }
    const aiBottom = collectForestMaxBottomY(aiActForestRoots);
    let minRootTopY = Infinity;
    roots.forEach((root) => {
        minRootTopY = Math.min(minRootTopY, Number(root?.position?.y ?? 0));
    });
    if (!Number.isFinite(minRootTopY)) {
        return;
    }
    const deltaY = aiBottom + gapPx - minRootTopY;
    if (deltaY <= 0) {
        return;
    }
    roots.forEach((root) => shiftSubtreeBy(root, 0, deltaY));
};

const getContextFactorVisibilityRules = (selectedPhaseOneNodeIds) => {
    const selectedIds = new Set(Array.isArray(selectedPhaseOneNodeIds) ? selectedPhaseOneNodeIds : []);
    const blockedRootIds = new Set();
    const unlockedRootIds = new Set();

    phaseOneInitialNodes
        .filter((node) => node?.data?.isConnectable)
        .forEach((cfNode) => {
            const isSelected = selectedIds.has(cfNode.id);
            const hasBlocks = Array.isArray(cfNode.blocks) && cfNode.blocks.length > 0;
            const hasUnlocks = Array.isArray(cfNode.unlocks) && cfNode.unlocks.length > 0;

            if (hasBlocks && !isSelected) {
                cfNode.blocks.forEach((id) => blockedRootIds.add(id));
            }

            if (hasUnlocks && isSelected) {
                cfNode.unlocks.forEach((id) => unlockedRootIds.add(id));
            }
        });

    return {blockedRootIds, unlockedRootIds};
};

const collectSubtreeIdsByRootIds = (treeNodes, rootIds) => {
    const idsToCollect = new Set(rootIds);
    const collectedIds = new Set();

    const visitSubtree = (node) => {
        if (!node) {
            return;
        }
        collectedIds.add(node.id);
        if (Array.isArray(node.children)) {
            node.children.forEach(visitSubtree);
        }
    };

    const walk = (node) => {
        if (!node) {
            return;
        }
        if (idsToCollect.has(node.id)) {
            visitSubtree(node);
            return;
        }
        if (Array.isArray(node.children)) {
            node.children.forEach(walk);
        }
    };

    (Array.isArray(treeNodes) ? treeNodes : []).forEach(walk);
    return collectedIds;
};

const filterTreeByHiddenNodeIds = (treeNodes, hiddenNodeIds) => {
    const prune = (node) => {
        if (!node || hiddenNodeIds.has(node.id)) {
            return null;
        }

        const children = Array.isArray(node.children)
            ? node.children.map(prune).filter(Boolean)
            : node.children;

        return {
            ...node,
            children,
        };
    };

    return (Array.isArray(treeNodes) ? treeNodes : [])
        .map(prune)
        .filter(Boolean);
};

/**
 * Same forest as PhaseResult `visibleTree` useMemo (AI Act + optional GDPR meta root).
 */
export function computeVisibleResultTree({
    hiddenPhaseOneLeafIds,
    phaseOneSelectedNodeIds,
    phaseThreeSelectedNodeIds,
}) {
    const showGDPR = phaseThreeSelectedNodeIds.includes("gdpr");
    const baseVisibleAIActTree = buildVisibleAIActTree(hiddenPhaseOneLeafIds);
    const {blockedRootIds, unlockedRootIds} = getContextFactorVisibilityRules(phaseOneSelectedNodeIds);
    const blockedIdsWithDescendants = collectSubtreeIdsByRootIds(baseVisibleAIActTree, blockedRootIds);
    const unlockedIdsWithDescendants = collectSubtreeIdsByRootIds(baseVisibleAIActTree, unlockedRootIds);
    const effectiveHiddenNodeIds = new Set(
        [...blockedIdsWithDescendants].filter((nodeId) => !unlockedIdsWithDescendants.has(nodeId))
    );
    const visibleAIActTree = filterTreeByHiddenNodeIds(baseVisibleAIActTree, effectiveHiddenNodeIds);

    if (!showGDPR) {
        return visibleAIActTree;
    }

    const visibleGDPRTree = normalizeGDPRTreePositions(raw_GDPRNodes);
    const gdprTreeWithRoot = buildGdprForestWithRegulationRoot(visibleGDPRTree);
    if (!gdprTreeWithRoot) {
        return visibleAIActTree;
    }
    positionGdprForestBelowAiAct(
        [gdprTreeWithRoot],
        visibleAIActTree,
        GDPR_GAP_BELOW_AI_ACT_CM * CM_TO_CSS_PX
    );

    return [...visibleAIActTree, gdprTreeWithRoot];
}

/**
 * Phase 4: each eliminated goal stays in the tree (for the red cross) but its whole subtree is removed from the model.
 */
export function pruneEliminatedGoalSubtreesForPhaseFour(forestRoots, eliminatedGoalIds) {
    if (!Array.isArray(forestRoots) || forestRoots.length === 0) {
        return forestRoots;
    }
    const eliminated = new Set(Array.isArray(eliminatedGoalIds) ? eliminatedGoalIds : []);
    if (eliminated.size === 0) {
        return forestRoots;
    }

    const walk = (node) => {
        if (!node) {
            return null;
        }
        if (node.type === "goal" && eliminated.has(node.id)) {
            return {...node, children: []};
        }
        const children = Array.isArray(node.children)
            ? node.children.map(walk).filter(Boolean)
            : node.children;
        return {...node, children};
    };

    return forestRoots.map(walk).filter(Boolean);
}

const pruneGoalNode = (node, eliminated) => {
    if (!node) {
        return null;
    }
    if (node.type === "goal" && eliminated.has(node.id)) {
        return null;
    }
    const children = Array.isArray(node.children)
        ? node.children.map((ch) => pruneGoalNode(ch, eliminated)).filter(Boolean)
        : node.children;
    return {...node, children};
};

/**
 * Removes goal nodes whose ids are in `eliminatedGoalIds` (and their subtrees).
 * Drops an empty GDPR regulation meta-root if all its goals were removed.
 */
export function filterEliminatedGoalsFromVisibleTree(forestRoots, eliminatedGoalIds) {
    if (!Array.isArray(forestRoots) || forestRoots.length === 0) {
        return forestRoots;
    }
    const eliminated = new Set(Array.isArray(eliminatedGoalIds) ? eliminatedGoalIds : []);
    if (eliminated.size === 0) {
        return forestRoots;
    }

    const GDPR_META_ROOT_ID = "gdpr:gdpr-regulation-root";

    return forestRoots
        .map((root) => pruneGoalNode(root, eliminated))
        .filter((root) => {
            if (!root) {
                return false;
            }
            if (root.id === GDPR_META_ROOT_ID) {
                const ch = root.children;
                return Array.isArray(ch) && ch.length > 0;
            }
            return true;
        });
}

export function buildReactFlowGraphFromVisibleTree(visibleTree, phaseOneSelectedNodeIds, goalEliminatedIds = []) {
    const eliminatedSet = new Set(Array.isArray(goalEliminatedIds) ? goalEliminatedIds : []);
    const contributorByTargetId = buildUnlockContributorLabelsByTargetId(phaseOneSelectedNodeIds);
    const baseNodes = mergeUnlockContributorHintsIntoFlatNodes(
        flattenTreeNodes(visibleTree),
        contributorByTargetId
    ).map((n) => ({
        ...n,
        data: {
            ...n.data,
            ...(n.type === "goal" && eliminatedSet.has(n.id) ? {goalEliminatedPhase4: true} : {}),
        },
    }));
    const {nodes, linkEdges} = applyAiActLinksToFlatNodes(baseNodes);
    const hierarchyEdges = collectEdgesFromFlatNodes(nodes);
    return {
        nodes,
        edges: [...hierarchyEdges, ...linkEdges],
    };
}

/**
 * JSON export: removes every goal with `goalEliminatedPhase4: true` and all descendant nodes
 * (by `parentId` chain). Drops edges whose source or target is removed.
 */
export function filterGraphForExport(nodes, edges) {
    const list = Array.isArray(nodes) ? nodes : [];
    const edgeList = Array.isArray(edges) ? edges : [];
    if (list.length === 0) {
        return {nodes: [], edges: []};
    }

    const excluded = new Set();
    for (const n of list) {
        if (n?.type === "goal" && n.data?.goalEliminatedPhase4 === true) {
            excluded.add(n.id);
        }
    }

    let grew;
    do {
        grew = false;
        for (const n of list) {
            if (excluded.has(n.id)) {
                continue;
            }
            const pid = n?.parentId;
            if (pid != null && excluded.has(String(pid))) {
                excluded.add(n.id);
                grew = true;
            }
        }
    } while (grew);

    const keptNodes = list.filter((n) => !excluded.has(n.id));
    const keptIds = new Set(keptNodes.map((n) => n.id));
    const keptEdges = edgeList.filter(
        (e) => e && keptIds.has(e.source) && keptIds.has(e.target)
    );

    return {nodes: keptNodes, edges: keptEdges};
}
