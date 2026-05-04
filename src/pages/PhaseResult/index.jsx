import {useEffect, useMemo} from "react";
import ReactFlow, {Background, Controls, MiniMap} from "reactflow";
import {useDispatch, useSelector} from "react-redux";
import {setCurrentPhase} from "../../redux/slices/phaseStatusSlice.js";

import "reactflow/dist/style.css";
import OvalNode from "../../components/Shapes/OvalNode.jsx";
import DottedEdge from "../../components/DottedEdge/index.jsx";
import StraightEdge from "../../components/StraightEdge/index.jsx";
import {AIActNodes} from "./AIAct_nodes.js";
import {AIActEdges} from "./AIAct_edges.js";
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
        if (hiddenPhaseOneLeafIds.size === 0) {
            return AIActNodes;
        }

        return AIActNodes.map((rootNode) => {
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
    }, [hiddenPhaseOneLeafIds]);

    const nodes = useMemo(() => flattenTreeNodes(visibleTree), [visibleTree]);
    const edges = useMemo(() => {
        const visibleNodeIds = new Set(nodes.map((node) => node.id));
        return AIActEdges.filter(
            (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
        );
    }, [nodes]);

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
