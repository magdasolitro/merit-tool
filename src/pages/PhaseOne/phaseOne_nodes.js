import {initialEdges as phaseOneTreeEdges} from "./phaseOne_edges.js";

const ROOT_ID = "context-factors";
const RESULT_ID = "phase-one-result";
const LAYOUT_CENTER_X = 5800;
const BLACK_LAYER_Y = 200;
const ROOT_Y = -200;
const BLACK_NODE_SIZE = 100;
const LEAF_NODE_SIZE = 100;
const MAX_LEAVES_PER_ROW = 3;
const LEAF_STEP_X = 132;
const LEAF_ROW_GAP_Y = 140;
const GAP_BELOW_BLACK_ROW = 100;
const CLUSTER_PAD = 24;

const cloneNode = (node) => ({
    ...node,
    position: node?.position ? {...node.position} : {x: 0, y: 0},
    data: node?.data ? {...node.data} : node?.data,
});

const isBlackCategoryNode = (node) => node?.data?.background === "black";
const isLeafNode = (node) => node?.data?.isConnectable === true;

const getNodeSize = (node) => {
    if (node.type === "hexagon") {
        return {width: 250, height: 200};
    }
    const s = Number(node?.data?.size || 100);
    return {width: s, height: s};
};

const rectTopLeft = (x, y, size) => ({
    left: x,
    top: y,
    right: x + size.width,
    bottom: y + size.height,
});

const rectsOverlap = (a, b) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const leafClusterHalfWidth = (leafCount) => {
    if (leafCount <= 0) {
        return 0;
    }
    const cols = Math.min(MAX_LEAVES_PER_ROW, leafCount);
    return ((cols - 1) * LEAF_STEP_X + LEAF_NODE_SIZE) / 2;
};

const layoutPhaseOneNodesFromEdges = (rawNodes, edges) => {
    const nodes = rawNodes.map(cloneNode);
    const edgeList = edges.filter((e) => e && typeof e.source === "string" && typeof e.target === "string");
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const leafIds = new Set(nodes.filter(isLeafNode).map((n) => n.id));

    const leavesByParent = new Map();
    edgeList.forEach((edge) => {
        if (!leafIds.has(edge.target)) {
            return;
        }
        if (!leavesByParent.has(edge.source)) {
            leavesByParent.set(edge.source, []);
        }
        const list = leavesByParent.get(edge.source);
        if (!list.includes(edge.target)) {
            list.push(edge.target);
        }
    });

    const blacks = nodes.filter(isBlackCategoryNode).sort((a, b) => a.position.x - b.position.x);
    let stepBlack = BLACK_NODE_SIZE + 8;
    for (let i = 0; i < blacks.length - 1; i++) {
        const n1 = leavesByParent.get(blacks[i].id)?.length ?? 0;
        const n2 = leavesByParent.get(blacks[i + 1].id)?.length ?? 0;
        const need = leafClusterHalfWidth(n1) + leafClusterHalfWidth(n2) + CLUSTER_PAD;
        stepBlack = Math.max(stepBlack, need);
    }

    const blackRowWidth = (blacks.length - 1) * stepBlack + BLACK_NODE_SIZE;
    const blackStartX = LAYOUT_CENTER_X - blackRowWidth / 2;
    blacks.forEach((node, index) => {
        node.position = {x: blackStartX + index * stepBlack, y: BLACK_LAYER_Y};
    });

    const rootNode = nodeById.get(ROOT_ID);
    if (rootNode) {
        const rootSize = getNodeSize(rootNode);
        rootNode.position = {x: LAYOUT_CENTER_X - rootSize.width / 2, y: ROOT_Y};
    }

    const leafTopY = BLACK_LAYER_Y + BLACK_NODE_SIZE + GAP_BELOW_BLACK_ROW;
    const leafNodes = [];

    blacks.forEach((parent) => {
        const leafTargetIds = leavesByParent.get(parent.id) ?? [];
        const leaves = leafTargetIds.map((id) => nodeById.get(id)).filter(Boolean);
        const parentCenterX = parent.position.x + BLACK_NODE_SIZE / 2;
        const n = leaves.length;

        leaves.forEach((leaf, index) => {
            const row = Math.floor(index / MAX_LEAVES_PER_ROW);
            const col = index % MAX_LEAVES_PER_ROW;
            const rowStart = row * MAX_LEAVES_PER_ROW;
            const rowCount = Math.min(MAX_LEAVES_PER_ROW, n - rowStart);
            const mid = (rowCount - 1) / 2;
            const centerX = parentCenterX + (col - mid) * LEAF_STEP_X;
            const x = centerX - LEAF_NODE_SIZE / 2;
            const y = leafTopY + row * LEAF_ROW_GAP_Y;
            leaf.position = {x, y};
            leafNodes.push(leaf);
        });
    });

    const occupiedLeafRects = [];
    leafNodes
        .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
        .forEach((leaf) => {
            const size = getNodeSize(leaf);
            let {x, y} = leaf.position;
            for (let attempt = 0; attempt < 600; attempt++) {
                const rect = rectTopLeft(x, y, size);
                if (!occupiedLeafRects.some((r) => rectsOverlap(r, rect))) {
                    occupiedLeafRects.push(rect);
                    leaf.position = {x, y};
                    return;
                }
                y += 12;
            }
            const rect = rectTopLeft(x, y, size);
            occupiedLeafRects.push(rect);
            leaf.position = {x, y};
        });

    const resultNode = nodeById.get(RESULT_ID);
    if (resultNode) {
        const resultSize = getNodeSize(resultNode);
        let maxBottom = rootNode ? rootNode.position.y + getNodeSize(rootNode).height : BLACK_LAYER_Y;
        nodes.forEach((n) => {
            const s = getNodeSize(n);
            maxBottom = Math.max(maxBottom, n.position.y + s.height);
        });
        resultNode.position = {
            x: LAYOUT_CENTER_X - resultSize.width / 2,
            y: maxBottom + 160,
        };
    }

    return nodes;
};

const rawInitialNodes = [
        {
            id: "context-factors",
            type: "context-factor",
            data: {label: "Context Factors", top: "no"},
            draggable: false
        },

        // 2nd layer
        {
            id: "cf-9-1",
            type: "context-factor",
            position: {x: 3900, y: 500},
            data: {label: "CF 9.1 - is_post_market_phase", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-9-3"],
            unlocks: ["subgoal-9-3"]
        },
        {
            id: "cf-9-2",
            type: "context-factor",
            position: {x: 4100, y: 500},
            data: {label: "CF 9.2 - foreseeable_misuse_scenarios", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-9-2"],
            unlocks: ["subgoal-9-2", "dc-9-4"]
        },
        {
            id: "cf-9-3",
            type: "context-factor",
            position: {x: 4300, y: 500},
            data: {label: "CF 9.3 - vulnerable_groups_exposure", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-9-6", "dc-9-12"],
            unlocks: ["subgoal-9-6", "dc-9-12"]
        },
        {
            id: "cf-9-4",
            type: "context-factor",
            position: {x: 4500, y: 500},
            data: {label: "CF 9.4 - existing_union_risk_management", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-9-11"],
            unlocks: ["subgoal-9-11"]
        },       

        {
            id: "cf-10-1",
            type: "context-factor",
            position: {x: 4700, y: 500},
            data: {label: "CF 10.1 - uses_model_training", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-10-1", "subgoal-10-3", "subgoal-10-4", "subgoal-10-5", "subgoal-10-9"],
            // unlocks: ["..."]
        },
        {
            id: "cf-10-2",
            type: "context-factor",
            position: {x: 4900, y: 500},
            data: {label: "CF 10.2 - special_category_data_used", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-10-6", "dc-10-5", "dc-10-6", "dc-10-7", "dc-10-8", "qc-10-3", "qc-10-4", "qc-10-5"]
            // unlocks: ["?"]
        },
        {
            id: "cf-10-3",
            type: "context-factor",
            position: {x: 5100, y: 500},
            data: {label: "CF 10.3 - deployment_context_specific", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-10-5", "dc-10-13"],
            unlocks: ["subgoal-10-5", "dc-10-13"]
        },
        {
            id: "cf-13-1",
            type: "context-factor",
            position: {x: 5300, y: 500},
            data: {label: "CF 13.1 - explainability_capability", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-13-7"],
            unlocks: ["dc-13-7"]
        },
        {
            id: "cf-13-2",
            type: "context-factor",
            position: {x: 5500, y: 500},
            data: {label: "CF 13.2 - predetermined_changes", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-13-11"],
            unlocks: ["dc-13-11"]
        },
        {
            id: "cf-13-3",
            type: "context-factor",
            position: {x: 5725, y: 500},
            data: {label: "CF 13.3 - specific_population_performance", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-13-8"],
            unlocks: ["dc-13-8"]
        },

        {
            id: "cf-14-1",
            type: "context-factor",
            position: {x: 5900, y: 500},
            data: {label: "CF 14.1 - output_is_reccomendation", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-14-4", "qc-14-3"],
            unlocks: ["subgoal-14-4", "qc-14-3"]
        },
        {
            id: "cf-14-2",
            type: "context-factor",
            position: {x: 6100, y: 500},
            data: {label: "CF 14.2 - annex_III_point_1a", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-14-8", "dc-14-8", "qc-14-4"],
            // unlocks: ["..."]
        },
        {
            id: "cf-14-3",
            type: "context-factor",
            position: {x: 6300, y: 500},
            data: {label: "CF 14.3 - law_enforcement_migration_border_asylum_use", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-14-9"],
            unlocks: ["dc-14-9"]
        },
        {
            id: "cf-14-4",
            type: "context-factor",
            position: {x: 6500, y: 500},
            data: {label: "CF 14.4 - stop_mechanism_feasibility", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-14-7", "dc-14-7"],
            unlocks: ["dc-14-7"]
        },
        {
            id: "cf-15-1",
            type: "context-factor",
            position: {x: 6700, y: 500},
            data: {label: "CF 15.1 - continuous_learning", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["subgoal-15-3", "dc-15-4", "dc-15-5", "qc-15-5"],
            // unlocks: [...]
        },
        {
            id: "cf-15-2",
            type: "context-factor",
            position: {x: 6900, y: 500},
            data: {label: "CF 15.2 - threat_data_poisoning", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-15-6"],
            unlocks: ["dc-15-6"]
        },
        {
            id: "cf-15-3",
            type: "context-factor",
            position: {x: 7100, y: 500},
            data: {label: "CF 15.3 - threat_model_poisoning", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-15-6"],
            unlocks: ["dc-15-6"]
        },
        {   
            id: "cf-15-4",
            type: "context-factor",
            position: {x: 7300, y: 500},
            data: {label: "CF 15.4 - threat_adversarial", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-15-6"],
            unlocks: ["dc-15-6"]
        },
        {
            id: "cf-15-5",
            type: "context-factor",
            position: {x: 7500, y: 500},
            data: {label: "CF 15.5 - threat_confidentiality", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-15-6"],
            unlocks: ["dc-15-6"]
        },
        {
            id: "cf-15-6",
            type: "context-factor",
            position: {x: 7700, y: 500},
            data: {label: "CF 15.6 - threat_model_flaws", background: "white", isConnectable: true, isChosen: false},
            draggable: false,
            blocks: ["dc-15-6"],
            unlocks: ["dc-15-6"]
        },


        // final layer
        {
            id: "phase-one-result",
            type: "hexagon",
            position: {x: 5800, y: 1200},
            draggable: true,
        },
    ];

export const initialNodes = layoutPhaseOneNodesFromEdges(rawInitialNodes, phaseOneTreeEdges);
export default initialNodes;
