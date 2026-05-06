import {useCallback, useEffect, useState} from "react";
import ReactFlow, {Background, Controls, MiniMap, useEdgesState, useNodesState,} from "reactflow";

import "reactflow/dist/style.css";
import RegulationOval from "../../components/Shapes/RegulationOval.jsx";
import FloatingEdge from "../../components/FloatingEdge";
import ConnectionLine from "../../components/ConnectionLine";
import {useDispatch, useSelector} from "react-redux";
import {connectEdge3, updateNodes3} from "../../redux/slices/phaseThreeSlice_new.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import {initialNodes3} from "./phaseThree_nodes.js";
import {initialEdges3} from "./phaseThree_edges.js";

const nodeTypes = {regulation: RegulationOval};

const edgeTypes = {floating: FloatingEdge};

export default function PhaseThree() {
    const phaseThreeState = useSelector((state) => state.phaseThreeNew);
    const edgeState = useSelector((state) => state.phaseThreeNew?.edgeState ?? initialEdges3);
    const nodeState = useSelector((state) => state.phaseThreeNew?.nodeState ?? initialNodes3);
    const [nodes, setNodes, onNodesChange] = useNodesState(nodeState);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgeState);
    const [showHelp, setShowHelp] = useState(false);
    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(setCurrentPhase(3))
    }, []);

    useEffect(() => {
        if (!Array.isArray(edges)) {
            return;
        }
        else {
            dispatch(setNextPhaseEnabled(true));
        }
        dispatch(connectEdge3(edges));
    }, [edges]);

    useEffect(() => {
        setNodes(nodeState)
    }, [nodeState]);

    useEffect(() => {   
        setEdges(edgeState);
    }, [phaseThreeState.uploaded])

    const defaultEdgeOptions = {
        style: {strokeWidth: 2, stroke: 'white'},
        type: 'floating',
    };

    const connectToBase = useCallback((event, element) => {
        const clickedNode = nodes.find(node => node.id === element.id);
        if (!clickedNode.data.isConnectable) {
            return;
        }
        dispatch(updateNodes3(element.id))
    }, [dispatch, nodes]);

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
                        <p style={{margin: "0 24px 8px 0", fontWeight: 700, color: "#facc15"}}>Phase 3 - Regulatory Framework</p>
                        <p style={{margin: "0 0 8px 0", fontSize: 14}}>
                            <strong>What will I do in this phase?</strong><br/> In this phase you choose which regulatory frameworks to include in the final analysis.
                        </p>
                        <p style={{margin: "0 0 8px 0", fontSize: 14}}>
                            <strong>What are regulatory frameworks?</strong> <br/>Each node represents a regulation (e.g. GDPR, EU AI Act, MDR). Move your mouse over a node to see its description.
                        </p>
                        <p style={{margin: 0, fontSize: 14}}>
                            <strong>How to select the relevant regulations?</strong> <br/>All regulations are selected by default. You can deselect a regulation by clicking on it: a red cross will appear on top of it, signalling that it will not be considered in the final analysis.
                        </p>
                    </div>
                )}
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                panOnScroll={true}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineComponent={ConnectionLine}
                deleteKeyCode={''}
                onNodeClick={connectToBase}
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