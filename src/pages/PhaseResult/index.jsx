import {useEffect, useMemo} from "react";
import ReactFlow, {Background, Controls, MiniMap} from "reactflow";
import {useDispatch} from "react-redux";
import {setCurrentPhase} from "../../redux/slices/phaseStatusSlice.js";

import "reactflow/dist/style.css";
import RectangleNode from "../../components/Shapes/RectangleNode.jsx";
import OvalNode from "../../components/Shapes/OvalNode.jsx";
import DottedEdge from "../../components/DottedEdge/index.jsx";
import StraightEdge from "../../components/StraightEdge/index.jsx";
import {AIActNodes} from "./AIAct_nodes.js";
import {AIActEdges} from "./AIAct_edges.js";

const nodeTypes = {
    tactic: RectangleNode,
    oval: OvalNode};
const edgeTypes = {dotted: DottedEdge, straight: StraightEdge};

const flattenTreeNodes = (treeNodes) => {
    const flatNodes = [];

    const walk = (node, inheritedOffset = {x: 0, y: 0}) => {
        const absoluteX = inheritedOffset.x + (node?.position?.x ?? 0);
        const absoluteY = inheritedOffset.y + (node?.position?.y ?? 0);

        flatNodes.push({
            id: node.id,
            type: node.type,
            position: {x: absoluteX, y: absoluteY},
            data: {...node.data},
            draggable: node.draggable ?? false,
            parentId: node.parentId,
        });

        if (Array.isArray(node?.children)) {
            node.children.forEach((child) => walk(child, {x: absoluteX, y: absoluteY}));
        }
    };

    treeNodes.forEach((rootNode) => walk(rootNode));
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
                edges={[]}
                panOnScroll={true}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                maxZoom={1.5}
                minZoom={0.18}
            >
                <Controls/>
            </ReactFlow>
        </div>
    );
}
