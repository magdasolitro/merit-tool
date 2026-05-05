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

const flattenTreeNodes = (treeNodes) => {
    const flatNodes = [];
    const getChildren = (node) => Array.isArray(node?.children) ? node.children : [];
    const walk = (node) => {
        flatNodes.push({
            id: node.id,
            type: node.type,
            position: {
                x: Number(node?.position?.x ?? 0),
                y: Number(node?.position?.y ?? 0),
            },
            data: {...node.data},
            draggable: node.draggable ?? false,
            parentId: node.parentId,
        });

        getChildren(node).forEach((child) => walk(child));
    };

    treeNodes.forEach((rootNode) => walk(rootNode));

    return flatNodes;
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
        return [...visibleAIActTree, ...namespacedGDPRTree];
    }, [hiddenPhaseOneLeafIds, phaseThreeSelectedNodeIds]);

    const nodes = useMemo(() => flattenTreeNodes(visibleTree), [visibleTree]);
    const edges = useMemo(() => collectEdgesFromFlatNodes(nodes), [nodes]);

    useEffect(() => {
        dispatch(setCurrentPhase(4));
    }, [dispatch]);

    return (
        <div style={{width: "100vw", height: "93vh"}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
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
