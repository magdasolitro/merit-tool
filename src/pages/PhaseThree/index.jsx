import {useCallback, useEffect} from "react";
import ReactFlow, {addEdge, Background, Controls, MiniMap, useEdgesState, useNodesState,} from "reactflow";

import "reactflow/dist/style.css";
import RegulationOval from "../../components/Shapes/RegulationOval.jsx";
import FloatingEdge from "../../components/FloatingEdge";
import ConnectionLine from "../../components/ConnectionLine";
import {useDispatch, useSelector} from "react-redux";
import {connectEdge3, setPhaseThreeState, updateNodes3} from "../../redux/slices/phaseThreeSlice_new.js";
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
        dispatch(setPhaseThreeState({
            nodeState: initialNodes3,
            edgeState: initialEdges3,
            resultName: "",
            selectedNodes: [],
            uploaded: 0,
        }))
    }, []);

    useEffect(() => {
        setNodes(nodeState)
    }, [nodeState]);

    useEffect(() => {
        setEdges(edgeState);
    }, [phaseThreeState.uploaded])

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
                    .filter((edge) => edge?.id?.endsWith("-edge") && edge.target === "phase-three-result")
                    .map((edge) => edge.source)
            );

            const missingChosenEdges = [...chosenConnectableIds]
                .filter((sourceId) => !existingConnectionSources.has(sourceId))
                .map((sourceId) => ({
                    id: `${sourceId}-edge`,
                    target: "phase-three-result",
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
                    target: "phase-three-result",
                    source: element.id,
                    animated: true,
                    ...defaultEdgeOptions
                };
                return addEdge(updatedEdge, updatedEdges);
            });

        }
        dispatch(updateNodes3(element.id))
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