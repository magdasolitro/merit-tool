import {useEffect, useState} from "react";
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
    const [showHelp, setShowHelp] = useState(false);
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
        <div style={{width: "100vw", height: "93vh", position: "relative"}}>
            <div style={{position: "absolute", top: 12, right: 18, zIndex: 20}}>
                {!showHelp ? (
                    <button
                        type="button"
                        className={"font-semibold text-lg phase-button explain-activity-button"}
                        onClick={() => setShowHelp(true)}
                    >
                        Explain Activity
                    </button>
                ) : (
                    <div
                        style={{
                            width: 420,
                            maxWidth: "36vw",
                            background: "rgba(15, 23, 42, 0.95)",
                            color: "#e5e7eb",
                            border: "2px solid #facc15",
                            borderRadius: 10,
                            padding: "14px 16px 14px 16px",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                            position: "relative",
                        }}
                    >
                        <button
                            type="button"
                            aria-label="Close help"
                            onClick={() => setShowHelp(false)}
                            style={{
                                position: "absolute",
                                top: 8,
                                right: 10,
                                background: "transparent",
                                border: "none",
                                color: "#facc15",
                                fontSize: 20,
                                lineHeight: 1,
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            ×
                        </button>
                        <p style={{margin: "0 24px 8px 0", fontWeight: 700, color: "#facc15"}}>Phase 2 - Principles Selection</p>
                        <p style={{margin: "0 0 8px 0", fontSize: 14}}>
                        <strong>What will I do in this phase?</strong><br/> In this phase you decide if you want to focus on specific principles.
                        </p>
                        <p style={{margin: "0 0 8px 0", fontSize: 14}}>
                            <strong>What are principles?</strong> <br/> Principles are the fundamental values that guide the design and operation of your system.
                        </p>
                        <p style={{margin: 0, fontSize: 14}}>
                            <strong>How to select the relevant principles? </strong> <br/>
                            For the purposes of this demo,<span style={{color: "#ef4444"}}> this phase has been temporarily disabled</span>. Please proceed to the next phase.
                        </p>
                    </div>
                )}
            </div>
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
