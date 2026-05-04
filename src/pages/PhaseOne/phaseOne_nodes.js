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
            type: "circle",
            position: {x: 5800, y: -200},
            data: {label: "Context Factors", top: "no"},
            draggable: false
        },

        // 2nd layer
        {
            id: "user-role",
            type: "circle",
            position: {x: 0, y: 200},
            data: {label: "User", background: "black"},
            draggable: false
        },
        {
            id: "technical-characteristics",
            type: "circle",
            position: {x: 800, y: 200},
            data: {label: "System Design & Technical Characteristics", background: "black"},
            draggable: false
        },
        {
            id: "data-governance",
            type: "circle",
            position: {x: 1640, y: 200},
            data: {label: "Data & Information Governance", background: "black"},
            draggable: false
        },
        {
            id: "human-factors",
            type: "circle",
            position: {x: 2160, y: 200},
            data: {label: "Human Factors & Afftected Population", background: "black"},
            draggable: false
        },
        {
            id: "market-phase",
            type: "circle",
            position: {x: 2680, y: 200},
            data: {label: "Lifecycle & Market Phase", background: "black"},
            draggable: false
        },
        {
            id: "legal-interactions",
            type: "circle",
            position: {x: 3200, y: 200},
            data: {label: "Regulatory & Legal Interactions", background: "black"},
            draggable: false
        },
        {
            id: "provider-context",
            type: "circle",
            position: {x: 3720, y: 200},
            data: {label: "Provider Context", background: "black"},
            draggable: false
        },
        {
            id: "financial-sector",
            type: "circle",
            position: {x: 4240, y: 200},
            data: {label: "Financial Sector", background: "black"},
            draggable: false
        },
        {
            id: "risk-assessment",
            type: "circle",
            position: {x: 4760, y: 200},
            data: {label: "Risk, Misuse & Safety Context", background: "black"},
            draggable: false
        },
        {
            id: "conformity-assessment",
            type: "circle",
            position: {x: 5280, y: 200},
            data: {label: "Conformity Assessment & Notification", background: "black"},
            draggable: false
        },
        {
            id: "supply-chain",
            type: "circle",
            position: {x: 5800, y: 200},
            data: {label: "Supply Chain & Economic Operators", background: "black"},
            draggable: false
        },
        {
            id: "operational-control",
            type: "circle",
            position: {x: 6320, y: 200},
            data: {label: "Operational Control & Logging", background: "black"},
            draggable: false
        },
        {
            id: "authorities-oversight",
            type: "circle",
            position: {x: 6840, y: 200},
            data: {label: "Authorities, Oversight & Enforcement", background: "black"},
            draggable: false
        },
        {
            id: "post-market-monitoring",
            type: "circle",
            position: {x: 7360, y: 200},
            data: {label: "Post-Market Monitoring & Corrective Actions", background: "black"},
            draggable: false
        },
        {
            id: "role-changes-system-modification",
            type: "circle",
            position: {x: 7880, y: 200},
            data: {label: "Role Changes & System Modification", background: "black"},
            draggable: false
        },
        {
            id: "third-party-ecosystem-dependencies",
            type: "circle",
            position: {x: 8400, y: 200},
            data: {label: "Third-Party & Ecosystem Dependencies", background: "black"},
            draggable: false
        },
        {
            id: "deployer-context-responsibilities",
            type: "circle",
            position: {x: 8920, y: 200},
            data: {label: "Deployer Context & Responsibilities", background: "black"},
            draggable: false
        },
        {
            id: "use-case-application-context",
            type: "circle",
            position: {x: 9440, y: 200},
            data: {label: "Use C2200ase & Application Context", background: "black"},
            draggable: false
        },
        {
            id: "transparency-user-interaction",
            type: "circle",
            position: {x: 9960, y: 200},
            data: {label: "Transparency & User Interaction", background: "black"},
            draggable: false
        },
        {
            id: "law-enforcement-special-regimes",
            type: "circle",
            position: {x: 10480, y: 200},
            data: {label: "Law Enforcement & Special Regimes", background: "black"},
            draggable: false
        },
        {
            id: "assessment-reuse-existing-evaluations",
            type: "circle",
            position: {x: 11000, y: 200},
            data: {label: "Assessment & Reuse of Existing Evaluations", background: "black"},
            draggable: false
        },
    

        // 3rd layer
        {
            id: "provider",
            type: "circle",
            position: {x: -200, y: 500},
            data: {label: "Provider", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "deployer",
            type: "circle",
            position: {x: -100, y: 500},
            data: {label: "Deployer", isConnectable: true, isChosen: false},
            draggable: false
        },

        {
            id: "cf-8-1",
            type: "circle",
            position: {x: 450, y: 520},
            data: {label: "CF 8.1 - intended_purpose", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-8-3",
            type: "circle",
            position: {x: 600, y: 520},
            data: {label: "CF 8.3 - state_of_the_art", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-10-1",
            type: "circle",
            position: {x: 750, y: 520},
            data: {label: "CF 10.1 - training_technique", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-13-1",
            type: "circle",
            position: {x: 900, y: 520},
            data: {label: "CF 13.1 - explainability_capability", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-13-3",
            type: "circle",
            position: {x: 450, y: 690},
            data: {label: "CF 13.3 - predetermined_changes", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-14-1",
            type: "circle",
            position: {x: 600, y: 690},
            data: {label: "CF 14.1 - level_of_autonomy", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-14-3",
            type: "circle",
            position: {x: 750, y: 690},
            data: {label: "CF 14.3 - output_type", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-14-5",
            type: "circle",
            position: {x: 900, y: 690},
            data: {label: "CF 14.5 - stop_mechanism_feasibility", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-15-1",
            type: "circle",
            position: {x: 500, y: 860},
            data: {label: "CF 15.1 - continuous_learning", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-15-2",
            type: "circle",
            position: {x: 650, y: 860},
            data: {label: "CF 15.2 - accuracy_metrics_defined", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-15-4",
            type: "circle",
            position: {x: 800, y: 860},
            data: {label: "CF 15.4 - interaction_type", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-10-2",
            type: "circle",
            position: {x: 1310, y: 520},
            data: {label: "CF 10.2 - data_origin", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-10-3",
            type: "circle",
            position: {x: 1530, y: 520},
            data: {label: "CF 10.3 - special_category_data_used", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-19-2",
            type: "circle",
            position: {x: 1310, y: 690},
            data: {label: "CF 19.2 - applicable_data_protection_law", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-10",
            type: "circle",
            position: {x: 1530, y: 690},
            data: {label: "CF 26.10 - applicable_data_protection_law", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-9-3",
            type: "circle",
            position: {x: 1830, y: 520},
            data: {label: "CF 9.3 - vulnerable_groups_exposure", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-9-5",
            type: "circle",
            position: {x: 2050, y: 520},
            data: {label: "CF 9.5 - deployer_profile", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-10-5",
            type: "circle",
            position: {x: 2270, y: 520},
            data: {label: "CF 10.5 - target_population", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-13-2",
            type: "circle",
            position: {x: 2490, y: 520},
            data: {label: "CF 13.2 - target_deployer_profile", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-13-4",
            type: "circle",
            position: {x: 1830, y: 690},
            data: {label: "CF 13.4 - specific_population_performance", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-14-2",
            type: "circle",
            position: {x: 2050, y: 690},
            data: {label: "CF 14.2 - oversight_persons_profile", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-27-6",
            type: "circle",
            position: {x: 2270, y: 690},
            data: {label: "CF 27.6 - affected_vulnerable_groups", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-9-1",
            type: "circle",
            position: {x: 2350, y: 520},
            data: {label: "CF 9.1 - lifecycle_stage", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-11-2",
            type: "circle",
            position: {x: 2570, y: 520},
            data: {label: "CF 11.2 - market_placement_stage", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-12-2",
            type: "circle",
            position: {x: 2790, y: 520},
            data: {label: "CF 12.2 - system_lifetime_stage", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-16-2",
            type: "circle",
            position: {x: 3010, y: 520},
            data: {label: "CF 16.2 - market_placement_type", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-17-5",
            type: "circle",
            position: {x: 2350, y: 690},
            data: {label: "CF 17.5 - post_market_phase", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-18-3",
            type: "circle",
            position: {x: 2570, y: 690},
            data: {label: "CF 18.3 - market_placement_date", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-8-2",
            type: "circle",
            position: {x: 2870, y: 520},
            data: {label: "CF 8.2 - applicable_harmonisation_legislation", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-9-4",
            type: "circle",
            position: {x: 3090, y: 520},
            data: {label: "CF 9.4 - existing_union_risk_management", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-11-3",
            type: "circle",
            position: {x: 3310, y: 520},
            data: {label: "CF 11.3 - harmonisation_legislation_applicable", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-16-3",
            type: "circle",
            position: {x: 3530, y: 520},
            data: {label: "CF 16.3 - accessibility_requirements_applicable", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-17-2",
            type: "circle",
            position: {x: 2870, y: 690},
            data: {label: "CF 17.2 - sectoral_union_law_qms", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-17-4",
            type: "circle",
            position: {x: 3090, y: 690},
            data: {label: "CF 17.4 - harmonised_standards_applicable", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-11-1",
            type: "circle",
            position: {x: 3390, y: 520},
            data: {label: "CF 11.1 - provider_size", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-17-1",
            type: "circle",
            position: {x: 3610, y: 520},
            data: {label: "CF 17.1 - provider_organisation_size", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-18-4",
            type: "circle",
            position: {x: 3830, y: 520},
            data: {label: "CF 18.4 - provider_continuity_risk", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-22-1",
            type: "circle",
            position: {x: 4050, y: 520},
            data: {label: "CF 22.1 - provider_location", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-17-3",
            type: "circle",
            position: {x: 3910, y: 520},
            data: {label: "CF 17.3 - financial_institution", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-18-2",
            type: "circle",
            position: {x: 4130, y: 520},
            data: {label: "CF 18.2 - financial_institution", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-19-3",
            type: "circle",
            position: {x: 4350, y: 520},
            data: {label: "CF 19.3 - financial_institution", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-5",
            type: "circle",
            position: {x: 4570, y: 520},
            data: {label: "CF 26.5 - financial_institution", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-9-2",
            type: "circle",
            position: {x: 4430, y: 520},
            data: {label: "CF 9.2 - foreseeable_misuse_scenarios", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-15-3",
            type: "circle",
            position: {x: 4650, y: 520},
            data: {label: "CF 15.3 - cybersecurity_threat_profile", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-20-2",
            type: "circle",
            position: {x: 4870, y: 520},
            data: {label: "CF 20.2 - risk_identified", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-23-3",
            type: "circle",
            position: {x: 5090, y: 520},
            data: {label: "CF 23.3 - risk_identified", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-24-2",
            type: "circle",
            position: {x: 4430, y: 690},
            data: {label: "CF 24.2 - risk_identified", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-9",
            type: "circle",
            position: {x: 4650, y: 690},
            data: {label: "CF 26.9 - serious_incident_identified", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-16-4",
            type: "circle",
            position: {x: 4950, y: 520},
            data: {label: "CF 16.4 - conformity_assessment_type", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-18-1",
            type: "circle",
            position: {x: 5170, y: 520},
            data: {label: "CF 18.1 - notified_body_involved", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-20-1",
            type: "circle",
            position: {x: 5390, y: 520},
            data: {label: "CF 20.1 - notified_body_certificate", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-22-2",
            type: "circle",
            position: {x: 5610, y: 520},
            data: {label: "CF 22.2 - notified_body_certificate", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-23-2",
            type: "circle",
            position: {x: 4950, y: 690},
            data: {label: "CF 23.2 - notified_body_certificate", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-20-4",
            type: "circle",
            position: {x: 5470, y: 520},
            data: {label: "CF 20.4 - distribution_chain", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-23-1",
            type: "circle",
            position: {x: 5690, y: 520},
            data: {label: "CF 23.1 - importer_role", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-24-1",
            type: "circle",
            position: {x: 5910, y: 520},
            data: {label: "CF 24.1 - distributor_role", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-24-5",
            type: "circle",
            position: {x: 6130, y: 520},
            data: {label: "CF 24.5 - importer_in_chain", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-16-1",
            type: "circle",
            position: {x: 5990, y: 520},
            data: {label: "CF 16.1 - provider_control_of_logs", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-19-1",
            type: "circle",
            position: {x: 6210, y: 520},
            data: {label: "CF 19.1 - provider_control_of_logs", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-21-1",
            type: "circle",
            position: {x: 6430, y: 520},
            data: {label: "CF 21.1 - provider_control_of_logs", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-22-3",
            type: "circle",
            position: {x: 6650, y: 520},
            data: {label: "CF 22.3 - provider_control_of_logs", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-2",
            type: "circle",
            position: {x: 5990, y: 690},
            data: {label: "CF 26.2 - deployer_controls_logs", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-1",
            type: "circle",
            position: {x: 6210, y: 690},
            data: {label: "CF 26.1 - deployer_controls_input_data", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-21-2",
            type: "circle",
            position: {x: 6730, y: 520},
            data: {label: "CF 21.2 - competent_authority_language", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-21-3",
            type: "circle",
            position: {x: 6950, y: 520},
            data: {label: "CF 21.3 - reasoned_request_received", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-20-3",
            type: "circle",
            position: {x: 7250, y: 520},
            data: {label: "CF 20.3 - reporting_deployer_exists", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-20-5",
            type: "circle",
            position: {x: 7470, y: 520},
            data: {label: "CF 20.5 - corrective_action_type", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-25-1",
            type: "circle",
            position: {x: 7550, y: 520},
            data: {label: "CF 25.1 - role_change_trigger", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-25-2",
            type: "circle",
            position: {x: 7770, y: 520},
            data: {label: "CF 25.2 - substantial_modification_made", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-25-3",
            type: "circle",
            position: {x: 7990, y: 520},
            data: {label: "CF 25.3 - intended_purpose_modified", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-25-4",
            type: "circle",
            position: {x: 8210, y: 520},
            data: {label: "CF 25.4 - initial_provider_restriction", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-25-5",
            type: "circle",
            position: {x: 8180, y: 520},
            data: {label: "CF 25.5 - product_manufacturer_role", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-25-6",
            type: "circle",
            position: {x: 8400, y: 520},
            data: {label: "CF 25.6 - third_party_supplier", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-25-7",
            type: "circle",
            position: {x: 8620, y: 520},
            data: {label: "CF 25.7 - open_source_licence", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-3",
            type: "circle",
            position: {x: 8590, y: 520},
            data: {label: "CF 26.3 - deployer_is_employer", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-4",
            type: "circle",
            position: {x: 8810, y: 520},
            data: {label: "CF 26.4 - deployer_is_public_authority", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-8",
            type: "circle",
            position: {x: 9030, y: 520},
            data: {label: "CF 26.8 - law_enforcement_deployer", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-27-1",
            type: "circle",
            position: {x: 9250, y: 520},
            data: {label: "CF 27.1 - deployer_type", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-10-4",
            type: "circle",
            position: {x: 9220, y: 520},
            data: {label: "CF 10.4 - deployment_context", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-6",
            type: "circle",
            position: {x: 9440, y: 520},
            data: {label: "CF 26.6 - post_remote_biometric_identification", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-26-7",
            type: "circle",
            position: {x: 9660, y: 520},
            data: {label: "CF 26.7 - annex_III_decisions_on_persons", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-1",
            type: "circle",
            position: {x: 9630, y: 520},
            data: {label: "CF 50.1 - direct_human_interaction", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-2",
            type: "circle",
            position: {x: 9850, y: 520},
            data: {label: "CF 50.2 - synthetic_content_generation", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-3",
            type: "circle",
            position: {x: 10070, y: 520},
            data: {label: "CF 50.3 - emotion_recognition_or_biometric_categorisation", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-4",
            type: "circle",
            position: {x: 10290, y: 520},
            data: {label: "CF 50.4 - deep_fake_generation", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-5",
            type: "circle",
            position: {x: 9630, y: 690},
            data: {label: "CF 50.5 - public_information_text", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-7",
            type: "circle",
            position: {x: 9850, y: 690},
            data: {label: "CF 50.7 - artistic_creative_context", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-8",
            type: "circle",
            position: {x: 10070, y: 690},
            data: {label: "CF 50.8 - editorial_control_applied", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-9",
            type: "circle",
            position: {x: 10290, y: 690},
            data: {label: "CF 50.9 - standard_editing_assistive", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-50-6",
            type: "circle",
            position: {x: 10480, y: 520},
            data: {label: "CF 50.6 - law_enforcement_authorisation", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-27-2",
            type: "circle",
            position: {x: 10670, y: 520},
            data: {label: "CF 27.2 - annex_III_point_2", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-27-3",
            type: "circle",
            position: {x: 10890, y: 520},
            data: {label: "CF 27.3 - previous_assessment_available", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-27-4",
            type: "circle",
            position: {x: 11110, y: 520},
            data: {label: "CF 27.4 - art46_exemption", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },
        {
            id: "cf-27-5",
            type: "circle",
            position: {x: 11330, y: 520},
            data: {label: "CF 27.5 - dpia_already_conducted", background: "white", isConnectable: true, isChosen: false},
            draggable: false
        },

        // final layer
        {
            id: "phase-one-result",
            type: "hexagon",
            position: {x: 5800, y: 1500},
            draggable: true,
        },
    ];

export const initialNodes = layoutPhaseOneNodesFromEdges(rawInitialNodes, phaseOneTreeEdges);
export default initialNodes;
