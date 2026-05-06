import {
    normalizeTreePositions as normalizeAIActTreePositions,
    raw_AIActNodes,
} from "../pages/PhaseResult/AIAct_nodes.js";

const GAP_X = 20;
const GAP_Y = 350;
const ARTICLE_GAP_Y = 500;

const DEFAULT_SIZE_BY_TYPE = {
    goal: {width: 240, height: 80},
    subgoal: {width: 240, height: 80},
    "domain-constraint": {width: 300, height: 96},
    "quality-constraint": {width: 120, height: 120},
    "context-factor": {width: 180, height: 90},
};

const node = (id, type, label, parentId = null, aiActLink = null) => ({
    id,
    type,
    ...(parentId ? {parentId} : {}),
    data: {isHidden: false, label},
    draggable: false,
    children: null,
    ...(aiActLink ? {aiActLink} : {}),
});

const getChildren = (n) => (Array.isArray(n?.children) ? n.children : []);
const deepClone = (v) => JSON.parse(JSON.stringify(v));

const estimateNodeSize = (n) => {
    const base = DEFAULT_SIZE_BY_TYPE[n?.type] ?? {width: 200, height: 80};
    const label = String(n?.data?.label ?? "");
    const extraW = Math.min(220, Math.max(0, Math.floor((label.length - 36) * 3.2)));
    return {width: base.width + extraW, height: base.height};
};

const normalizeParentIdsFromStructure = (goalRoot) => {
    const walk = (node, parentId = null) => {
        if (parentId) {
            node.parentId = parentId;
        } else {
            delete node.parentId;
        }
        getChildren(node).forEach((child) => walk(child, node.id));
    };
    walk(goalRoot, null);
};

const localLayoutGoalTree = (goalRoot) => {
    const goal = goalRoot;
    const subgoals = [];
    const leaves = [];

    const walk = (node) => {
        getChildren(node).forEach((child) => {
            if (child.type === "subgoal") {
                subgoals.push(child);
            } else {
                leaves.push(child);
            }
            walk(child);
        });
    };
    walk(goal);

    const {width: goalW, height: goalH} = estimateNodeSize(goal);
    goal.position = {x: 0, y: 0};

    let subgoalPackWidth = 0;
    for (let i = 0; i < subgoals.length; i += 1) {
        subgoalPackWidth += estimateNodeSize(subgoals[i]).width;
        if (i < subgoals.length - 1) {
            subgoalPackWidth += GAP_X;
        }
    }

    const subgoalY = goalH + GAP_Y;
    let subgoalStartX = (goalW - subgoalPackWidth) / 2;
    for (const sg of subgoals) {
        const {width: w} = estimateNodeSize(sg);
        sg.position = {x: subgoalStartX, y: subgoalY};
        subgoalStartX += w + GAP_X;
    }

    const leafY = subgoalY + (subgoals.length > 0 ? estimateNodeSize(subgoals[0]).height : goalH) + GAP_Y;
    let leafPackWidth = 0;
    for (let i = 0; i < leaves.length; i += 1) {
        leafPackWidth += estimateNodeSize(leaves[i]).width;
        if (i < leaves.length - 1) {
            leafPackWidth += GAP_X;
        }
    }
    let leafStartX = (goalW - leafPackWidth) / 2;
    for (const leaf of leaves) {
        const {width: w} = estimateNodeSize(leaf);
        leaf.position = {x: leafStartX, y: leafY};
        leafStartX += w + GAP_X;
    }

    const stack = [goal];
    while (stack.length > 0) {
        const current = stack.pop();
        const children = getChildren(current);
        children.forEach((ch) => stack.push(ch));
        if (!current.position) {
            const parentY = Number(current?.parentId ? 0 : goal.position.y);
            current.position = {x: 0, y: parentY + GAP_Y};
        }
    }
};

const collectSubtreeNodes = (root) => {
    const result = [];
    const stack = [root];
    while (stack.length > 0) {
        const n = stack.pop();
        result.push(n);
        getChildren(n).forEach((ch) => stack.push(ch));
    }
    return result;
};

const subtreeBounds = (root) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of collectSubtreeNodes(root)) {
        const {width, height} = estimateNodeSize(n);
        const x = Number(n?.position?.x ?? 0);
        const y = Number(n?.position?.y ?? 0);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + width);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + height);
    }
    return {minX, maxX, minY, maxY};
};

const shiftSubtree = (root, dx, dy) => {
    for (const n of collectSubtreeNodes(root)) {
        n.position = {
            x: Number(n?.position?.x ?? 0) + dx,
            y: Number(n?.position?.y ?? 0) + dy,
        };
    }
};

const buildAiActIndexes = () => {
    const aiTree = normalizeAIActTreePositions(raw_AIActNodes);
    const byId = new Map();
    const goalAncestorById = new Map();
    const nodesByGoal = new Map();

    const walk = (node, goalAncestorId = null) => {
        const nextGoal = node.type === "goal" ? node.id : goalAncestorId;
        byId.set(node.id, node);
        goalAncestorById.set(node.id, nextGoal);
        if (nextGoal) {
            if (!nodesByGoal.has(nextGoal)) {
                nodesByGoal.set(nextGoal, []);
            }
            nodesByGoal.get(nextGoal).push(node);
        }
        getChildren(node).forEach((child) => walk(child, nextGoal));
    };

    aiTree.forEach((root) => walk(root, null));
    return {byId, goalAncestorById, nodesByGoal};
};

const findFirstAiActLinkInSubtree = (goalRoot) => {
    const stack = [goalRoot];
    while (stack.length > 0) {
        const n = stack.pop();
        if (n.aiActLink) {
            return n.aiActLink;
        }
        getChildren(n).forEach((ch) => stack.push(ch));
    }
    return null;
};

export function normalizeTreePositions(forest) {
    const roots = deepClone(forest);
    if (!roots.length) {
        return roots;
    }

    const {goalAncestorById, nodesByGoal} = buildAiActIndexes();

    let fallbackX = 0;
    let fallbackY = 0;

    for (const goalRoot of roots) {
        normalizeParentIdsFromStructure(goalRoot);
        localLayoutGoalTree(goalRoot);

        const linkTargetId = findFirstAiActLinkInSubtree(goalRoot);
        if (!linkTargetId || !goalAncestorById.has(linkTargetId)) {
            const bounds = subtreeBounds(goalRoot);
            shiftSubtree(goalRoot, fallbackX - bounds.minX, fallbackY - bounds.minY);
            fallbackX += (bounds.maxX - bounds.minX) + GAP_X;
            continue;
        }

        const aiGoalId = goalAncestorById.get(linkTargetId);
        const aiNodesInGoal = nodesByGoal.get(aiGoalId) ?? [];
        let aiSubtreeBottomY = -Infinity;
        const aiTargetNode = aiNodesInGoal.find((n) => n.id === linkTargetId);
        const aiTargetX = Number(aiTargetNode?.position?.x ?? 0);

        aiNodesInGoal.forEach((n) => {
            const {height} = estimateNodeSize(n);
            aiSubtreeBottomY = Math.max(aiSubtreeBottomY, Number(n?.position?.y ?? 0) + height);
        });

        const bounds = subtreeBounds(goalRoot);
        const goalCenterX = Number(goalRoot?.position?.x ?? 0) + estimateNodeSize(goalRoot).width / 2;
        const dx = aiTargetX - goalCenterX;
        const dy = (Number.isFinite(aiSubtreeBottomY) ? aiSubtreeBottomY : 0) + ARTICLE_GAP_Y - bounds.minY;
        shiftSubtree(goalRoot, dx, dy);
    }

    return roots;
}

export const raw_GDPRNodes = [
    {
        id: "gdpr-goal-9",
        type: "goal",
        data: {
            isHidden: false,
            label: "GOAL 9-GDPR — Ensure lawful processing of special categories of personal data with valid legal basis and safeguards",
        },
        draggable: false,
        children: [
            node("gdpr-subgoal-9-1", "subgoal", "SUBGOAL 9-GDPR.1 — Identify and apply a valid legal basis under Art. 9(2)", "goal-9"),
            node("gdpr-subgoal-9-2", "subgoal", "SUBGOAL 9-GDPR.2 — Ensure health/medical processing is under professional secrecy", "goal-9"),
            node("gdpr-subgoal-9-3", "subgoal", "SUBGOAL 9-GDPR.3 — Ensure scientific research processing complies with Art. 89(1)", "goal-9"),
            node("gdpr-subgoal-9-4", "subgoal", "SUBGOAL 9-GDPR.4 — Verify Member State additional conditions for genetic/biometric/health data", "goal-9"),
            node("gdpr-dc-9-1", "domain-constraint", "DC 9-GDPR.1 — Processing of special category data is prohibited by default", "goal-9", "dc-10-1"),
            node("gdpr-dc-9-2", "domain-constraint", "DC 9-GDPR.2 — Explicit consent is valid unless national/Union law excludes it", "subgoal-9-1"),
            node("gdpr-dc-9-3", "domain-constraint", "DC 9-GDPR.3 — Employment/social security basis requires legal authorization and safeguards", "subgoal-9-1"),
            node("gdpr-dc-9-4", "domain-constraint", "DC 9-GDPR.4 — Vital interests basis applies only if subject cannot consent", "subgoal-9-1", "cf-10-2"),
            node("gdpr-dc-9-5", "domain-constraint", "DC 9-GDPR.5 — Substantial public interest basis must be proportionate and safeguarded", "subgoal-9-1"),
            node("gdpr-dc-9-6", "domain-constraint", "DC 9-GDPR.6 — Medical/health care basis needs law or health professional contract", "subgoal-9-1", "cf-9-2"),
            node("gdpr-dc-9-7", "domain-constraint", "DC 9-GDPR.7 — Public health basis requires legal basis and suitable safeguards", "subgoal-9-1", "cf-8-2"),
            node("gdpr-dc-9-8", "domain-constraint", "DC 9-GDPR.8 — Research/statistical basis must comply with Art. 89(1)", "subgoal-9-3"),
            node("gdpr-dc-9-9", "domain-constraint", "DC 9-GDPR.9 — Art. 9(2)(h) processing must be by/under secrecy-bound professionals", "subgoal-9-2", "qc-10-4"),
            node("gdpr-dc-9-10", "domain-constraint", "DC 9-GDPR.10 — Member States may add conditions for genetic/biometric/health data", "subgoal-9-4"),
            node("gdpr-qc-9-1", "quality-constraint", "QC 9-GDPR.1 — Substantial public interest legal basis must be proportionate", "subgoal-9-1"),
            node("gdpr-qc-9-2", "quality-constraint", "QC 9-GDPR.2 — Safeguards must be suitable and specific to rights at stake", "goal-9"),
            node("gdpr-qc-9-3", "quality-constraint", "QC 9-GDPR.3 — Professional secrecy must derive from law/competent body rules", "subgoal-9-2"),
            node("gdpr-cf-9-1", "context-factor", "CF 9-GDPR.1 — special_category_type", "goal-9"),
            node("gdpr-cf-9-2", "context-factor", "CF 9-GDPR.2 — legal_basis_selected", "goal-9"),
            node("gdpr-cf-9-3", "context-factor", "CF 9-GDPR.3 — health_professional_involvement", "goal-9"),
            node("gdpr-cf-9-4", "context-factor", "CF 9-GDPR.4 — scientific_research_purpose", "goal-9"),
            node("gdpr-cf-9-5", "context-factor", "CF 9-GDPR.5 — member_state_law_applicable", "goal-9"),
            node("gdpr-cf-9-6", "context-factor", "CF 9-GDPR.6 — data_subject_consent_possible", "goal-9"),
            node("gdpr-cf-9-7", "context-factor", "CF 9-GDPR.7 — medical_device_quality_safety_purpose", "goal-9"),
        ],
    },
    {
        id: "gdpr-goal-35",
        type: "goal",
        data: {
            isHidden: false,
            label: "GOAL 35-GDPR — Carry out, document and maintain a DPIA before high-risk processing",
        },
        draggable: false,
        aiActLink: "goal-26", // aggiungere anche 27
        children: [
            node("gdpr-subgoal-35-1", "subgoal", "SUBGOAL 35-GDPR.1 — Determine if DPIA is required by risk profile", "goal-35"),
            node("gdpr-subgoal-35-2", "subgoal", "SUBGOAL 35-GDPR.2 — Consult the designated DPO in DPIA process", "goal-35"),
            node("gdpr-subgoal-35-3", "subgoal", "SUBGOAL 35-GDPR.3 — Produce DPIA with all mandatory Art. 35(7) elements", "goal-35"),
            node("gdpr-subgoal-35-4", "subgoal", "SUBGOAL 35-GDPR.4 — Seek data subject views where appropriate", "goal-35"),
            node("gdpr-subgoal-35-5", "subgoal", "SUBGOAL 35-GDPR.5 — Review and update DPIA when risk changes", "goal-35"),
            node("gdpr-subgoal-35-6", "subgoal", "SUBGOAL 35-GDPR.6 — Verify if DPIA exemption conditions apply", "goal-35"),
            node("gdpr-dc-35-1", "domain-constraint", "DC 35-GDPR.1 — DPIA must be done before processing starts", "goal-35"),
            node("gdpr-dc-35-2", "domain-constraint", "DC 35-GDPR.2 — DPIA mandatory for significant automated decision/profiling", "subgoal-35-1"),
            node("gdpr-dc-35-3", "domain-constraint", "DC 35-GDPR.3 — DPIA mandatory for large-scale special category/criminal data", "subgoal-35-1"),
            node("gdpr-dc-35-4", "domain-constraint", "DC 35-GDPR.4 — DPIA mandatory for large-scale public area monitoring", "subgoal-35-1"),
            node("gdpr-dc-35-5", "domain-constraint", "DC 35-GDPR.5 — One DPIA may cover similar operations with similar risks", "goal-35"),
            node("gdpr-dc-35-6", "domain-constraint", "DC 35-GDPR.6 — Controller must seek advice from designated DPO", "subgoal-35-2"),
            node("gdpr-dc-35-7", "domain-constraint", "DC 35-GDPR.7 — DPIA must include description, necessity/proportionality, risks, and mitigations", "subgoal-35-3"),
            node("gdpr-dc-35-8", "domain-constraint", "DC 35-GDPR.8 — Approved codes of conduct must be considered in impact assessment", "subgoal-35-3"),
            node("gdpr-dc-35-9", "domain-constraint", "DC 35-GDPR.9 — Prior legal-basis impact assessments can trigger exemption conditions", "subgoal-35-6"),
            node("gdpr-dc-35-10", "domain-constraint", "DC 35-GDPR.10 — DPIA review required at least when risk changes", "subgoal-35-5"),
            node("gdpr-dc-35-11", "domain-constraint", "DC 35-GDPR.11 — Supervisory authority publishes DPIA-required operation lists", "subgoal-35-1"),
            node("gdpr-qc-35-1", "quality-constraint", "QC 35-GDPR.1 — Processing description must be systematic, not superficial", "subgoal-35-3"),
            node("gdpr-qc-35-2", "quality-constraint", "QC 35-GDPR.2 — Necessity and proportionality assessment must be genuine", "subgoal-35-3"),
            node("gdpr-qc-35-3", "quality-constraint", "QC 35-GDPR.3 — Mitigations must sufficiently address identified risks", "subgoal-35-3"),
            node("gdpr-qc-35-4", "quality-constraint", "QC 35-GDPR.4 — Data subject consultation balances rights and security interests", "subgoal-35-4"),
            node("gdpr-qc-35-5", "quality-constraint", "QC 35-GDPR.5 — DPIA review timing must fit nature of risk change", "subgoal-35-5"),
            node("gdpr-cf-35-1", "context-factor", "CF 35-GDPR.1 — automated_decision_making_with_significant_effects", "goal-35"),
            node("gdpr-cf-35-2", "context-factor", "CF 35-GDPR.2 — large_scale_special_category_processing", "goal-35"),
            node("gdpr-cf-35-3", "context-factor", "CF 35-GDPR.3 — dpo_designated", "goal-35"),
            node("gdpr-cf-35-4", "context-factor", "CF 35-GDPR.4 — supervisory_authority_list_applicable", "goal-35"),
            node("gdpr-cf-35-5", "context-factor", "CF 35-GDPR.5 — prior_legal_basis_assessment_conducted", "goal-35"),
            node("gdpr-cf-35-6", "context-factor", "CF 35-GDPR.6 — approved_code_of_conduct_followed", "goal-35"),
            node("gdpr-cf-35-7", "context-factor", "CF 35-GDPR.7 — processing_risk_change", "goal-35"),
            node("gdpr-cf-35-8", "context-factor", "CF 35-GDPR.8 — data_subject_consultation_feasible", "goal-35"),
        ],
    },
    {
        id: "gdpr-goal-25",
        type: "goal",
        data: {
            isHidden: false,
            label: "GOAL 25-GDPR — Implement data protection by design and by default with appropriate measures",
        },
        draggable: false,
        children: [
            node("gdpr-subgoal-25-1", "subgoal", "SUBGOAL 25-GDPR.1 — Implement measures at design phase", "goal-25"),
            node("gdpr-subgoal-25-2", "subgoal", "SUBGOAL 25-GDPR.2 — Implement measures at processing operation phase", "goal-25"),
            node("gdpr-subgoal-25-3", "subgoal", "SUBGOAL 25-GDPR.3 — Ensure by default only necessary personal data is processed", "goal-25"),
            node("gdpr-subgoal-25-4", "subgoal", "SUBGOAL 25-GDPR.4 — Use approved certification as compliance evidence when applicable", "goal-25"),
            node("gdpr-dc-25-1", "domain-constraint", "DC 25-GDPR.1 — Measures required both at design time and processing time", "goal-25"),
            node("gdpr-dc-25-2", "domain-constraint", "DC 25-GDPR.2 — Measures must effectively implement principles and safeguards", "subgoal-25-1"),
            node("gdpr-dc-25-3", "domain-constraint", "DC 25-GDPR.3 — Default limits apply to amount, extent, storage period and accessibility", "subgoal-25-3"),
            node("gdpr-dc-25-4", "domain-constraint", "DC 25-GDPR.4 — By default data not accessible to indefinite persons without intervention", "subgoal-25-3"),
            node("gdpr-dc-25-5", "domain-constraint", "DC 25-GDPR.5 — Art. 42 certification can support but not solely prove compliance", "subgoal-25-4"),
            node("gdpr-qc-25-1", "quality-constraint", "QC 25-GDPR.1 — Measures must fit state of the art, cost, context and risk severity", "goal-25"),
            node("gdpr-qc-25-2", "quality-constraint", "QC 25-GDPR.2 — Data minimisation must be demonstrably effective — not merely declared but demonstrably implemented in system behaviour", "subgoal-25-3"),
            node("gdpr-qc-25-3", "quality-constraint", "QC 25-GDPR.3 — Pseudonymisation is explicitly cited as an example of appropriate measure — should be applied where technically feasible", "subgoal-25-1"),
            node("gdpr-qc-25-4", "quality-constraint", "QC 25-GDPR.4 — Default settings must be privacy-protective without requiring action from the data subject — privacy-invasive settings must require active opt-in", "subgoal-25-3"),
            node("gdpr-cf-25-1", "context-factor", "CF 25-GDPR.1 — design_phase_active — The system is still in the design phase", "goal-25"),
            node("gdpr-cf-25-2", "context-factor", "CF 25-GDPR.2 — pseudonymisation_feasible — It is technically feasible to apply pseudonymisation to the processed data", "goal-25"),
            node("gdpr-cf-25-3", "context-factor", "CF 25-GDPR.3 — data_minimisation_scope", "goal-25"),
            node("gdpr-cf-25-4", "context-factor", "CF 25-GDPR.4 — certification_mechanism_available", "goal-25"),
            node("gdpr-cf-25-5", "context-factor", "CF 25-GDPR.5 — multi_user_access", "goal-25"),
            node("gdpr-cf-25-6", "context-factor", "CF 25-GDPR.6 — implementation_cost_constraint", "goal-25"),
        ],
    },
    {
        id: "gdpr-goal-89",
        type: "goal",
        data: {
            isHidden: false,
            label: "GOAL 89-GDPR — Ensure research/archiving/statistics processing uses safeguards and lawful rights derogations",
        },
        draggable: false,
        children: [
            node("gdpr-subgoal-89-1", "subgoal", "SUBGOAL 89-GDPR.1 — Implement technical and organisational safeguards with minimisation", "goal-89"),
            node("gdpr-subgoal-89-2", "subgoal", "SUBGOAL 89-GDPR.2 — Apply anonymisation/pseudonymisation where identification is unnecessary", "goal-89"),
            node("gdpr-subgoal-89-3", "subgoal", "SUBGOAL 89-GDPR.3 — Apply rights derogations for research/statistics only when lawful", "goal-89"),
            node("gdpr-subgoal-89-4", "subgoal", "SUBGOAL 89-GDPR.4 — Apply rights derogations for public-interest archiving when lawful", "goal-89"),
            node("gdpr-subgoal-89-5", "subgoal", "SUBGOAL 89-GDPR.5 — Restrict derogation scope to research/archiving/statistical component", "goal-89"),
            node("gdpr-dc-89-1", "domain-constraint", "DC 89-GDPR.1 — Safeguards for rights and freedoms are mandatory", "goal-89"),
            node("gdpr-dc-89-2", "domain-constraint", "DC 89-GDPR.2 — Safeguards must include measures to enforce minimisation", "subgoal-89-1"),
            node("gdpr-dc-89-3", "domain-constraint", "DC 89-GDPR.3 — Non-identifying processing must be used when sufficient", "subgoal-89-2"),
            node("gdpr-dc-89-4", "domain-constraint", "DC 89-GDPR.4 — Research/statistics derogations require Union or Member State law", "subgoal-89-3"),
            node("gdpr-dc-89-5", "domain-constraint", "DC 89-GDPR.5 — Derogations allowed only if rights would seriously impair purpose", "subgoal-89-3"),
            node("gdpr-dc-89-6", "domain-constraint", "DC 89-GDPR.6 — Derogations must be necessary for purpose fulfilment", "subgoal-89-3"),
            node("gdpr-dc-89-7", "domain-constraint", "DC 89-GDPR.7 — Archiving derogations require Union or Member State law", "subgoal-89-4"),
            node("gdpr-dc-89-8", "domain-constraint", "DC 89-GDPR.8 — In dual-purpose processing, derogations apply only to research/statistics part", "subgoal-89-5"),
            node("gdpr-qc-89-1", "quality-constraint", "QC 89-GDPR.1 — Pseudonymisation is preferred when it satisfies purpose", "subgoal-89-2"),
            node("gdpr-qc-89-2", "quality-constraint", "QC 89-GDPR.2 — Derogations must be strictly necessary and proportionate", "subgoal-89-3"),
            node("gdpr-qc-89-3", "quality-constraint", "QC 89-GDPR.3 — Derogation boundaries must be clearly demarcated in dual-purpose processing", "subgoal-89-5"),
            node("gdpr-cf-89-1", "context-factor", "CF 89-GDPR.1 — research_purpose_type", "goal-89"),
            node("gdpr-cf-89-2", "context-factor", "CF 89-GDPR.2 — identification_necessary_for_purpose", "goal-89"),
            node("gdpr-cf-89-3", "context-factor", "CF 89-GDPR.3 — member_state_derogation_law", "goal-89"),
            node("gdpr-cf-89-4", "context-factor", "CF 89-GDPR.4 — data_subject_rights_impairment_risk", "goal-89"),
            node("gdpr-cf-89-5", "context-factor", "CF 89-GDPR.5 — dual_purpose_processing", "goal-89"),
            node("gdpr-cf-89-6", "context-factor", "CF 89-GDPR.6 — pseudonymisation_sufficient_for_purpose", "goal-89"),
        ],
    },
]

export const GDPRNodes = normalizeTreePositions(raw_GDPRNodes);
