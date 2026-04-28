import {useEffect} from "react";
import ReactFlow, {Background, Controls, MiniMap, useEdgesState, useNodesState} from "reactflow";
import "reactflow/dist/style.css";
import {useDispatch, useSelector} from "react-redux";
import PrinciplesOval from "../../components/Shapes/PrinciplesOval.jsx";
import FloatingEdge from "../../components/FloatingEdge";
import DottedEdge from "../../components/DottedEdge";
import {connectEdge2, setPhaseTwoState} from "../../redux/slices/phaseTwoSlice.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import {initialNodes2} from "./phaseTwo_nodes.js";
import {initialEdges2} from "./phaseTwo_edges.js";

const nodeTypes = {principle: PrinciplesOval};
const edgeTypes = {floating: FloatingEdge, dotted: DottedEdge};

export default function PhaseTwo() {
    const phaseTwoState = useSelector((state) => state.phaseTwo);
    const edgeState = useSelector((state) => state.phaseTwo.edgeState);
    const nodeState = useSelector((state) => state.phaseTwo.nodeState);
    const [nodes, setNodes] = useNodesState(nodeState);
    const [edges, setEdges] = useEdgesState(edgeState);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setCurrentPhase(2));
        dispatch(setNextPhaseEnabled(true));
    }, [dispatch]);

    useEffect(() => {
        dispatch(
            setPhaseTwoState({
                edgeState: initialEdges2,
                nodeState: initialNodes2,
                resultName: "",
                selectedNodes: [],
                selectedNodeIds: ["ethics", "fairness", "transparency", "robustness", "privacy", "security", "accountability", "data-quality"],
                uploaded: 0,
            })
        );
    }, [dispatch]);

    useEffect(() => {
        setNodes(nodeState);
    }, [nodeState, setNodes]);

    useEffect(() => {
        setEdges(edgeState);
    }, [edgeState, phaseTwoState.uploaded, setEdges]);

    // Keep selected IDs synchronized in Redux; these are consumed when moving to phase 3.
    useEffect(() => {
        dispatch(connectEdge2(edges));
    }, [dispatch, edges]);

    return (
        <div style={{width: "100vw", height: "93vh"}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                panOnScroll
                maxZoom={1.5}
                minZoom={0.18}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                deleteKeyCode={""}
            >
                <Controls />
                <MiniMap pannable zoomable />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}
