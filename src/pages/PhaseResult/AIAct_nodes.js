const LAYER_ROOT = 1;
const LAYER_GOAL = 2;
const LAYER_SUBGOAL = 3;
/** Tutti i tipi diversi da root / goal / subgoal stanno da qui in giù (sotto i subgoal). */
const MIN_LAYER_OTHER = 4;

const GAP_X = 40;
const GAP_Y = 400;
const MARGIN_X = 20;
const MARGIN_Y = 40;

const DEFAULT_SIZE_BY_TYPE = {
    root: {width: 100, height: 100},
    goal: {width: 240, height: 80},
    subgoal: {width: 240, height: 80},
    "domain-constraint": {width: 300, height: 96},
    "quality-constraint": {width: 120, height: 120},
    "context-factor": {width: 180, height: 90},
};

const getChildren = (node) => (Array.isArray(node?.children) ? node.children : []);

export function estimateNodeSize(node) {
    const base = DEFAULT_SIZE_BY_TYPE[node?.type] ?? {width: 200, height: 80};
    const label = String(node?.data?.label ?? "");
    const extraW = Math.min(220, Math.max(0, Math.floor((label.length - 36) * 3.2)));
    return {width: base.width + extraW, height: base.height};
}

const deepCloneForest = (forest) => JSON.parse(JSON.stringify(forest));

const buildParentIdToNode = (roots, map = new Map()) => {
    const walk = (node) => {
        map.set(node.id, node);
        getChildren(node).forEach(walk);
    };
    roots.forEach(walk);
    return map;
};

const collectPreorderMeta = (roots) => {
    const rows = [];
    let preorder = 0;
    const walk = (node, activeGoalId) => {
        const goalAncestorId = node.type === "goal" ? node.id : activeGoalId;
        rows.push({node, preorder: preorder++, goalAncestorId});
        const nextGoal = node.type === "goal" ? node.id : activeGoalId;
        getChildren(node).forEach((ch) => walk(ch, nextGoal));
    };
    roots.forEach((r) => walk(r, null));
    return rows;
};

const fixedLayerForType = (type) => {
    if (type === "root") {
        return LAYER_ROOT;
    }
    if (type === "goal") {
        return LAYER_GOAL;
    }
    if (type === "subgoal") {
        return LAYER_SUBGOAL;
    }
    return null;
};

/**
 * Assegna un indice intero di layer a ogni nodo:
 * 1 root, 2 goal, 3 subgoal, >=4 altri tipi con vincolo parent sopra figlio.
 */
const depthByParentId = (nodeId, idToNode, memo = new Map(), visiting = new Set()) => {
    if (memo.has(nodeId)) {
        return memo.get(nodeId);
    }
    if (visiting.has(nodeId)) {
        return 0;
    }
    visiting.add(nodeId);
    const n = idToNode.get(nodeId);
    if (!n?.parentId) {
        memo.set(nodeId, 0);
        visiting.delete(nodeId);
        return 0;
    }
    const d = 1 + depthByParentId(n.parentId, idToNode, memo, visiting);
    visiting.delete(nodeId);
    memo.set(nodeId, d);
    return d;
};

const assignSemanticLayers = (rows, idToNode) => {
    const layerById = new Map();
    const others = [];

    for (const {node} of rows) {
        const fixed = fixedLayerForType(node.type);
        if (fixed != null) {
            layerById.set(node.id, fixed);
        } else {
            others.push(node);
        }
    }

    others.sort((a, b) => depthByParentId(a.id, idToNode) - depthByParentId(b.id, idToNode));

    const parentLayer = (parentId) => {
        if (!parentId) {
            return LAYER_ROOT;
        }
        const p = idToNode.get(parentId);
        if (!p) {
            return LAYER_ROOT;
        }
        const assigned = layerById.get(parentId);
        if (assigned != null) {
            return assigned;
        }
        const fx = fixedLayerForType(p.type);
        if (fx != null) {
            return fx;
        }
        return LAYER_SUBGOAL;
    };

    for (const node of others) {
        const pl = parentLayer(node.parentId);
        layerById.set(node.id, Math.max(MIN_LAYER_OTHER, pl + 1));
    }

    return layerById;
};

/**
 * Larghezza massima (su un singolo layer) dei nodi discendenti di un goal
 * (layer >= subgoal), usata per allocare la colonna sotto il goal.
 */
const maxSubtreeBandWidthForGoal = (goalId, sortedLayerKeys, layers) => {
    const gRow = [...layers.values()]
        .flat()
        .find((r) => r.node?.id === goalId && r.node?.type === "goal");
    let maxW = gRow ? estimateNodeSize(gRow.node).width : 240;

    for (const L of sortedLayerKeys) {
        if (L < LAYER_SUBGOAL) {
            continue;
        }
        const bucket = layers.get(L) ?? [];
        const group = bucket.filter((r) => r.goalAncestorId === goalId);
        if (group.length === 0) {
            continue;
        }
        group.sort((a, b) => a.preorder - b.preorder);
        let sum = 0;
        for (let i = 0; i < group.length; i += 1) {
            sum += estimateNodeSize(group[i].node).width;
            if (i < group.length - 1) {
                sum += GAP_X;
            }
        }
        maxW = Math.max(maxW, sum);
    }
    return maxW;
};

/**
 * Bbox orizzontale di tutti i nodi tranne il root (per centrare il root).
 */
const horizontalBoundsExcludingRoot = (roots) => {
    let minX = Infinity;
    let maxX = -Infinity;
    const walk = (node) => {
        if (node.type === "root") {
            getChildren(node).forEach(walk);
            return;
        }
        const {width} = estimateNodeSize(node);
        const x = Number(node?.position?.x ?? 0);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + width);
        getChildren(node).forEach(walk);
    };
    roots.forEach(walk);
    return {minX, maxX};
};

/**
 * Posiziona per layer: root; goal su colonne larghe al massimo delle bande figlie;
 * da subgoal in giù, righe per goal centrate sul centro orizzontale del goal.
 */
const applyLayeredPositions = (roots, rows, layerById) => {
    const layers = new Map();
    for (const row of rows) {
        const L = layerById.get(row.node.id) ?? LAYER_ROOT;
        if (!layers.has(L)) {
            layers.set(L, []);
        }
        layers.get(L).push(row);
    }

    const sortedKeys = [...layers.keys()].sort((a, b) => a - b);
    const rootNode = roots.find((n) => n.type === "root");
    const goals =
        rootNode && Array.isArray(rootNode.children) ? rootNode.children.filter((c) => c.type === "goal") : [];

    let yCursor = MARGIN_Y;

    for (const L of sortedKeys) {
        const bucket = layers.get(L);

        if (L === LAYER_ROOT) {
            let rowMaxH = 0;
            for (const {node} of bucket) {
                const {width, height} = estimateNodeSize(node);
                rowMaxH = Math.max(rowMaxH, height);
                node.position = {x: MARGIN_X, y: yCursor};
            }
            yCursor += rowMaxH + GAP_Y + 500;
            continue;
        }

        if (L === LAYER_GOAL) {
            let rowMaxH = 0;
            let xCol = MARGIN_X;
            for (const G of goals) {
                const colW = maxSubtreeBandWidthForGoal(G.id, sortedKeys, layers);
                const {width: wG, height: hG} = estimateNodeSize(G);
                rowMaxH = Math.max(rowMaxH, hG);
                G.position = {x: xCol + (colW - wG) / 2, y: yCursor};
                xCol += colW + GAP_X;
            }
            yCursor += rowMaxH + GAP_Y;
            continue;
        }

        const byGoal = new Map();
        for (const row of bucket) {
            const gid = row.goalAncestorId;
            if (gid == null) {
                continue;
            }
            if (!byGoal.has(gid)) {
                byGoal.set(gid, []);
            }
            byGoal.get(gid).push(row);
        }

        let rowMaxH = 0;
        for (const G of goals) {
            const group = (byGoal.get(G.id) ?? []).slice().sort((a, b) => a.preorder - b.preorder);
            for (const r of group) {
                rowMaxH = Math.max(rowMaxH, estimateNodeSize(r.node).height);
            }
        }

        for (const G of goals) {
            const group = (byGoal.get(G.id) ?? []).slice().sort((a, b) => a.preorder - b.preorder);
            if (group.length === 0) {
                continue;
            }
            let pack = 0;
            const lefts = [];
            for (let i = 0; i < group.length; i += 1) {
                const r = group[i];
                const w = estimateNodeSize(r.node).width;
                lefts.push(pack);
                pack += w + (i < group.length - 1 ? GAP_X : 0);
            }
            const totalW = pack;
            const {width: wGoal} = estimateNodeSize(G);
            const goalCx = G.position.x + wGoal / 2;
            const offset = goalCx - totalW / 2;
            for (let i = 0; i < group.length; i += 1) {
                const r = group[i];
                r.node.position = {x: offset + lefts[i], y: yCursor};
            }
        }

        yCursor += rowMaxH + GAP_Y;
    }

    if (rootNode?.position) {
        const {minX, maxX} = horizontalBoundsExcludingRoot(roots);
        if (Number.isFinite(minX) && Number.isFinite(maxX) && maxX >= minX) {
            const rw = estimateNodeSize(rootNode).width;
            rootNode.position.x = (minX + maxX) / 2 - rw / 2;
        }
    }
};

export function normalizeTreePositions(forest) {
    const roots = deepCloneForest(forest);
    if (!roots.length) {
        return roots;
    }

    const idToNode = buildParentIdToNode(roots);
    const rows = collectPreorderMeta(roots);
    const layerById = assignSemanticLayers(rows, idToNode);
    applyLayeredPositions(roots, rows, layerById);

    return roots;
}

// TODO LIVIA: sistemare descrizione dei context factors (alcuni hanno ancora descrizione in italiano)  
export const raw_AIActNodes = [
    {
        "id": "ai-act-compliance",
        "type": "root",
        "data": {
            "isHidden": false,
            "label": "AI_Act_Compliance",
            "top": "no"
        },
        "draggable": false,
        "children": [
            {
                "id": "goal-9",
                "type": "goal",
                "data": {
                    "isHidden": false,
                    "label": "GOAL 9 — Establish, implement, document and maintain a risk management system for the high-risk AI system throughout its entire lifecycle"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-9-1",
                        "type": "subgoal",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 9.1 — Identify and analyse known and reasonably foreseeable risks to health, safety or fundamental rights"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-9-2",
                        "type": "subgoal",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 9.2 — Estimate and evaluate risks under intended purpose and reasonably foreseeable misuse"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-9-3",
                        "type": "subgoal",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 9.3 — Evaluate risks arising from post-market monitoring data"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-9-4",
                        "type": "subgoal",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 9.4 — Adopt appropriate and targeted risk management measures to address identified risks"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-9-5",
                        "type": "subgoal",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 9.5 — Test high-risk AI system to identify most appropriate risk management measures"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-9-6",
                        "type": "subgoal",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 9.6 — Consider impact on vulnerable groups (minors and others) in risk management"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-1",
                        "type": "domain-constraint",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.1 — Risk management shall be a continuous iterative process throughout the entire lifecycle",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-2",
                        "type": "domain-constraint",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.2 — Risk management shall require regular systematic review and updating",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-3",
                        "type": "domain-constraint",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.3 — Risks considered are only those reasonably mitigable through design, development or technical information",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-4",
                        "type": "domain-constraint",
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.4 — Risk measures must consider combined effects of all Section III requirements",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-5",
                        "type": "domain-constraint",
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.5 — Residual risk (per hazard and overall) must be judged acceptable",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-6",
                        "type": "domain-constraint",
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.6 — Risk elimination/reduction must be pursued as far as technically feasible through design",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-7",
                        "type": "domain-constraint",
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.7 — Where risks cannot be eliminated, mitigation and control measures must be implemented",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-8",
                        "type": "domain-constraint",
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.8 — Information per Art. 13 and deployer training must be provided as risk measure",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-9",
                        "type": "domain-constraint",
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.9 — Testing must be performed at any time during development and prior to market placement",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-10",
                        "type": "domain-constraint",
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.10 — Testing may include real-world conditions per Art. 60",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-11",
                        "type": "domain-constraint",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.11 — If other Union law requires internal risk management, Art. 9 aspects may be integrated into those procedures",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-12",
                        "type": "domain-constraint",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.12 — ??",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-1",
                        "type": "quality-constraint",
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.1 — Risk management measures must minimise risks effectively while maintaining appropriate balance",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-2",
                        "type": "quality-constraint",
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.2 — Testing must ensure consistent performance for intended purpose",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-3",
                        "type": "quality-constraint",
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.3 — Testing must be carried out against pre-defined metrics and probabilistic thresholds appropriate to intended purpose",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-4",
                        "type": "quality-constraint",
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.4 — Deployer's technical knowledge, experience, education and context must be considered in risk measures",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-1",
                        "type": "context-factor",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.1 — is_post_market",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-2",
                        "type": "context-factor",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.2 — foreseeable_misuse_scenarios",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-3",
                        "type": "context-factor",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.3 — vulnerable_groups_exposure",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-4",
                        "type": "context-factor",
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.4 — existing_union_risk_management",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-10",
                "type": "goal",
                "data": {
                    "isHidden": false,
                    "label": "GOAL 10 — Ensure data governance and quality of training, validation and testing datasets for the high-risk AI system"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-10-1",
                        "type": "subgoal",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 10.1 — Apply appropriate data governance and management practices to all datasets"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-10-2",
                        "type": "subgoal",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 10.2 — Ensure datasets are relevant, sufficiently representative, free of errors and complete"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-10-3",
                        "type": "subgoal",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 10.3 — Detect, prevent and mitigate possible biases in datasets"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-10-4",
                        "type": "subgoal",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 10.4 — Identify and address data gaps or shortcomings preventing compliance"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-10-5",
                        "type": "subgoal",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 10.5 — Ensure datasets account for specific geographical, contextual, behavioural or functional settings"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-10-6",
                        "type": "subgoal",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 10.6 — Process special categories of personal data only where strictly necessary for bias detection and correction"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-1",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.1 — Data governance practices must cover: design choices, data collection, origin, preparation operations (annotation, labelling, cleaning, enrichment, aggregation)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-2",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.2 — Formulation of assumptions about what data measures and represents must be documented",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-3",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.3 — Availability, quantity and suitability of datasets must be assessed",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-4",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.4 — Biases likely to affect health, safety, fundamental rights or leading to discrimination must be examined",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-5",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.5 — Special categories of personal data may be processed only if bias correction cannot be fulfilled by other data (including synthetic or anonymised)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-6",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.6 — Special categories of personal data must not be transmitted, transferred or accessed by other parties",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-7",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.7 — Special categories of personal data must be deleted once bias is corrected or retention period ends (whichever comes first)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-8",
                        "type": "domain-constraint",
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.8 — Records of processing activities must document why special category data was strictly necessary",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-9",
                        "type": "domain-constraint",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.9 — For AI systems not using model training, paragraphs 2–5 apply only to testing datasets",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-1",
                        "type": "quality-constraint",
                        "parentId": "subgoal-10-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.1 — Datasets must have appropriate statistical properties, including regarding persons or groups the system is intended for",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-2",
                        "type": "quality-constraint",
                        "parentId": "subgoal-10-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.2 — Dataset characteristics may be met at individual dataset level or combination thereof",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-3",
                        "type": "quality-constraint",
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.3 — Special categories of personal data must be subject to state-of-the-art security and privacy-preserving measures including pseudonymisation",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-4",
                        "type": "quality-constraint",
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.4 — Access to special categories of personal data must be strictly controlled, documented and limited to authorised persons with confidentiality obligations",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-5",
                        "type": "quality-constraint",
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.5 — Technical limitations on re-use of special category personal data must be applied",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-1",
                        "type": "context-factor",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.1 — training_technique",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-2",
                        "type": "context-factor",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.2 — data_origin",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-3",
                        "type": "context-factor",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.3 — special_category_data_used",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-4",
                        "type": "context-factor",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.4 — deployment_context",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-5",
                        "type": "context-factor",
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.5 — target_population",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-13",
                "type": "goal",
                "data": {
                    "isHidden": false,
                    "label": "GOAL 13 — Ensure sufficient transparency of high-risk AI system to enable deployers to interpret output and use it appropriately"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-13-1",
                        "type": "subgoal",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.1 — Ensure appropriate type and degree of transparency to achieve compliance with provider and deployer obligations (Section 3)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-13-2",
                        "type": "subgoal",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.2 — Provide instructions for use in appropriate digital format"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-13-3",
                        "type": "subgoal",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.3 — Include provider identity and contact details in instructions"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-13-4",
                        "type": "subgoal",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.4 — Document characteristics, capabilities and limitations of performance"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-13-5",
                        "type": "subgoal",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.5 — Document human oversight measures"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-13-6",
                        "type": "subgoal",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.6 — Document computational, hardware resources, lifetime and maintenance requirements"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-13-7",
                        "type": "subgoal",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.7 — Describe mechanisms for deployers to collect, store and interpret logs."
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-1",
                        "type": "domain-constraint",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.1 — Transparency must be ensured by design and development",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-2",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.2 — Instructions for use must be in appropriate digital format or otherwise",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-3",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.3 — Instructions must include identity and contact details of provider and authorised representative",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-4",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.4 — Instructions must include intended purpose of the system",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-5",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.5 — Instructions must include level of accuracy, metrics, robustness and cybersecurity as tested and validated",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-6",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.6 — Instructions must include known/foreseeable circumstances leading to risks to health, safety or fundamental rights.",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-7",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.7 — Instructions must include technical capabilities for explainability of output where applicable",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-8",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.8 — Instructions must include performance regarding specific persons or groups where appropriate",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-9",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.9 — Instructions must include input data specifications and training/validation/testing dataset information where relevant",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-10",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.10 — Instructions must include information to enable deployers to interpret output appropriately",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-11",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.11 — Instructions must include predetermined changes to system and performance identified at initial conformity assessment",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-12",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.12 — Instructions must include human oversight measures and technical measures for output interpretation.",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-13",
                        "type": "domain-constraint",
                        "parentId": "subgoal-13-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.13 — Instructions must include computational/hardware requirements, expected lifetime and maintenance measures including software update frequency",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-14",
                        "type": "domain-constraint",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.14 — Instructions must describe log collection, storage and interpretation mechanisms where relevant.",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-13-1",
                        "type": "quality-constraint",
                        "parentId": "subgoal-13-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 13.1 — Instructions must be concise, complete, correct and clear",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-13-2",
                        "type": "quality-constraint",
                        "parentId": "subgoal-13-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 13.2 — Instructions must be relevant, accessible and comprehensible to deployers",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-13-3",
                        "type": "quality-constraint",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "QC 13.3 — Transparency must be appropriate in type and degree to the system's intended purpose",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-1",
                        "type": "context-factor",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.1 — explainability_capability",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-2",
                        "type": "context-factor",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.2 — target_deployer_profile",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-3",
                        "type": "context-factor",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.3 — predetermined_changes",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-4",
                        "type": "context-factor",
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.4 — specific_population_performance",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-14",
                "type": "goal",
                "data": {
                    "isHidden": false,
                    "label": "GOAL 14 — Ensure effective human oversight of high-risk AI system during its use through appropriate design and measures"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-14-1",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.1 — Build human oversight measures into the system by design before market placement"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-14-2",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.2 — Identify oversight measures appropriate for implementation by deployer"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-14-3",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.3 — Enable oversight persons to understand capabilities and limitations and monitor system operation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-14-4",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.4 — Enable oversight persons to detect and address automation bias"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-14-5",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.5 — Enable oversight persons to correctly interpret system output"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-14-6",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.6 — Enable oversight persons to override, disregard or reverse system output"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-14-7",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.7 — Enable oversight persons to intervene or halt system operation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-14-8",
                        "type": "subgoal",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 14.8 — For Annex III point 1(a) systems: ensure dual verification of identification results before any action or decision"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-1",
                        "type": "domain-constraint",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.1 — Human oversight must be ensured by design, including through appropriate human-machine interface tools",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-2",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.2 — Oversight measures must be built into the system when technically feasible, before market placement",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-3",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.3 — Oversight measures must be identified before market placement and appropriate for deployer implementation",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-4",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.4 — System must be provided to deployer in a way that enables assigned natural persons to monitor operation including anomalies, dysfunctions and unexpected performance",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-5",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.5 — System must provide means for oversight persons to correctly interpret output using available interpretation tools",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-6",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.6 — Oversight persons must be able in any situation to decide not to use the system or override its output",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-7",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.7 — System must include a stop button or similar procedure allowing safe halt",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-8",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.8 — For Annex III point 1(a) systems: no action or decision shall be taken unless identification is separately verified and confirmed by at least two competent natural persons",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-9",
                        "type": "domain-constraint",
                        "parentId": "subgoal-14-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.9 — Dual verification requirement for Annex III point 1(a) does not apply to law enforcement, migration, border control or asylum where Union or national law deems it disproportionate",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-1",
                        "type": "quality-constraint",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.1 — Oversight measures must be commensurate with risks, level of autonomy and context of use",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-2",
                        "type": "quality-constraint",
                        "parentId": "subgoal-14-3",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.2 — Oversight measures must be appropriate and proportionate to the role of the natural person assigned",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-3",
                        "type": "quality-constraint",
                        "parentId": "subgoal-14-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.3 — Oversight persons must be made aware of automation bias risk, particularly where system provides recommendations for human decisions",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-4",
                        "type": "quality-constraint",
                        "parentId": "subgoal-14-8",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.4 — Dual verification persons must have necessary competence, training and authority",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-14-1",
                        "type": "context-factor",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "CF 14.1 — level_of_autonomy — grado di autonomia del sistema (es. decision support vs autonomous decision)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-14-2",
                        "type": "context-factor",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "CF 14.2 — oversight_persons_profile — chi è assegnato alla supervisione umana (es. radiologo, patologo)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-14-3",
                        "type": "context-factor",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "CF 14.3 — output_type — il sistema produce raccomandazioni per decisioni umane o decisioni dirette",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-14-4",
                        "type": "context-factor",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "CF 14.4 — annex_III_point_1a — il sistema rientra nel punto 1(a) Annex III (richiede doppia verifica)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-14-5",
                        "type": "context-factor",
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "CF 14.5 — stop_mechanism_feasibility — è tecnicamente feasible implementare un meccanismo di halt sicuro",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-15",
                "type": "goal",
                "data": {
                    "isHidden": false,
                    "label": "GOAL 15 — Ensure appropriate level of accuracy, robustness and cybersecurity of the high-risk AI system consistently throughout its lifecycle"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-15-1",
                        "type": "subgoal",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 15.1 — Achieve and declare appropriate level of accuracy with relevant metrics"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-15-2",
                        "type": "subgoal",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 15.2 — Ensure resilience against internal errors, faults and inconsistencies"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-15-3",
                        "type": "subgoal",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 15.3 — Prevent and mitigate feedback loops in systems that continue learning post-deployment"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-15-4",
                        "type": "subgoal",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 15.4 — Ensure cybersecurity resilience against unauthorised third party attempts to alter use, outputs or performance"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-15-5",
                        "type": "subgoal",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 15.5 — Address AI-specific vulnerabilities through appropriate technical solutions"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-1",
                        "type": "domain-constraint",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.1 — Accuracy, robustness and cybersecurity must be achieved by design and development",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-2",
                        "type": "domain-constraint",
                        "parentId": "subgoal-15-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.2 — Levels of accuracy and relevant accuracy metrics must be declared in instructions for use",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-3",
                        "type": "domain-constraint",
                        "parentId": "subgoal-15-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.3 — Technical and organisational measures must be taken to address resilience against errors, faults and inconsistencies",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-4",
                        "type": "domain-constraint",
                        "parentId": "subgoal-15-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.4 — Systems that continue to learn post-deployment must eliminate or reduce risk of biased outputs influencing future inputs (feedback loops)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-5",
                        "type": "domain-constraint",
                        "parentId": "subgoal-15-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.5 — Feedback loops must be addressed with appropriate mitigation measures",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-6",
                        "type": "domain-constraint",
                        "parentId": "subgoal-15-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.6 — Technical solutions for cybersecurity must include where appropriate measures against: data poisoning, model poisoning, adversarial examples/model evasion, confidentiality attacks, model flaws",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-1",
                        "type": "quality-constraint",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.1 — Performance must be consistent throughout the entire lifecycle",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-2",
                        "type": "quality-constraint",
                        "parentId": "subgoal-15-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.2 — Robustness must be as high as possible regarding errors, faults or inconsistencies",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-3",
                        "type": "quality-constraint",
                        "parentId": "subgoal-15-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.3 — Redundancy solutions (backup, fail-safe) may be used to achieve robustness",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-4",
                        "type": "quality-constraint",
                        "parentId": "subgoal-15-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.4 — Cybersecurity technical solutions must be appropriate to relevant circumstances and risks",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-5",
                        "type": "quality-constraint",
                        "parentId": "subgoal-15-3",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.5 — Feedback loop risk must be eliminated or reduced as far as possible",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-1",
                        "type": "context-factor",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.1 — continuous_learning",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-2",
                        "type": "context-factor",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.2 — accuracy_metrics_defined",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-3",
                        "type": "context-factor",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.3 — cybersecurity_threat_profile",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-4",
                        "type": "context-factor",
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.4 — interaction_type",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
        ]
    }
];

export const AIActNodes = normalizeTreePositions(raw_AIActNodes);
