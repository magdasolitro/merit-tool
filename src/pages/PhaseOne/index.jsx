import {useCallback, useEffect} from "react";
import ReactFlow, {addEdge, Background, Controls, MiniMap, useEdgesState, useNodesState} from "reactflow";
import "reactflow/dist/style.css";
import CircleNode from "../../components/Shapes/CircleNode.jsx";
import OperatorNode from "../../components/Shapes/OperatorNode.jsx";
import HexagonNode from "../../components/Shapes/HexagonNode.jsx";
import FloatingEdge from "../../components/FloatingEdge";
import StraightEdge from "../../components/StraightEdge";
import ConnectionLine from "../../components/ConnectionLine";
import {useDispatch, useSelector} from "react-redux";
import {connectEdge, setPhaseOneState} from "../../redux/slices/phaseOneSlice.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import {resetPhaseTwo} from "../../redux/slices/phaseTwoSlice.js";
import {resetPhaseThree} from "../../redux/slices/phaseThreeSlice.js";
import DottedEdge from "../../components/DottedEdge";
import {initialNodes} from "./phaseOne_nodes.js";
import {initialEdges} from "./phaseOne_edges.js";

const nodeTypes = {circle: CircleNode, operator: OperatorNode, hexagon: HexagonNode}
const edgeTypes = {floating: FloatingEdge, straight: StraightEdge, dotted: DottedEdge};
const ROOT_NODE_ID = "context-factors";
const RESULT_NODE_ID = "phase-one-result";

const isResultEdge = (edge) => edge.target === RESULT_NODE_ID;

export default function PhaseOne() {
    const phaseOneState = useSelector((state) => state.phaseOne);
    const phaseTwoState = useSelector((state) => state.phaseTwo.nodeState);
    const {initialPhase3aTacticNodes, initialPhase3cTacticNodes} = useSelector((state) => state.phaseThree);
    const dispatch = useDispatch();
    const {edgeState, nodeState} = phaseOneState;
    const [nodes, setNodes, onNodesChange] = useNodesState(nodeState);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgeState);
    const {currentPhase} = useSelector((state) => state.phaseStatus);

    const defaultEdgeOptions = {
        style: {strokeWidth: 2, stroke: "white"},
        type: "floating",
    };

    useEffect(() => {
        dispatch(setCurrentPhase(1));
        if (phaseTwoState.length > 0) {
            dispatch(resetPhaseTwo());
        }
        if (initialPhase3aTacticNodes.length > 0 || initialPhase3cTacticNodes.length > 0) {
            dispatch(resetPhaseThree());
        }
    }, [currentPhase, dispatch, phaseTwoState.length, initialPhase3aTacticNodes.length, initialPhase3cTacticNodes.length]);

    useEffect(() => {
        dispatch(
            setPhaseOneState({
                edgeState: initialEdges,
                nodeState: initialNodes,
                resultName: "",
                selectedNodes: [],
                selectedNodeIds: [],
                uploaded: 0,
            })
        );
    }, [dispatch]);

    useEffect(() => {
        setNodes(nodeState);
    }, [nodeState, setNodes]);

    useEffect(() => {
        setEdges(edgeState);
    }, [phaseOneState.uploaded, edgeState, setEdges]);

    useEffect(() => {
        dispatch(setNextPhaseEnabled(true));
        dispatch(connectEdge(edges));
    }, [edges, dispatch]);

    const getDescendants = useCallback((rootId, sourceEdges) => {
        const adjacency = new Map();
        sourceEdges.forEach((edge) => {
            if (!adjacency.has(edge.source)) {
                adjacency.set(edge.source, []);
            }
            adjacency.get(edge.source).push(edge.target);
        });

        const descendants = new Set();
        const stack = [...(adjacency.get(rootId) || [])];
        while (stack.length > 0) {
            const nodeId = stack.pop();
            if (descendants.has(nodeId) || nodeId === RESULT_NODE_ID) {
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

    const isSecondLayerNode = useCallback(
        (nodeId) => initialEdges.some((edge) => edge.source === ROOT_NODE_ID && edge.target === nodeId),
        []
    );

    const hideSubtree = useCallback(
        (parentId) => {
            const descendants = getDescendants(parentId, edges);

            setNodes((currentNodes) =>
                currentNodes
                    .map((node) =>
                        node.id === parentId ? {...node, data: {...node.data, isHidden: true}} : node
                    )
                    .filter((node) => node.id === RESULT_NODE_ID || !descendants.has(node.id))
            );

            setEdges((currentEdges) =>
                currentEdges.filter((edge) => {
                    if (isResultEdge(edge)) {
                        return !descendants.has(edge.source);
                    }
                    return !descendants.has(edge.source) && !descendants.has(edge.target);
                })
            );
        },
        [edges, getDescendants, setEdges, setNodes]
    );

    const restoreSubtree = useCallback(
        (parentId) => {
            const descendants = getDescendants(parentId, initialEdges);
            const subtreeNodeIds = new Set([parentId, ...descendants]);

            setNodes((currentNodes) => {
                const currentById = new Map(currentNodes.map((node) => [node.id, node]));

                const toggled = currentNodes.map((node) =>
                    node.id === parentId ? {...node, data: {...node.data, isHidden: false}} : node
                );

                const missingDescendants = initialNodes
                    .filter((node) => descendants.has(node.id) && !currentById.has(node.id))
                    .map((node) => ({...node, data: {...node.data, isHidden: false}}));

                const merged = [...toggled, ...missingDescendants];
                const orderById = new Map(initialNodes.map((node, idx) => [node.id, idx]));

                return merged.sort(
                    (a, b) => (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER)
                );
            });

            setEdges((currentEdges) => {
                const currentEdgeIds = new Set(currentEdges.map((edge) => edge.id));
                const subtreeStructureEdges = initialEdges.filter(
                    (edge) =>
                        !isResultEdge(edge) &&
                        subtreeNodeIds.has(edge.source) &&
                        subtreeNodeIds.has(edge.target)
                );
                const missing = subtreeStructureEdges.filter((edge) => !currentEdgeIds.has(edge.id));
                return [...currentEdges, ...missing];
            });
        },
        [getDescendants, setEdges, setNodes]
    );

    const toggleLeafConnection = useCallback(
        (node) => {
            if (!node?.data?.isConnectable) {
                return;
            }

            const isConnected = edges.some((edge) => edge.id === `${node.id}-edge`);
            if (isConnected) {
                setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== `${node.id}-edge`));
                setNodes((currentNodes) =>
                    currentNodes.map((n) =>
                        n.id === node.id ? {...n, data: {...n.data, isChosen: false}} : n
                    )
                );
                return;
            }

            setEdges((currentEdges) =>
                addEdge(
                    {
                        id: `${node.id}-edge`,
                        source: node.id,
                        target: RESULT_NODE_ID,
                        animated: true,
                        ...defaultEdgeOptions,
                    },
                    currentEdges
                )
            );
            setNodes((currentNodes) =>
                currentNodes.map((n) => (n.id === node.id ? {...n, data: {...n.data, isChosen: true}} : n))
            );
        },
        [defaultEdgeOptions, edges, setEdges, setNodes]
    );

    const onNodeClick = useCallback(
        (_event, element) => {
            const clickedNode = nodes.find((node) => node.id === element.id);
            if (!clickedNode) {
                return;
            }

            if (clickedNode.id === RESULT_NODE_ID) {
                return;
            }

            if (isSecondLayerNode(clickedNode.id)) {
                if (clickedNode.data?.isHidden) {
                    restoreSubtree(clickedNode.id);
                } else {
                    hideSubtree(clickedNode.id);
                }
                return;
            }

            toggleLeafConnection(clickedNode);
        },
        [hideSubtree, isSecondLayerNode, nodes, restoreSubtree, toggleLeafConnection]
    );

    return (
        <div style={{width: "100vw", height: "93vh"}}>
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

