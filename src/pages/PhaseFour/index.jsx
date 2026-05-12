import React, {useEffect} from "react";
import ReactFlow, {Background, useEdgesState, useNodesState,} from "reactflow";
import "reactflow/dist/style.css";
import OperatorNode from "../../components/Shapes/OperatorNode.jsx";
import {useDispatch, useSelector} from "react-redux";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";
import OvalNode from "../../components/Shapes/OvalNode.jsx";
import DottedEdge from "../../components/DottedEdge";
import {phase3Style} from "../PhaseThree/style.jsx";
import Heading from "arwes/lib/Heading/index.js";
import {setPhaseFourNodes, showSelectedNodes} from "../../redux/slices/phaseFourSlice.js";


const nodeTypes = {oval: OvalNode, operator: OperatorNode};
const edgeTypes = {dotted: DottedEdge};
export default function PhaseFour() {
    const {nodeState, edgeState} = useSelector((state) => state.phaseTwo);
    const {phaseFourNodes} = useSelector((state) => state.phaseFour);
    const {selectedTacticNodes} = useSelector((state) => state.phaseThree);
    const [nodes, setNodes] = useNodesState([]);
    const [edges] = useEdgesState(edgeState);
    const dispatch = useDispatch();


    useEffect(() => {
        let shownNodes = nodeState.filter((node) => !node.data.isHidden);
        dispatch(setPhaseFourNodes(shownNodes));
        dispatch(showSelectedNodes(selectedTacticNodes));
        dispatch(setCurrentPhase(4));
        dispatch(setNextPhaseEnabled(true));
    }, []);

    useEffect(() => {
        setNodes(phaseFourNodes);
    }, [phaseFourNodes]);

    return (
        <div style={{width: "100vw", height: "93vh"}}>
            <Heading node="h2" style={phase3Style.title} className={"!text-black dark:!text-cyan-400"}>
                (Acceptance, Tactical and Gamification) specification summary:
            </Heading>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                panOnScroll={true}
                nodeTypes={nodeTypes}
                zoomOnDoubleClick={false}
                edgeTypes={edgeTypes}
                deleteKeyCode={''}
                fitView
                maxZoom={2}
                minZoom={0.1}
            >
                <Background variant="dots" gap={12} size={1}/>
            </ReactFlow>
        </div>
    );
}
