import {useEffect, useMemo} from "react";
import ReactFlow, {Background, Controls, MiniMap} from "reactflow";
import {useDispatch} from "react-redux";
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

const nodeTypes = {
    root: CircleNode,
    goal: OvalNode,
    subgoal: RectangleNode,
    "domain-constraint": HexagonNode2,
    "quality-constraint": DiamondNode,
    "context-factor": CircleNode,
};
const edgeTypes = {dotted: DottedEdge, straight: StraightEdge};

const flattenTreeNodes = (treeNodes) => {
    const flatNodes = [];
    const HORIZONTAL_GAP = 320;
    const VERTICAL_GAP = 280;

    const getChildren = (node) => Array.isArray(node?.children) ? node.children : [];

    // First pass: compute subtree "width units" so siblings get non-overlapping horizontal lanes.
    const computeSubtreeUnits = (node) => {
        const children = getChildren(node);
        if (children.length === 0) {
            return 1;
        }
        const childUnits = children.map(computeSubtreeUnits);
        const totalUnits = childUnits.reduce((sum, value) => sum + value, 0);
        node.__layoutUnits = totalUnits;
        return totalUnits;
    };

    // Second pass: assign centered x and layered y positions.
    const assignLayout = (node, centerX, depth) => {
        const y = depth * VERTICAL_GAP;

        flatNodes.push({
            id: node.id,
            type: node.type,
            position: {x: centerX, y},
            data: {...node.data},
            draggable: node.draggable ?? false,
            parentId: node.parentId,
        });

        const children = getChildren(node);
        if (children.length === 0) {
            return;
        }

        const totalUnits = children
            .map((child) => child.__layoutUnits ?? 1)
            .reduce((sum, value) => sum + value, 0);

        let startX = centerX - ((totalUnits - 1) * HORIZONTAL_GAP) / 2;
        children.forEach((child) => {
            const units = child.__layoutUnits ?? 1;
            const childCenterX = startX + ((units - 1) * HORIZONTAL_GAP) / 2;
            assignLayout(child, childCenterX, depth + 1);
            startX += units * HORIZONTAL_GAP;
        });
    };

    treeNodes.forEach((rootNode, rootIndex) => {
        computeSubtreeUnits(rootNode);
        // Root is centered on x-axis and placed above all others (depth 0).
        const rootX = rootIndex === 0 ? 0 : rootIndex * HORIZONTAL_GAP * 2;
        assignLayout(rootNode, rootX, 0);
    });

    return flatNodes;
};

export default function PhaseResult() {
    const dispatch = useDispatch()
    const nodes = useMemo(() => flattenTreeNodes(AIActNodes), []);

    useEffect(() => {
        dispatch(setCurrentPhase(4))
    }, [dispatch]);

    return (
        <div style={{width: "100vw", height: "93vh"}}>
            <ReactFlow
                nodes={nodes}
                edges={AIActEdges}
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
