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
import {connectEdge} from "../../redux/slices/phaseOneSlice.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import DottedEdge from "../../components/DottedEdge";
import {initialNodes} from "./phaseOne_nodes.js";
import {initialEdges} from "./phaseOne_edges.js";

const nodeTypes = {circle: CircleNode, operator: OperatorNode, hexagon: HexagonNode};
const edgeTypes = {floating: FloatingEdge, straight: StraightEdge, dotted: DottedEdge};
const ROOT_NODE_ID = "context-factors";
const RESULT_NODE_ID = "phase-one-result";

const isResultEdge = (edge) => edge.target === RESULT_NODE_ID;

export default function PhaseOne() {
    const phaseOneState = useSelector((state) => state.phaseOne);
    const {edgeState, nodeState} = phaseOneState;
    const [nodes, setNodes, onNodesChange] = useNodesState(nodeState);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgeState);
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

    // useEffect(() => {
    //     dispatch(setPhaseOneState({
    //         nodeState: initialNodes,
    //         edgeState: initialEdges,
    //         resultName: "",
    //         selectedNodes: [],
    //         selectedNodeIds: [],
    //         uploaded: 0,
    //     }))
    // }, []);

    // Keep selected IDs in Redux derived from current edges.
    useEffect(() => {
        dispatch(setNextPhaseEnabled(true));
        dispatch(connectEdge(edges));
    }, [dispatch, edges]);

    const isSecondLayerNode = useCallback(
        (nodeId) => initialEdges.some((edge) => edge.source === ROOT_NODE_ID && edge.target === nodeId),
        []
    );

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
            const currentId = stack.pop();
            if (descendants.has(currentId) || currentId === RESULT_NODE_ID) {
                continue;
            }
            descendants.add(currentId);
            (adjacency.get(currentId) || []).forEach((childId) => {
                if (!descendants.has(childId)) {
                    stack.push(childId);
                }
            });
        }
        return descendants;
    }, []);

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
                    // Remove all structure edges touching removed descendants.
                    if (!isResultEdge(edge)) {
                        return !descendants.has(edge.source) && !descendants.has(edge.target);
                    }
                    // Remove result connections only for leaves inside removed subtree.
                    return !descendants.has(edge.source);
                })
            );
        },
        [edges, getDescendants, setEdges, setNodes]
    );

    const restoreSubtree = useCallback(
        (parentId) => {
            const descendantsFromInitial = getDescendants(parentId, initialEdges);
            const subtreeIds = new Set([parentId, ...descendantsFromInitial]);

            setNodes((currentNodes) => {
                const presentIds = new Set(currentNodes.map((node) => node.id));

                const toggledNodes = currentNodes.map((node) =>
                    node.id === parentId ? {...node, data: {...node.data, isHidden: false}} : node
                );

                const restoredDescendants = initialNodes
                    .filter((node) => descendantsFromInitial.has(node.id) && !presentIds.has(node.id))
                    .map((node) => ({...node, data: {...node.data, isHidden: false}}));

                const mergedNodes = [...toggledNodes, ...restoredDescendants];
                const orderById = new Map(initialNodes.map((node, index) => [node.id, index]));
                return mergedNodes.sort(
                    (a, b) =>
                        (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
                        (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER)
                );
            });

            setEdges((currentEdges) => {
                const currentEdgeIds = new Set(currentEdges.map((edge) => edge.id));
                const structureEdgesToRestore = initialEdges.filter(
                    (edge) =>
                        !isResultEdge(edge) &&
                        subtreeIds.has(edge.source) &&
                        subtreeIds.has(edge.target)
                );
                const missingEdges = structureEdgesToRestore.filter((edge) => !currentEdgeIds.has(edge.id));
                // IMPORTANT: we intentionally do not restore leaf->result edges.
                return [...currentEdges, ...missingEdges];
            });
        },
        [getDescendants, setEdges, setNodes]
    );

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

            if (isSecondLayerNode(clickedNode.id)) {
                if (clickedNode.data?.isHidden) {
                    restoreSubtree(clickedNode.id);
                } else {
                    hideSubtree(clickedNode.id);
                }
                return;
            }

            toggleLeafSelection(clickedNode);
        },
        [hideSubtree, isSecondLayerNode, nodes, restoreSubtree, toggleLeafSelection]
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
