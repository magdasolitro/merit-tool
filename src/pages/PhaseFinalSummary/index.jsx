import {useEffect, useMemo} from "react";
import ReactFlow, {Background, Controls, MiniMap} from "reactflow";
import {useDispatch, useSelector} from "react-redux";
import {setCurrentPhase, setNextPhaseEnabled} from "../../redux/slices/phaseStatusSlice.js";

import "reactflow/dist/style.css";
import OvalNode from "../../components/Shapes/OvalNode.jsx";
import DottedEdge from "../../components/DottedEdge/index.jsx";
import StraightEdge from "../../components/StraightEdge/index.jsx";
import CircleNode from "../../components/Shapes/CircleNode.jsx";
import DiamondNode from "../../components/Shapes/DiamondNode.jsx";
import HexagonNode2 from "../../components/Shapes/HexagonNode2.jsx";
import RectangleNode from "../../components/Shapes/RectangleNode.jsx";
import {initialNodes as phaseOneInitialNodes} from "../PhaseOne/phaseOne_nodes.js";
import {
    buildReactFlowGraphFromVisibleTree,
    computeVisibleResultTree,
    filterEliminatedGoalsFromVisibleTree,
} from "../PhaseResult/resultVisibleTree.js";

const nodeTypes = {
    root: CircleNode,
    goal: OvalNode,
    subgoal: OvalNode,
    "domain-constraint": HexagonNode2,
    "quality-constraint": DiamondNode,
    "context-factor": RectangleNode,
};
const edgeTypes = {dotted: DottedEdge, straight: StraightEdge};

export default function PhaseFinalSummary() {
    const dispatch = useDispatch();
    const phaseOneNodeState = useSelector((state) => state.phaseOne?.nodeState ?? []);
    const phaseOneSelectedNodeIds = useSelector((state) => state.phaseOne?.selectedNodeIds ?? []);
    const phaseThreeSelectedNodeIds = useSelector((state) => state.phaseThreeNew?.selectedNodeIds ?? []);
    const eliminatedGoalIds = useSelector((state) => state.resultGoalElimination?.eliminatedGoalIds ?? []);

    const hiddenPhaseOneLeafIds = useMemo(() => {
        const currentNodesById = new Map(phaseOneNodeState.map((node) => [node.id, node]));
        return new Set(
            phaseOneInitialNodes
                .filter((node) => node.data?.isConnectable)
                .map((node) => node.id)
                .filter((id) => {
                    const currentNode = currentNodesById.get(id);
                    return !currentNode || currentNode.data?.isHidden;
                })
        );
    }, [phaseOneNodeState]);

    const visibleTree = useMemo(
        () =>
            computeVisibleResultTree({
                hiddenPhaseOneLeafIds,
                phaseOneSelectedNodeIds,
                phaseThreeSelectedNodeIds,
            }),
        [hiddenPhaseOneLeafIds, phaseOneSelectedNodeIds, phaseThreeSelectedNodeIds]
    );

    const filteredTree = useMemo(
        () => filterEliminatedGoalsFromVisibleTree(visibleTree, eliminatedGoalIds),
        [visibleTree, eliminatedGoalIds]
    );

    const graph = useMemo(
        () => buildReactFlowGraphFromVisibleTree(filteredTree, phaseOneSelectedNodeIds, []),
        [filteredTree, phaseOneSelectedNodeIds]
    );

    useEffect(() => {
        dispatch(setCurrentPhase(5));
        dispatch(setNextPhaseEnabled(false));
    }, [dispatch]);

    return (
        <div style={{width: "100vw", height: "93vh"}}>
            <ReactFlow
                nodes={graph.nodes}
                edges={graph.edges}
                panOnScroll={true}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
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
