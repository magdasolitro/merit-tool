import {useCallback, useEffect, useState} from "react";
import ReactFlow, {addEdge, Background, Controls, MiniMap, useEdgesState, useNodesState} from "reactflow";
import "reactflow/dist/style.css";
import CircleNode from "../../components/Shapes/CircleNode.jsx";
import OperatorNode from "../../components/Shapes/OperatorNode.jsx";
import HexagonNode from "../../components/Shapes/HexagonNode.jsx";
import FloatingEdge from "../../components/FloatingEdge";
import StraightEdge from "../../components/StraightEdge";
import ConnectionLine from "../../components/ConnectionLine";
import {useDispatch, useSelector} from "react-redux";
import {connectEdge, setNodeState} from "../../redux/slices/phaseOneSlice.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import DottedEdge from "../../components/DottedEdge";
import {initialNodes} from "./phaseOne_nodes.js";

const nodeTypes = {circle: CircleNode, operator: OperatorNode, hexagon: HexagonNode};
const edgeTypes = {floating: FloatingEdge, straight: StraightEdge, dotted: DottedEdge};
const ROOT_NODE_ID = "context-factors";
const RESULT_NODE_ID = "phase-one-result";

export default function PhaseOne() {
    const phaseOneState = useSelector((state) => state.phaseOne);
    const {edgeState, nodeState} = phaseOneState;
    const [nodes, setNodes, onNodesChange] = useNodesState(nodeState);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgeState);
    const [showHelp, setShowHelp] = useState(false);
    const dispatch = useDispatch();

    const defaultEdgeOptions = {
        style: {strokeWidth: 2, stroke: "white"},
        type: "floating",
    };

    // Entering phase one should not reset phase one itself.
    // We only set active phase and clear later phases if needed.
    useEffect(() => {
        dispatch(setCurrentPhase(1));
    }, [dispatch]);

    // Sync local ReactFlow state with persisted Redux state.
    useEffect(() => {
        setNodes(nodeState);
    }, [nodeState, setNodes]);

    useEffect(() => {
        setEdges(edgeState);
    }, [edgeState, phaseOneState.uploaded, setEdges]);

    useEffect(() => {
        dispatch(setNodeState(nodes));
    }, [dispatch, nodes]);

    // Keep selected IDs in Redux derived from current edges.
    useEffect(() => {
        dispatch(setNextPhaseEnabled(true));
        dispatch(connectEdge(edges));
    }, [dispatch, edges]);

    const toggleLeafSelection = useCallback(
        (node) => {
            if (!node.data?.isConnectable) {
                return;
            }

            const edgeId = `${node.id}-edge`;
            const alreadyConnected = edges.some((edge) => edge.id === edgeId);

            if (alreadyConnected) {
                setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId));
                setNodes((currentNodes) =>
                    currentNodes.map((n) =>
                        n.id === node.id ? {...n, data: {...n.data, isChosen: false}} : n
                    )
                );
            } else {
                setEdges((currentEdges) =>
                    addEdge(
                        {
                            id: edgeId,
                            source: node.id,
                            target: RESULT_NODE_ID,
                            animated: true,
                            ...defaultEdgeOptions,
                        },
                        currentEdges
                    )
                );
                setNodes((currentNodes) =>
                    currentNodes.map((n) =>
                        n.id === node.id ? {...n, data: {...n.data, isChosen: true}} : n
                    )
                );
            }
        },
        [defaultEdgeOptions, edges, setEdges, setNodes]
    );

    const onNodeClick = useCallback(
        (_event, element) => {
            const clickedNode = nodes.find((node) => node.id === element.id);
            if (!clickedNode || clickedNode.id === RESULT_NODE_ID) {
                return;
            }

            toggleLeafSelection(clickedNode);
        },
        [nodes, toggleLeafSelection]
    );

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
                        <p style={{margin: "0 24px 8px 0", fontWeight: 700, color: "#facc15"}}>Phase 1 - Context Characterization</p>
                        <p style={{margin: "0 0 8px 0", fontSize: 14}}>
                        <strong>What will I do in this phase?</strong><br/> In this phase you define the context in which your system operates.
                        </p>
                        <p style={{margin: "0 0 8px 0", fontSize: 14}}>
                            <strong>What are context factors?</strong> <br/>Context factors are conditions, constraints or variables that influence the regulatory obligations that your system must comply with. By selecting them, you will filter out the relevant regulations to analyse in the last phase.
                        </p>
                        <p style={{margin: 0, fontSize: 14}}>
                            <strong>How to select the relevant context factors? </strong> <br/> Black nodes represent <strong>macro-categories</strong> that group together similar context factors, while white nodes represent the actual <strong>context factors</strong>. <br/>If you are not interested in considering an entire macro-category of context factors, you can collapse it by clicking on it. With the remaining context factors, click on those that are relevant to your system: you will see an edge connecting them to the result node, indicating that only those factors will be taken into account in the next phase.
                        </p>
                    </div>
                )}
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                panOnScroll
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineComponent={ConnectionLine}
                deleteKeyCode={""}
                onNodeClick={onNodeClick}
                fitView
                maxZoom={1.5}
                minZoom={0.18}
            >
                <Controls />
                <MiniMap pannable zoomable />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}
