import {useEffect, useMemo} from "react";
import ReactFlow, {Background, Controls, MiniMap} from "reactflow";
import {useDispatch, useSelector} from "react-redux";
import {setCurrentPhase} from "../../redux/slices/phaseStatusSlice.js";

import "reactflow/dist/style.css";
import OvalNode from "../../components/Shapes/OvalNode.jsx";
import DottedEdge from "../../components/DottedEdge/index.jsx";
import StraightEdge from "../../components/StraightEdge/index.jsx";
import {
    estimateNodeSize,
    normalizeTreePositions as normalizeAIActTreePositions,
    raw_AIActNodes,
} from "./AIAct_nodes.js";
import {
    normalizeTreePositions as normalizeGDPRTreePositions,
    raw_GDPRNodes,
} from "../../data/GDPR_nodes.js";
import CircleNode from "../../components/Shapes/CircleNode.jsx";
import DiamondNode from "../../components/Shapes/DiamondNode.jsx";
import HexagonNode2 from "../../components/Shapes/HexagonNode2.jsx";
import RectangleNode from "../../components/Shapes/RectangleNode.jsx";
import {initialNodes as phaseOneInitialNodes} from "../PhaseOne/phaseOne_nodes.js";

const nodeTypes = {
    root: CircleNode,
    goal: OvalNode,
    subgoal: OvalNode,
    "domain-constraint": HexagonNode2,
    "quality-constraint": DiamondNode,
    "context-factor": RectangleNode,
};
const edgeTypes = {dotted: DottedEdge, straight: StraightEdge};

const flattenTreeNodes = (treeNodes) => {
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
            // Use the tree structure as source of truth for hierarchy edges.
            // Some datasets can contain stale or missing parentId values.
            parentId: structuralParentId ?? node.parentId,
            aiActLink: node.aiActLink ?? null,
        });

        getChildren(node).forEach((child) => walk(child, node.id));
    };

    treeNodes.forEach((rootNode) => walk(rootNode));

    return flatNodes;
};

const applyAiActLinksToFlatNodes = (flatNodes) => {
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

const collectEdgesFromFlatNodes = (flatNodes) => (
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

/** Vertical gap between bottom of AI Act drawing box and top of GDPR goal roots (3 cm in CSS px at 96dpi). */
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

/**
 * Ensures every GDPR goal root sits strictly below all AI Act nodes, with at least gapPx clearance.
 */
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

export default function PhaseResult() {
    const dispatch = useDispatch();
    const phaseOneNodeState = useSelector((state) => state.phaseOne?.nodeState ?? []);
    const phaseOneSelectedNodeIds = useSelector((state) => state.phaseOne?.selectedNodeIds ?? []);
    const phaseThreeSelectedNodeIds = useSelector((state) => state.phaseThreeNew?.selectedNodeIds ?? []);

    const hiddenPhaseOneLeafIds = useMemo(() => {
        const currentNodesById = new Map(phaseOneNodeState.map((node) => [node.id, node]));
        return new Set(
            phaseOneInitialNodes
                .filter((node) => node.data?.isConnectable)
                .map((node) => node.id)
                .filter((id) => {
                    const currentNode = currentNodesById.get(id);
                    return !currentNode || currentNode.data?.isHidden;
                })
        );
    }, [phaseOneNodeState]);

    const visibleTree = useMemo(() => {
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
        const namespacedGDPRTree = namespaceTree(visibleGDPRTree, "gdpr:");
        positionGdprForestBelowAiAct(
            namespacedGDPRTree,
            visibleAIActTree,
            GDPR_GAP_BELOW_AI_ACT_CM * CM_TO_CSS_PX
        );

        return [...visibleAIActTree, ...namespacedGDPRTree];
    }, [hiddenPhaseOneLeafIds, phaseOneSelectedNodeIds, phaseThreeSelectedNodeIds]);

    const graph = useMemo(() => {
        const baseNodes = flattenTreeNodes(visibleTree);
        const {nodes, linkEdges} = applyAiActLinksToFlatNodes(baseNodes);
        const hierarchyEdges = collectEdgesFromFlatNodes(nodes);
        return {
            nodes,
            edges: [...hierarchyEdges, ...linkEdges],
        };
    }, [visibleTree]);

    useEffect(() => {
        dispatch(setCurrentPhase(4));
    }, [dispatch]);

    return (
        <div style={{width: "100vw", height: "93vh"}}>
            <ReactFlow
                nodes={graph.nodes}
                edges={graph.edges}
                panOnScroll={true}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                maxZoom={1.5}
                minZoom={0.18}
            >
                <Controls/>
                <MiniMap pannable zoomable/>
                <Background variant="dots" gap={12} size={1}/>
            </ReactFlow>
        </div>
    );
}
