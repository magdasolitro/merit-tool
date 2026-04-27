import {useCallback, useEffect} from "react";
import ReactFlow, {addEdge, Background, Controls, MiniMap, useEdgesState, useNodesState,} from "reactflow";

import "reactflow/dist/style.css";
import CircleNode from "../../components/Shapes/CircleNode.jsx";
import OperatorNode from "../../components/Shapes/OperatorNode.jsx";
import HexagonNode from "../../components/Shapes/HexagonNode.jsx";
import FloatingEdge from "../../components/FloatingEdge";
import StraightEdge from "../../components/StraightEdge";
import ConnectionLine from "../../components/ConnectionLine";
import {useDispatch, useSelector} from "react-redux";
import {connectEdge2, setPhaseTwoState, updateNodes2} from "../../redux/slices/phaseTwoSlice.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import {resetPhaseTwo} from "../../redux/slices/phaseTwoSlice.js";
import {resetPhaseThree} from "../../redux/slices/phaseThreeSlice.js";
import DottedEdge from "../../components/DottedEdge";
import {initialNodes2} from "./phaseTwo_nodes.js";
import {initialEdges2} from "./phaseTwo_edges.js";

const nodeTypes = {circle: CircleNode, operator: OperatorNode, hexagon: HexagonNode};

const edgeTypes = {floating: FloatingEdge, straight: StraightEdge, dotted: DottedEdge};

export default function PhaseTwo() {
    const phaseTwoState = useSelector((state) => state.phaseTwo);
    const {initialPhase3aTacticNodes, initialPhase3cTacticNodes} = useSelector((state) => state.phaseThree);
    const edgeState = useSelector((state) => state.phaseTwo.edgeState);
    const nodeState = useSelector((state) => state.phaseTwo.nodeState);
    const [nodes, setNodes, onNodesChange] = useNodesState(nodeState);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgeState);
    const dispatch = useDispatch()
    const {nextPhaseEnabled, currentPhase} = useSelector((state) => state.phaseStatus);

    useEffect(() => {
        dispatch(setCurrentPhase(2));
    }, []);

    useEffect(() => {
        if (initialPhase3aTacticNodes.length > 0 || initialPhase3cTacticNodes.length > 0) {
            dispatch(resetPhaseThree())
        }
    }, [currentPhase]);

    useEffect(() => {
        if (["ethics", "fairness", "transparency", "robustness", "privacy", "security", "accountability", "data-quality"].some(nodeId => edges.some(edge => edge.source === nodeId && edge.target === "phase-two-result"))) {
            !nextPhaseEnabled && dispatch(setNextPhaseEnabled(true));
        }
        else {
            dispatch(setNextPhaseEnabled(false));
        }
        dispatch(connectEdge2(edges));
    }, [edges]);

    useEffect(() => {
        dispatch(setPhaseTwoState({
            edgeState: initialEdges2,
            nodeState: initialNodes2,
            resultName: "",
            selectedNodes: [],
            uploaded: 0
        }))
    }, []);

    useEffect(() => {
        setNodes(nodeState)
    }, [nodeState]);

    useEffect(() => {
        setEdges(edgeState);
    }, [phaseTwoState.uploaded])

    useEffect(() => {
        setEdges((currentEdges) => {
            if (!Array.isArray(currentEdges) || !Array.isArray(nodes)) {
                return currentEdges;
            }

            const chosenConnectableIds = new Set(
                nodes
                    .filter((node) => node?.data?.isConnectable && node?.data?.isChosen)
                    .map((node) => node.id)
            );

            const preservedEdges = currentEdges.filter((edge) => {
                if (!edge?.id?.endsWith("-edge")) {
                    return true;
                }
                return chosenConnectableIds.has(edge.source);
            });

            const existingConnectionSources = new Set(
                preservedEdges
                    .filter((edge) => edge?.id?.endsWith("-edge") && edge.target === "phase-two-result")
                    .map((edge) => edge.source)
            );

            const missingChosenEdges = [...chosenConnectableIds]
                .filter((sourceId) => !existingConnectionSources.has(sourceId))
                .map((sourceId) => ({
                    id: `${sourceId}-edge`,
                    target: "phase-two-result",
                    source: sourceId,
                    animated: true,
                    ...defaultEdgeOptions,
                }));

            if (missingChosenEdges.length === 0 && preservedEdges.length === currentEdges.length) {
                return currentEdges;
            }

            return [...preservedEdges, ...missingChosenEdges];
        });
    }, [nodes, setEdges]);


    const defaultEdgeOptions = {
        style: {strokeWidth: 2, stroke: 'white'},
        type: 'floating',
    };

    const connectToBase = useCallback((event, element) => {
        const clickedNode = nodes.find(node => node.id === element.id);
        if (!clickedNode.data.isConnectable) {
            return;
        }
        if (clickedNode.data.isChosen) {
            setEdges((edges) => edges.filter(edge => edge.id !== element.id + "-edge"));
        } else {
            setEdges((edges) => {
                let updatedEdges = edges;
                const updatedEdge = {
                    id: element.id + "-edge",
                    target: "phase-two-result",
                    source: element.id,
                    animated: true,
                    ...defaultEdgeOptions
                };
                return addEdge(updatedEdge, updatedEdges);
            });

        }
        dispatch(updateNodes2(element.id))
    }, [setEdges, nodes, setNodes, edges]);

    return (
        <div style={{width: "100vw", height: "93vh"}}>
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