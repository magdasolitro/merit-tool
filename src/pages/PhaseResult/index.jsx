import {useEffect, useMemo} from "react";
import ReactFlow, {Background, Controls, MiniMap} from "reactflow";
import {useDispatch, useSelector} from "react-redux";
import {setCurrentPhase} from "../../redux/slices/phaseStatusSlice.js";

import "reactflow/dist/style.css";
import OvalNode from "../../components/Shapes/OvalNode.jsx";
import DottedEdge from "../../components/DottedEdge/index.jsx";
import StraightEdge from "../../components/StraightEdge/index.jsx";
import {
    normalizeTreePositions as normalizeAIActTreePositions,
    raw_AIActNodes,
} from "./AIAct_nodes.js";
import {
    GDPRNodes,
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
const TREE_STACK_GAP_Y = 220;
const AI_ACT_LINK_GAP_Y = 140;

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
    const nodes = flatNodes.map((node) => ({
        ...node,
        position: {x: Number(node?.position?.x ?? 0), y: Number(node?.position?.y ?? 0)},
    }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const childrenByParent = new Map();

    nodes.forEach((node) => {
        if (!node.parentId) {
            return;
        }
        if (!childrenByParent.has(node.parentId)) {
            childrenByParent.set(node.parentId, []);
        }
        childrenByParent.get(node.parentId).push(node.id);
    });

    const shiftSubtree = (rootId, dx, dy) => {
        const stack = [rootId];
        while (stack.length > 0) {
            const currentId = stack.pop();
            const currentNode = nodeById.get(currentId);
            if (!currentNode) {
                continue;
            }
            currentNode.position = {
                x: currentNode.position.x + dx,
                y: currentNode.position.y + dy,
            };
            const children = childrenByParent.get(currentId) ?? [];
            children.forEach((childId) => stack.push(childId));
        }
    };

    const findAiActSubtreeRootId = (nodeId) => {
        let currentId = nodeId;

        while (true) {
            const currentNode = nodeById.get(currentId);
            if (!currentNode) {
                return nodeId;
            }

            const parentId = currentNode.parentId;
            if (!parentId || parentId.startsWith("gdpr:")) {
                return currentId;
            }

            const parentNode = nodeById.get(parentId);
            if (parentNode?.type === "root") {
                return currentId;
            }

            currentId = parentId;
        }
    };

    const getSubtreeMaxY = (rootId) => {
        const stack = [rootId];
        let maxY = -Infinity;

        while (stack.length > 0) {
            const currentId = stack.pop();
            const currentNode = nodeById.get(currentId);
            if (!currentNode || currentNode.id.startsWith("gdpr:")) {
                continue;
            }

            maxY = Math.max(maxY, Number(currentNode.position?.y ?? 0));
            const children = childrenByParent.get(currentId) ?? [];
            children.forEach((childId) => stack.push(childId));
        }

        return Number.isFinite(maxY) ? maxY : 0;
    };

    const linkEdges = [];
    nodes.forEach((node) => {
        if (!node.aiActLink || !node.id.startsWith("gdpr:")) {
            return;
        }
        const aiActTarget = nodeById.get(node.aiActLink);
        if (!aiActTarget) {
            return;
        }

        const aiActSubtreeRootId = findAiActSubtreeRootId(aiActTarget.id);
        const aiActSubtreeBottomY = getSubtreeMaxY(aiActSubtreeRootId);
        const targetX = Number(aiActTarget.position?.x ?? 0);
        const targetY = aiActSubtreeBottomY + AI_ACT_LINK_GAP_Y;
        shiftSubtree(node.id, targetX - node.position.x, targetY - node.position.y);

        linkEdges.push({
            id: `${aiActTarget.id}->${node.id}:link`,
            source: aiActTarget.id,
            target: node.id,
            type: "straight",
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

const getMaxTreeY = (treeNodes) => {
    let maxY = -Infinity;
    const walk = (node) => {
        maxY = Math.max(maxY, Number(node?.position?.y ?? 0));
        if (Array.isArray(node?.children)) {
            node.children.forEach(walk);
        }
    };
    treeNodes.forEach(walk);
    return Number.isFinite(maxY) ? maxY : 0;
};

const shiftTreeY = (treeNodes, offsetY) => {
    const walk = (node) => {
        node.position = {
            x: Number(node?.position?.x ?? 0),
            y: Number(node?.position?.y ?? 0) + offsetY,
        };
        if (Array.isArray(node?.children)) {
            node.children.forEach(walk);
        }
    };
    treeNodes.forEach(walk);
    return treeNodes;
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

export default function PhaseResult() {
    const dispatch = useDispatch();
    const phaseOneNodeState = useSelector((state) => state.phaseOne?.nodeState ?? []);
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
        const visibleAIActTree = buildVisibleAIActTree(hiddenPhaseOneLeafIds);

        if (!showGDPR) {
            return visibleAIActTree;
        }

        const visibleGDPRTree = normalizeGDPRTreePositions(raw_GDPRNodes);
        const namespacedGDPRTree = namespaceTree(visibleGDPRTree ?? GDPRNodes, "gdpr:");

        const aiActBottomY = getMaxTreeY(visibleAIActTree);
        const gdprRootY = Number(namespacedGDPRTree[0]?.position?.y ?? 0);
        const gdprOffsetY = aiActBottomY + TREE_STACK_GAP_Y - gdprRootY;
        const shiftedGDPRTree = shiftTreeY(namespacedGDPRTree, gdprOffsetY);

        return [...visibleAIActTree, ...shiftedGDPRTree];
    }, [hiddenPhaseOneLeafIds, phaseThreeSelectedNodeIds]);

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
