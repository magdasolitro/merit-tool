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
import {connectEdge, setPhaseOneState, updateNodes} from "../../redux/slices/phaseOneSlice.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import {resetPhaseTwo} from "../../redux/slices/phaseTwoSlice.js";
import {resetPhaseThree} from "../../redux/slices/phaseThreeSlice.js";
import DottedEdge from "../../components/DottedEdge";
import {initialNodes} from "./phaseOne_nodes.js";
import {initialEdges} from "./phaseOne_edges.js";

const nodeTypes = {circle: CircleNode, operator: OperatorNode, hexagon: HexagonNode};
const edgeTypes = {floating: FloatingEdge, straight: StraightEdge, dotted: DottedEdge};

export default function PhaseOne() {
    const phaseOneState = useSelector((state) => state.phaseOne);
    const phaseTwoState = useSelector((state) => state.phaseTwo.nodeState);
    const {initialPhase3aTacticNodes, initialPhase3cTacticNodes} = useSelector((state) => state.phaseThree);
    const {edgeState, nodeState} = phaseOneState;
    const [nodes, setNodes, onNodesChange] = useNodesState(nodeState);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgeState);
    const dispatch = useDispatch()
    const {nextPhaseEnabled, currentPhase} = useSelector((state) => state.phaseStatus);

    useEffect(() => {
        dispatch(setCurrentPhase(1))
        if (phaseTwoState.length > 0) {
            dispatch(resetPhaseTwo())
        }
        if (initialPhase3aTacticNodes.length > 0 || initialPhase3cTacticNodes.length > 0) {
            dispatch(resetPhaseThree())
        }
    }, [currentPhase]);

    useEffect(() => {
        dispatch(setNextPhaseEnabled(true));
        dispatch(connectEdge(edges));
    }, [edges]);

    useEffect(() => {
        dispatch(setPhaseOneState({
            edgeState: initialEdges,
            nodeState: initialNodes,
            resultName: "",
            selectedNodes: [],
            selectedNodeIds: [],
            uploaded: 0
        }))
    }, []);

    useEffect(() => {
        setNodes(nodeState)
    }, [nodeState]);

    useEffect(() => {
        setEdges(edgeState);
    }, [phaseOneState.uploaded])

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
                    .filter((edge) => edge?.id?.endsWith("-edge") && edge.target === "phase-one-result")
                    .map((edge) => edge.source)
            );

            const missingChosenEdges = [...chosenConnectableIds]
                .filter((sourceId) => !existingConnectionSources.has(sourceId))
                .map((sourceId) => ({
                    id: `${sourceId}-edge`,
                    target: "phase-one-result",
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

    const getDescendants = useCallback((rootId, currentEdges) => {
        const adjacency = new Map();
        currentEdges.forEach((edge) => {
            if (!adjacency.has(edge.source)) {
                adjacency.set(edge.source, []);
            }
            adjacency.get(edge.source).push(edge.target);
        });

        const descendants = new Set();
        const stack = [...(adjacency.get(rootId) || [])];
        while (stack.length > 0) {
            const nodeId = stack.pop();
            if (descendants.has(nodeId)) {
                continue;
            }
            descendants.add(nodeId);
            const children = adjacency.get(nodeId) || [];
            children.forEach((childId) => {
                if (!descendants.has(childId)) {
                    stack.push(childId);
                }
            });
        }
        return descendants;
    }, []);

    const connectToBase = useCallback((event, element) => {
        const isSecondLayerNode = initialEdges.some((edge) => edge.source === "context-factors" && edge.target === element.id);
        if (isSecondLayerNode) {
            const clickedNode = nodes.find((node) => node.id === element.id);
            if (!clickedNode) {
                return;
            }

            if (clickedNode.data?.isHidden) {
                const descendantsFromInitial = getDescendants(element.id, initialEdges);
                const subtreeNodeIds = new Set([element.id, ...descendantsFromInitial]);

                setNodes((currentNodes) => {
                    const currentById = new Map(currentNodes.map((node) => [node.id, node]));
                    const updatedNodes = currentNodes.map((node) =>
                        node.id === element.id
                            ? {...node, data: {...node.data, isHidden: false}}
                            : node
                    );

                    const missingSubtreeNodes = initialNodes
                        .filter((node) => descendantsFromInitial.has(node.id) && !currentById.has(node.id))
                        .map((node) => ({...node, data: {...node.data, isHidden: false}}));

                    const merged = [...updatedNodes, ...missingSubtreeNodes];
                    const orderById = new Map(initialNodes.map((node, index) => [node.id, index]));
                    return merged.sort(
                        (a, b) => (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER)
                    );
                });

                setEdges((currentEdges) => {
                    const currentEdgeIds = new Set(currentEdges.map((edge) => edge.id));
                    const restoreEdges = initialEdges.filter(
                        (edge) => subtreeNodeIds.has(edge.source) && subtreeNodeIds.has(edge.target)
                    );
                    const missingEdges = restoreEdges.filter((edge) => !currentEdgeIds.has(edge.id));
                    return [...currentEdges, ...missingEdges];
                });
            } else {
                const descendants = getDescendants(element.id, edges);

                setNodes((currentNodes) =>
                    currentNodes
                        .map((node) =>
                            node.id === element.id
                                ? {...node, data: {...node.data, isHidden: true}}
                                : node
                        )
                        .filter((node) => !descendants.has(node.id))
                );

                setEdges((currentEdges) =>
                    currentEdges.filter(
                        (edge) => !descendants.has(edge.source) && !descendants.has(edge.target)
                    )
                );
            }
            return;
        }

        const xorEdge = edges.find(edge => edge.target === element.id && edge.source.includes('xor'));
        const xorNode = xorEdge ? xorEdge.source : null;
        const clickedNode = nodes.find(node => node.id === element.id);
        if (!clickedNode.data.isConnectable) {
            return;
        }
        if (clickedNode.data.isChosen) {
            setEdges((edges) => edges.filter(edge => edge.id !== element.id + "-edge"));
        } else {
            setEdges((edges) => {
                let updatedEdges = edges;
                if (xorNode) {
                    const xorTargets = edges.filter(edge => edge.source === xorNode).map(edge => edge.target);
                    updatedEdges = edges.filter(edge => !(xorTargets.includes(edge.source) && edge.source !== element.id));
                }
                const updatedEdge = {
                    id: element.id + "-edge",
                    target: "phase-one-result",
                    source: element.id,
                    animated: true,
                    ...defaultEdgeOptions
                };
                return addEdge(updatedEdge, updatedEdges);
            });

        }
        dispatch(updateNodes(element.id))
    }, [setEdges, nodes, setNodes, edges, getDescendants]);

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
