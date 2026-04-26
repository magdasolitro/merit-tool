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
import {connectEdge3, setPhaseThreeState, updateNodes3} from "../../redux/slices/phaseThreeSlice_new.js";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import DottedEdge from "../../components/DottedEdge";
import {initialNodes3} from "./phaseThree_nodes.js";
import {initialEdges3} from "./phaseThree_edges.js";

const nodeTypes = {circle: CircleNode, operator: OperatorNode, hexagon: HexagonNode};

const edgeTypes = {floating: FloatingEdge, straight: StraightEdge, dotted: DottedEdge};

export default function PhaseThree() {
    const phaseThreeState = useSelector((state) => state.phaseThreeNew);
    const edgeState = useSelector((state) => state.phaseThreeNew?.edgeState ?? initialEdges3);
    const nodeState = useSelector((state) => state.phaseThreeNew?.nodeState ?? initialNodes3);
    const [nodes, setNodes, onNodesChange] = useNodesState(nodeState);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgeState);
    const dispatch = useDispatch()
    const {nextPhaseEnabled, currentPhase} = useSelector((state) => state.phaseStatus);

    useEffect(() => {
        dispatch(setCurrentPhase(3))
    }, []);

    useEffect(() => {
        if (!Array.isArray(edges)) {
            return;
        }
        if (["ai-act", "ehds", "mdr"].some(nodeId => edges.some(edge => edge.source === nodeId && edge.target === "phase-three-result"))) {
            !nextPhaseEnabled && dispatch(setNextPhaseEnabled(true));
        }
        else {
            dispatch(setNextPhaseEnabled(false));
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