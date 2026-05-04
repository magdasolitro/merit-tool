import {useCallback, useEffect} from "react";
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