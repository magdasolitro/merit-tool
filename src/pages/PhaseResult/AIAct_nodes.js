/** Minimum clear gap (px) between bounding boxes (horizontal + vertical packing) */
const MIN_NODE_SEPARATION = 100;
/** Extra vertical space between rows of siblings (pushes content to lower layers) */
const ROW_VERTICAL_EXTRA = 72;
/** Gap between root bottom and layer-2 goals */
const GAP_ROOT_TO_GOALS = 200;
/** Gap between parent bottom and first child row */
const GAP_PARENT_TO_CHILDREN = 160;
/** Max siblings per row: lower = more rows below parent, less crowding */
const MAX_SIBLINGS_PER_ROW = 3;
/** Layer-1 root top Y */
const LAYER_1_Y = 40;
/** Horizontal anchor for centering (matches typical graph origin) */
const CANVAS_ANCHOR_X = 16000;
/** Additional horizontal gap between layer-2 goals */
const GOAL_TO_GOAL_EXTRA_GAP = 80;

const LAYER_TWO_GOAL_ID = /^goal-\d+$/;

const TYPE_DIMENSIONS = {
    root: {width: 120, height: 120},
    goal: {width: 260, height: 100},
    subgoal: {width: 260, height: 100},
    oval: {width: 260, height: 100},
    "domain-constraint": {width: 280, height: 140},
    "quality-constraint": {width: 180, height: 180},
    "context-factor": {width: 220, height: 110},
};

const cloneNode = (node) => ({
    ...node,
    position: node?.position ? {...node.position} : {x: 0, y: 0},
    data: node?.data ? {...node.data} : node?.data,
    children: Array.isArray(node?.children) ? node.children.map(cloneNode) : node?.children,
});

const getNodeSize = (node) => {
    const fallback = TYPE_DIMENSIONS[node?.type] || {width: 220, height: 110};
    if (!node?.data) {
        return fallback;
    }
    if (node.type === "goal" || node.type === "subgoal" || node.type === "oval") {
        return {
            width: Number(node.data.width || fallback.width),
            height: Number(node.data.height || fallback.height),
        };
    }
    if (node.type === "context-factor") {
        return {
            width: Number(node.data.sizeX || fallback.width),
            height: Number(node.data.sizeY || fallback.height),
        };
    }
    return fallback;
};

const isLayerTwoGoal = (node, parent) =>
    parent?.type === "root" && node?.type === "goal" && LAYER_TWO_GOAL_ID.test(String(node?.id ?? ""));

const getRect = (node) => {
    const s = getNodeSize(node);
    const x = Number(node?.position?.x ?? 0);
    const y = Number(node?.position?.y ?? 0);
    return {left: x, top: y, right: x + s.width, bottom: y + s.height};
};

/** Inflated AABB: two nodes "touch" only if closer than MIN_NODE_SEPARATION */
const getInflatedRect = (node) => {
    const r = getRect(node);
    const p = MIN_NODE_SEPARATION / 2;
    return {left: r.left - p, top: r.top - p, right: r.right + p, bottom: r.bottom + p};
};

const rectsOverlap = (a, b) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const flattenNodes = (node, parent, out) => {
    out.push({node, parent});
    (node.children || []).forEach((ch) => flattenNodes(ch, node, out));
};

const collectSubtree = (node, acc) => {
    acc.push(node);
    (node.children || []).forEach((ch) => collectSubtree(ch, acc));
    return acc;
};

const translateSubtree = (rootNode, dx, dy) => {
    collectSubtree(rootNode, []).forEach((n) => {
        n.position = {
            x: Number(n.position.x) + dx,
            y: Number(n.position.y) + dy,
        };
    });
};

/**
 * After arbitrary moves: every child must be fully below its parent (with gap).
 * Repeats until stable (subtree moves can affect deeper levels).
 */
const enforceBelowParentTree = (rootNode) => {
    const walk = (n) => {
        const children = Array.isArray(n.children) ? n.children.filter(Boolean) : [];
        const pSize = getNodeSize(n);
        const minChildTop = n.position.y + pSize.height + GAP_PARENT_TO_CHILDREN;
        children.forEach((child) => {
            if (child.position.y < minChildTop) {
                translateSubtree(child, 0, minChildTop - child.position.y);
            }
            walk(child);
        });
    };
    for (let k = 0; k < 64; k++) {
        walk(rootNode);
    }
};

const layoutRootAndLayerTwoGoals = (root) => {
    const rootSize = getNodeSize(root);
    root.position = {
        x: CANVAS_ANCHOR_X - rootSize.width / 2,
        y: LAYER_1_Y,
    };

    const children = root.children || [];
    const goals = children.filter((c) => isLayerTwoGoal(c, root));
    if (goals.length === 0) {
        return;
    }

    const layer2Top = root.position.y + rootSize.height + GAP_ROOT_TO_GOALS;
    const gapX = MIN_NODE_SEPARATION + GOAL_TO_GOAL_EXTRA_GAP;
    const totalW = goals.reduce((s, g) => s + getNodeSize(g).width, 0) + (goals.length - 1) * gapX;
    let x = CANVAS_ANCHOR_X - totalW / 2;
    goals.forEach((g) => {
        const sz = getNodeSize(g);
        g.position = {x, y: layer2Top};
        x += sz.width + gapX;
    });
};

const layoutNonGoalChildren = (parent, options = {}) => {
    const allCh = Array.isArray(parent.children) ? parent.children.filter(Boolean) : [];
    const children =
        parent.type === "root" ? allCh.filter((c) => !isLayerTwoGoal(c, parent)) : allCh;
    if (children.length === 0) {
        return;
    }

    const pSize = getNodeSize(parent);
    const pCx = parent.position.x + pSize.width / 2;
    const baseBelowParent = parent.position.y + pSize.height + GAP_PARENT_TO_CHILDREN;
    const firstRowTop = Math.max(baseBelowParent, options.minChildTop ?? -Infinity);

    let index = 0;
    let rowTop = firstRowTop;
    while (index < children.length) {
        const slice = children.slice(index, index + MAX_SIBLINGS_PER_ROW);
        const maxH = Math.max(...slice.map((c) => getNodeSize(c).height));
        const innerW =
            slice.reduce((s, c) => s + getNodeSize(c).width, 0) + (slice.length - 1) * MIN_NODE_SEPARATION;
        let left = pCx - innerW / 2;
        slice.forEach((child) => {
            const cs = getNodeSize(child);
            child.position = {x: left, y: rowTop};
            left += cs.width + MIN_NODE_SEPARATION;
            layoutNonGoalChildren(child, {});
        });
        rowTop += maxH + MIN_NODE_SEPARATION + ROW_VERTICAL_EXTRA;
        index += slice.length;
    }
};

/**
 * Global overlap removal: nudge subtrees apart (large vertical / horizontal steps).
 * Nodes sorted by top Y: inner loop can stop when j is too far below i for vertical overlap.
 */
const resolveGlobalOverlaps = (flatList) => {
    const maxIterations = 2200;
    const nudgeY = 110;
    const nudgeX = 140;
    const verticalScanSlack = MIN_NODE_SEPARATION * 6;

    for (let iter = 0; iter < maxIterations; iter++) {
        const sorted = flatList
            .map((e) => e.node)
            .sort((a, b) => getRect(a).top - getRect(b).top || String(a.id).localeCompare(String(b.id)));

        let moved = false;
        outer: for (let i = 0; i < sorted.length; i++) {
            const a = sorted[i];
            const ra = getInflatedRect(a);
            for (let j = i + 1; j < sorted.length; j++) {
                const b = sorted[j];
                const rbTop = getRect(b).top;
                if (rbTop > ra.bottom + verticalScanSlack) {
                    break;
                }
                if (!rectsOverlap(ra, getInflatedRect(b))) {
                    continue;
                }
                const toNudge =
                    Number(a.position.y) > Number(b.position.y) ||
                    (a.position.y === b.position.y && String(a.id) > String(b.id))
                        ? a
                        : b;
                const dx = iter % 4 === 1 || iter % 4 === 3 ? nudgeX : 0;
                translateSubtree(toNudge, dx, nudgeY);
                moved = true;
                break outer;
            }
        }
        if (!moved) {
            break;
        }
    }
};

const normalizeTreePositions = (roots) => {
    const normalized = roots.map(cloneNode);
    normalized.forEach((root) => {
        if (root.type !== "root") {
            layoutNonGoalChildren(root, {});
            const flat = [];
            flattenNodes(root, null, flat);
            enforceBelowParentTree(root);
            resolveGlobalOverlaps(flat);
            enforceBelowParentTree(root);
            const flat2 = [];
            flattenNodes(root, null, flat2);
            resolveGlobalOverlaps(flat2);
            enforceBelowParentTree(root);
            return;
        }

        layoutRootAndLayerTwoGoals(root);
        const rootChildren = root.children || [];
        const layerGoals = rootChildren.filter((c) => isLayerTwoGoal(c, root));

        let minTopForOthers = -Infinity;
        if (layerGoals.length > 0) {
            minTopForOthers =
                Math.max(...layerGoals.map((g) => g.position.y + getNodeSize(g).height)) +
                GAP_PARENT_TO_CHILDREN;
        }

        layerGoals.forEach((g) => layoutNonGoalChildren(g, {}));

        if (rootChildren.some((c) => !isLayerTwoGoal(c, root))) {
            layoutNonGoalChildren(root, {minChildTop: minTopForOthers});
        }

        const flat = [];
        flattenNodes(root, null, flat);
        enforceBelowParentTree(root);
        resolveGlobalOverlaps(flat);
        enforceBelowParentTree(root);
        const flat2 = [];
        flattenNodes(root, null, flat2);
        resolveGlobalOverlaps(flat2);
        enforceBelowParentTree(root);
    });
    return normalized;
};

export const raw_AIActNodes = [
    {
        "id": "ai-act-compliance",
        "type": "root",
        "position": {
            "x": 16000,
            "y": -2000
        },
        "data": {
            "isHidden": false,
            "label": "AI_Act_Compliance",
            "top": "no"
        },
        "draggable": false,
        "children": [
            {
                "id": "goal-8",
                "type": "goal",
                "position": {
                    "x": 16000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "Goal 8 — Ensure high-risk AI system compliance with AI Act requirements according to intended purpose and state of the art"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "8-1-ensure-compliance-with-section-iii-requirements-art",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "8.1 — Ensure compliance with Section III requirements (Art. 9–15)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "8-2-integrate-risk-management-system-into-compliance-proce",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "8.2 — Integrate risk management system into compliance process"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "8-3-ensure-full-compliance-with-applicable-union-harmonisa",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "8.3 — Ensure full compliance with applicable Union harmonisation legislation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "8-4-integrate-existing-testing-reporting-processes-to-avoi",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "8.4 — Integrate existing testing/reporting processes to avoid duplication"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-8-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 8.1 — Compliance must consider intended purpose of the system → appartiene a GOAL 8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-8-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 8.2 — Compliance must reflect generally acknowledged state of the art → appartiene a GOAL 8",
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-8-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "8-3-ensure-full-compliance-with-applicable-union-harmonisa",
                        "data": {
                            "isHidden": false,
                            "label": "DC 8.3 — If Union harmonisation legislation (Annex I, Section A) applies, provider is fully responsible → appartiene a SUBGOAL 8.3",
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-8-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "8-4-integrate-existing-testing-reporting-processes-to-avoi",
                        "data": {
                            "isHidden": false,
                            "label": "DC 8.4 — Integration of documentation is permitted (not mandatory) → appartiene a SUBGOAL 8.4",
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-8-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "8-4-integrate-existing-testing-reporting-processes-to-avoi",
                        "data": {
                            "isHidden": false,
                            "label": "QC 8.1 — Consistency across applicable regulations → appartiene a SUBGOAL 8.4",
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-8-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "8-4-integrate-existing-testing-reporting-processes-to-avoi",
                        "data": {
                            "isHidden": false,
                            "label": "QC 8.2 — Minimisation of additional compliance burdens → appartiene a SUBGOAL 8.4",
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-8-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "8-4-integrate-existing-testing-reporting-processes-to-avoi",
                        "data": {
                            "isHidden": false,
                            "label": "QC 8.3 — Avoid duplication of documentation/reporting → appartiene a SUBGOAL 8.4",
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-8-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "CF 8.1 — intended_purpose",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-8-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "CF 8.2 — applicable_harmonisation_legislation",
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-8-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-8",
                        "data": {
                            "isHidden": false,
                            "label": "CF 8.3 — state_of_the_art",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-9",
                "type": "goal",
                "position": {
                    "x": 18000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 9 — Establish, implement, document and maintain a risk management system for the high-risk AI system throughout its entire lifecycle"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-9-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
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
                        "position": {
                            "x": -800,
                            "y": 500
                        },
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
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 9.3 — Evaluate risks arising from post-market monitoring data (→ Art. 72)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-9-4",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
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
                        "position": {
                            "x": 400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 800,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.1 — Risk management shall be a continuous iterative process throughout the entire lifecycle → appartiene a GOAL 9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.2 — Risk management shall require regular systematic review and updating → appartiene a GOAL 9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.3 — Risks considered are only those reasonably mitigable through design, development or technical information → appartiene a SUBGOAL 9.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.4 — Risk measures must consider combined effects of all Section III requirements → appartiene a SUBGOAL 9.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.5 — Residual risk (per hazard and overall) must be judged acceptable → appartiene a SUBGOAL 9.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.6 — Risk elimination/reduction must be pursued as far as technically feasible through design → appartiene a SUBGOAL 9.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.7 — Where risks cannot be eliminated, mitigation and control measures must be implemented → appartiene a SUBGOAL 9.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.8 — Information per Art. 13 and deployer training must be provided as risk measure → appartiene a SUBGOAL 9.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.9 — Testing must be performed at any time during development and prior to market placement → appartiene a SUBGOAL 9.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.10 — Testing may include real-world conditions per Art. 60 → appartiene a SUBGOAL 9.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-9-11",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 9.11 — If other Union law requires internal risk management, Art. 9 aspects may be integrated into those procedures → appartiene a GOAL 9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.1 — Risk management measures must minimise risks effectively while maintaining appropriate balance → appartiene a SUBGOAL 9.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.2 — Testing must ensure consistent performance for intended purpose → appartiene a SUBGOAL 9.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-5",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.3 — Testing must be carried out against pre-defined metrics and probabilistic thresholds appropriate to intended purpose → appartiene a SUBGOAL 9.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-9-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-9-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 9.4 — Deployer's technical knowledge, experience, education and context must be considered in risk measures → appartiene a SUBGOAL 9.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.1 — lifecycle_stage — in quale fase si trova il sistema (sviluppo, pre-market, post-market)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.2 — foreseeable_misuse_scenarios — scenari di uso improprio ragionevolmente prevedibili",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.3 — vulnerable_groups_exposure — il sistema è esposto a minori o altri gruppi vulnerabili",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.4 — existing_union_risk_management — esistono già procedure di risk management sotto altra normativa UE (es. MDR)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-9-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-9",
                        "data": {
                            "isHidden": false,
                            "label": "CF 9.5 — deployer_profile — livello tecnico, formazione ed esperienza attesa del deployer",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-10",
                "type": "goal",
                "position": {
                    "x": 20000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 10 — Ensure data governance and quality of training, validation and testing datasets for the high-risk AI system"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-10-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
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
                        "position": {
                            "x": -800,
                            "y": 500
                        },
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
                        "position": {
                            "x": -400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 500
                        },
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
                        "position": {
                            "x": 400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 800,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.1 — Data governance practices must cover: design choices, data collection, origin, preparation operations (annotation, labelling, cleaning, enrichment, aggregation) → appartiene a SUBGOAL 10.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.2 — Formulation of assumptions about what data measures and represents must be documented → appartiene a SUBGOAL 10.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.3 — Availability, quantity and suitability of datasets must be assessed → appartiene a SUBGOAL 10.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.4 — Biases likely to affect health, safety, fundamental rights or leading to discrimination must be examined → appartiene a SUBGOAL 10.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.5 — Special categories of personal data may be processed only if bias correction cannot be fulfilled by other data (including synthetic or anonymised) → appartiene a SUBGOAL 10.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.6 — Special categories of personal data must not be transmitted, transferred or accessed by other parties → appartiene a SUBGOAL 10.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.7 — Special categories of personal data must be deleted once bias is corrected or retention period ends (whichever comes first) → appartiene a SUBGOAL 10.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.8 — Records of processing activities must document why special category data was strictly necessary → appartiene a SUBGOAL 10.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-10-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "DC 10.9 — For AI systems not using model training, paragraphs 2–5 apply only to testing datasets → appartiene a GOAL 10",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.1 — Datasets must have appropriate statistical properties, including regarding persons or groups the system is intended for → appartiene a SUBGOAL 10.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.2 — Dataset characteristics may be met at individual dataset level or combination thereof → appartiene a SUBGOAL 10.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.3 — Special categories of personal data must be subject to state-of-the-art security and privacy-preserving measures including pseudonymisation → appartiene a SUBGOAL 10.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.4 — Access to special categories of personal data must be strictly controlled, documented and limited to authorised persons with confidentiality obligations → appartiene a SUBGOAL 10.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-10-5",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-10-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 10.5 — Technical limitations on re-use of special category personal data must be applied → appartiene a SUBGOAL 10.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.1 — training_technique — il sistema usa tecniche di training su modelli o no (cambia applicabilità paragrafi 2–5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.2 — data_origin — provenienza dei dati (es. cartelle cliniche, immagini diagnostiche) e scopo originale della raccolta",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.3 — special_category_data_used — il sistema tratta categorie speciali di dati personali (es. dati sanitari)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.4 — deployment_context — setting geografico, contestuale, comportamentale o funzionale specifico",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-10-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-10",
                        "data": {
                            "isHidden": false,
                            "label": "CF 10.5 — target_population — caratteristiche delle persone o gruppi su cui il sistema è usato (es. pazienti oncologici)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-11",
                "type": "goal",
                "position": {
                    "x": 22000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 11 — Draw up, maintain and keep up-to-date technical documentation for the high-risk AI system before market placement or service deployment"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-11-1",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 11.1 — Demonstrate compliance with Section III requirements through technical documentation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-11-2",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 11.2 — Provide national competent authorities and notified bodies with clear and comprehensive compliance information"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-11-3",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 11.3 — Include all elements specified in Annex IV in the technical documentation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-11-4",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 11.4 — Draw up a single set of technical documentation when Union harmonisation legislation (Annex I, Section A) also applies"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-11-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 11.1 — Technical documentation must be drawn up before market placement or service deployment → appartiene a GOAL 11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-11-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 11.2 — Technical documentation must be kept up-to-date throughout the lifecycle → appartiene a GOAL 11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-11-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-11-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 11.3 — Documentation must contain at minimum the elements of Annex IV → appartiene a SUBGOAL 11.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-11-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-11-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 11.4 — Where Union harmonisation legislation also applies, a single set of documentation must cover all requirements → appartiene a SUBGOAL 11.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-11-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-11-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 11.5 — SMEs and start-ups may provide Annex IV elements in simplified form using Commission-established form → appartiene a SUBGOAL 11.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-11-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-11-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 11.6 — Notified bodies must accept the simplified form for conformity assessment purposes → appartiene a SUBGOAL 11.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-11-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-11-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 11.1 — Documentation must be clear and comprehensive → appartiene a SUBGOAL 11.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-11-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-11-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 11.2 — Documentation must be sufficient for authorities to assess compliance → appartiene a SUBGOAL 11.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-11-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "CF 11.1 — provider_size — il provider è SME/startup (cambia forma della documentazione richiesta)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-11-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "CF 11.2 — market_placement_stage — il sistema è pre-market o già in servizio",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-11-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-11",
                        "data": {
                            "isHidden": false,
                            "label": "CF 11.3 — harmonisation_legislation_applicable — si applica anche normativa Annex I Section A (es. MDR)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-12",
                "type": "goal",
                "position": {
                    "x": 24000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 12 — Ensure automatic logging of events throughout the lifetime of the high-risk AI system"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-12-1",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 12.1 — Enable recording of events relevant for risk identification and substantial modifications (→ Art. 79(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-12-2",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 12.2 — Enable recording of events relevant for post-market monitoring (→ Art. 72)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-12-3",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 12.3 — Enable recording of events relevant for monitoring system operation (→ Art. 26(5))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-12-4",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 12.4 — For Annex III point 1(a) systems: ensure minimum logging requirements are met"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-12-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "DC 12.1 — Logging must be technically built into the system (automatic, not manual) → appartiene a GOAL 12",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-12-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "DC 12.2 — Logging must cover the entire lifetime of the system → appartiene a GOAL 12",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-12-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-12-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 12.3 — For Annex III point 1(a) systems, logs must record at minimum: start/end date and time of each use → appartiene a SUBGOAL 12.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-12-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-12-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 12.4 — For Annex III point 1(a) systems, logs must record the reference database against which input data was checked → appartiene a SUBGOAL 12.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-12-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-12-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 12.5 — For Annex III point 1(a) systems, logs must record input data for which search led to a match → appartiene a SUBGOAL 12.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-12-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-12-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 12.6 — For Annex III point 1(a) systems, logs must record identification of natural persons involved in results verification (→ Art. 14(5)) → appartiene a SUBGOAL 12.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-12-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "QC 12.1 — Logging capabilities must ensure a level of traceability appropriate to the intended purpose → appartiene a GOAL 12",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-12-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "CF 12.1 — annex_III_point_1a — il sistema rientra nel punto 1(a) dell'Annex III (cambia i requisiti minimi di logging)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-12-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "CF 12.2 — system_lifetime_stage — fase del ciclo di vita in cui si trova il sistema (sviluppo, deployment, post-market)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-12-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-12",
                        "data": {
                            "isHidden": false,
                            "label": "CF 12.3 — human_verification_involved — il sistema prevede verifica umana dei risultati (→ Art. 14(5))",
                             
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
                "position": {
                    "x": 26000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 13 — Ensure sufficient transparency of high-risk AI system to enable deployers to interpret output and use it appropriately"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-13-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
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
                        "position": {
                            "x": -800,
                            "y": 500
                        },
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
                        "position": {
                            "x": -400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 500
                        },
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
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.5 — Document human oversight measures (→ Art. 14)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-13-6",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
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
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 13.7 — Describe mechanisms for deployers to collect, store and interpret logs (→ Art. 12)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.1 — Transparency must be ensured by design and development → appartiene a GOAL 13",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.2 — Instructions for use must be in appropriate digital format or otherwise → appartiene a SUBGOAL 13.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.3 — Instructions must include identity and contact details of provider and authorised representative → appartiene a SUBGOAL 13.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.4 — Instructions must include intended purpose of the system → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.5 — Instructions must include level of accuracy, metrics, robustness and cybersecurity as tested and validated → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.6 — Instructions must include known/foreseeable circumstances leading to risks to health, safety or fundamental rights (→ Art. 9(2)) → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.7 — Instructions must include technical capabilities for explainability of output where applicable → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.8 — Instructions must include performance regarding specific persons or groups where appropriate → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.9 — Instructions must include input data specifications and training/validation/testing dataset information where relevant → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.10 — Instructions must include information to enable deployers to interpret output appropriately → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-11",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.11 — Instructions must include predetermined changes to system and performance identified at initial conformity assessment → appartiene a SUBGOAL 13.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-12",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.12 — Instructions must include human oversight measures and technical measures for output interpretation (→ Art. 14) → appartiene a SUBGOAL 13.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-13",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.13 — Instructions must include computational/hardware requirements, expected lifetime and maintenance measures including software update frequency → appartiene a SUBGOAL 13.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-13-14",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "DC 13.14 — Instructions must describe log collection, storage and interpretation mechanisms (→ Art. 12) where relevant → appartiene a SUBGOAL 13.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-13-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 13.1 — Instructions must be concise, complete, correct and clear → appartiene a SUBGOAL 13.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-13-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-13-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 13.2 — Instructions must be relevant, accessible and comprehensible to deployers → appartiene a SUBGOAL 13.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-13-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "QC 13.3 — Transparency must be appropriate in type and degree to the system's intended purpose → appartiene a GOAL 13",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.1 — explainability_capability — il sistema ha capacità tecniche di spiegare il proprio output",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.2 — target_deployer_profile — caratteristiche e competenze attese del deployer (es. medico radiologo)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.3 — predetermined_changes — sono state predeterminate modifiche al sistema al momento della conformity assessment",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-13-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-13",
                        "data": {
                            "isHidden": false,
                            "label": "CF 13.4 — specific_population_performance — il sistema ha performance differenziate per specifici gruppi di persone",
                             
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
                "position": {
                    "x": 28000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 14 — Ensure effective human oversight of high-risk AI system during its use through appropriate design and measures"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-14-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
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
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
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
                        "position": {
                            "x": -800,
                            "y": 500
                        },
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
                        "position": {
                            "x": -400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 500
                        },
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
                        "position": {
                            "x": 400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 800,
                            "y": 500
                        },
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
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.1 — Human oversight must be ensured by design, including through appropriate human-machine interface tools → appartiene a GOAL 14",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.2 — Oversight measures must be built into the system when technically feasible, before market placement → appartiene a SUBGOAL 14.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.3 — Oversight measures must be identified before market placement and appropriate for deployer implementation → appartiene a SUBGOAL 14.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.4 — System must be provided to deployer in a way that enables assigned natural persons to monitor operation including anomalies, dysfunctions and unexpected performance → appartiene a SUBGOAL 14.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.5 — System must provide means for oversight persons to correctly interpret output using available interpretation tools → appartiene a SUBGOAL 14.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.6 — Oversight persons must be able in any situation to decide not to use the system or override its output → appartiene a SUBGOAL 14.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.7 — System must include a stop button or similar procedure allowing safe halt → appartiene a SUBGOAL 14.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.8 — For Annex III point 1(a) systems: no action or decision shall be taken unless identification is separately verified and confirmed by at least two competent natural persons → appartiene a SUBGOAL 14.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-14-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 14.9 — Dual verification requirement for Annex III point 1(a) does not apply to law enforcement, migration, border control or asylum where Union or national law deems it disproportionate → appartiene a SUBGOAL 14.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-14",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.1 — Oversight measures must be commensurate with risks, level of autonomy and context of use → appartiene a GOAL 14",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-3",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.2 — Oversight measures must be appropriate and proportionate to the role of the natural person assigned → appartiene a SUBGOAL 14.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.3 — Oversight persons must be made aware of automation bias risk, particularly where system provides recommendations for human decisions → appartiene a SUBGOAL 14.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-14-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-14-8",
                        "data": {
                            "isHidden": false,
                            "label": "QC 14.4 — Dual verification persons must have necessary competence, training and authority → appartiene a SUBGOAL 14.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-14-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
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
                "position": {
                    "x": 30000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 15 — Ensure appropriate level of accuracy, robustness and cybersecurity of the high-risk AI system consistently throughout its lifecycle"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-15-1",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
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
                        "position": {
                            "x": -400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 500
                        },
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
                        "position": {
                            "x": 400,
                            "y": 500
                        },
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
                        "position": {
                            "x": 800,
                            "y": 500
                        },
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
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.1 — Accuracy, robustness and cybersecurity must be achieved by design and development → appartiene a GOAL 15",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.2 — Levels of accuracy and relevant accuracy metrics must be declared in instructions for use → appartiene a SUBGOAL 15.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.3 — Technical and organisational measures must be taken to address resilience against errors, faults and inconsistencies → appartiene a SUBGOAL 15.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.4 — Systems that continue to learn post-deployment must eliminate or reduce risk of biased outputs influencing future inputs (feedback loops) → appartiene a SUBGOAL 15.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.5 — Feedback loops must be addressed with appropriate mitigation measures → appartiene a SUBGOAL 15.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-15-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 15.6 — Technical solutions for cybersecurity must include where appropriate measures against: data poisoning, model poisoning, adversarial examples/model evasion, confidentiality attacks, model flaws → appartiene a SUBGOAL 15.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.1 — Performance must be consistent throughout the entire lifecycle → appartiene a GOAL 15",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.2 — Robustness must be as high as possible regarding errors, faults or inconsistencies → appartiene a SUBGOAL 15.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.3 — Redundancy solutions (backup, fail-safe) may be used to achieve robustness → appartiene a SUBGOAL 15.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.4 — Cybersecurity technical solutions must be appropriate to relevant circumstances and risks → appartiene a SUBGOAL 15.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-15-5",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-15-3",
                        "data": {
                            "isHidden": false,
                            "label": "QC 15.5 — Feedback loop risk must be eliminated or reduced as far as possible → appartiene a SUBGOAL 15.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.1 — continuous_learning — il sistema continua ad apprendere dopo il deployment (cambia requisiti su feedback loops)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.2 — accuracy_metrics_defined — sono già definite metriche di accuratezza specifiche per il sistema (es. sensibilità/specificità per diagnosi oncologica)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.3 — cybersecurity_threat_profile — tipologia di minacce cyber rilevanti per il contesto di deployment",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-15-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-15",
                        "data": {
                            "isHidden": false,
                            "label": "CF 15.4 — interaction_type — il sistema interagisce con persone naturali o altri sistemi (influenza requisiti di robustezza)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-16",
                "type": "goal",
                "position": {
                    "x": 32000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 16 — Fulfil all provider obligations for high-risk AI systems throughout their lifecycle"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-16-1",
                        "type": "subgoal",
                        "position": {
                            "x": -2400,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.1 — Ensure system compliance with Section 2 technical requirements (→ Art. 8–15)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-2",
                        "type": "subgoal",
                        "position": {
                            "x": -2000,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.2 — Indicate provider identity and contact details on system, packaging or documentation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-3",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.3 — Establish and maintain a quality management system (→ Art. 17)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-4",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.4 — Keep required documentation (→ Art. 18)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-5",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.5 — Keep automatically generated logs when under provider control (→ Art. 19)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-6",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.6 — Ensure conformity assessment procedure before market placement (→ Art. 43)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-7",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.7 — Draw up EU declaration of conformity (→ Art. 47)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-8",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.8 — Affix CE marking to system, packaging or documentation (→ Art. 48)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-9",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.9 — Comply with registration obligations (→ Art. 49(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-10",
                        "type": "subgoal",
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.10 — Take corrective actions and provide information when required (→ Art. 20)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-11",
                        "type": "subgoal",
                        "position": {
                            "x": 1600,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.11 — Demonstrate conformity to national competent authority upon reasoned request"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-16-12",
                        "type": "subgoal",
                        "position": {
                            "x": 2000,
                            "y": 500
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 16.12 — Ensure compliance with accessibility requirements (→ Directives 2016/2102 and 2019/882)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.1 — Provider identity (name, trade name/mark, contact address) must be indicated on system, packaging or documentation → appartiene a SUBGOAL 16.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.2 — Quality management system must comply with Art. 17 → appartiene a SUBGOAL 16.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.3 — Logs must be kept only when under provider control → appartiene a SUBGOAL 16.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.4 — Conformity assessment must be completed prior to market placement or service deployment → appartiene a SUBGOAL 16.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.5 — EU declaration of conformity must be drawn up per Art. 47 → appartiene a SUBGOAL 16.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.6 — CE marking must be affixed per Art. 48 → appartiene a SUBGOAL 16.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.7 — Registration obligations per Art. 49(1) must be fulfilled → appartiene a SUBGOAL 16.9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-10",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.8 — Corrective actions must be taken and information provided per Art. 20 → appartiene a SUBGOAL 16.10",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.9 — Conformity must be demonstrable to national competent authority upon reasoned request → appartiene a SUBGOAL 16.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-16-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-12",
                        "data": {
                            "isHidden": false,
                            "label": "DC 16.10 — System must comply with accessibility requirements per Directives 2016/2102 and 2019/882 → appartiene a SUBGOAL 16.12",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-16-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-10",
                        "data": {
                            "isHidden": false,
                            "label": "QC 16.1 — Corrective actions must be necessary and proportionate to the non-conformity identified → appartiene a SUBGOAL 16.10",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-16-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-16-11",
                        "data": {
                            "isHidden": false,
                            "label": "QC 16.2 — Demonstration of conformity must be provided upon reasoned request (not arbitrary) → appartiene a SUBGOAL 16.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-16-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "CF 16.1 — provider_control_of_logs — i log sono sotto il controllo del provider o del deployer",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-16-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "CF 16.2 — market_placement_type — il sistema è messo sul mercato o messo in servizio (cambia timing degli obblighi)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-16-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "CF 16.3 — accessibility_requirements_applicable — il sistema è soggetto ai requisiti di accessibilità delle Direttive 2016/2102 e 2019/882",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-16-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-16",
                        "data": {
                            "isHidden": false,
                            "label": "CF 16.4 — conformity_assessment_type — quale procedura di conformity assessment si applica (→ Art. 43)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-17",
                "type": "goal",
                "position": {
                    "x": 34000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 17 — Establish, document and maintain a quality management system ensuring compliance with AI Act for high-risk AI systems"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-17-1",
                        "type": "subgoal",
                        "position": {
                            "x": -2400,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.1 — Define and implement a regulatory compliance strategy including conformity assessment and modification management"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-2",
                        "type": "subgoal",
                        "position": {
                            "x": -2000,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.2 — Establish techniques and procedures for design, design control and design verification"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-3",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.3 — Establish techniques and procedures for development, quality control and quality assurance"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-4",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.4 — Define and execute examination, test and validation procedures throughout development lifecycle"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-5",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.5 — Apply technical specifications and standards ensuring Section 2 compliance"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-6",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.6 — Establish systems and procedures for full data management lifecycle"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-7",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.7 — Integrate risk management system (→ Art. 9)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-8",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.8 — Set up, implement and maintain post-market monitoring system (→ Art. 72)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-9",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.9 — Establish procedures for serious incident reporting (→ Art. 73)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-10",
                        "type": "subgoal",
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.10 — Establish communication procedures with competent authorities, notified bodies and other stakeholders"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-11",
                        "type": "subgoal",
                        "position": {
                            "x": 1600,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.11 — Establish systems and procedures for record-keeping of all relevant documentation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-12",
                        "type": "subgoal",
                        "position": {
                            "x": 2000,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.12 — Establish resource management including security-of-supply measures"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-17-13",
                        "type": "subgoal",
                        "position": {
                            "x": 2400,
                            "y": 500
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 17.13 — Define accountability framework for management and staff responsibilities"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.1 — QMS must be documented in written policies, procedures and instructions in a systematic and orderly manner → appartiene a GOAL 17",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.2 — Regulatory compliance strategy must include conformity assessment procedures and modification management → appartiene a SUBGOAL 17.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.3 — Test and validation procedures must specify frequency of execution → appartiene a SUBGOAL 17.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.4 — Where harmonised standards are not fully applied, alternative means to ensure Section 2 compliance must be documented → appartiene a SUBGOAL 17.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.5 — Data management systems must cover: acquisition, collection, analysis, labelling, storage, filtration, mining, aggregation, retention and all pre-market operations → appartiene a SUBGOAL 17.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.6 — Risk management system per Art. 9 must be integrated into QMS → appartiene a SUBGOAL 17.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.7 — Post-market monitoring system must be set up, implemented and maintained per Art. 72 → appartiene a SUBGOAL 17.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.8 — Serious incident reporting procedures must comply with Art. 73 → appartiene a SUBGOAL 17.9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.9 — Providers subject to sectoral Union law QMS obligations may integrate Art. 17 aspects into existing QMS → appartiene a GOAL 17",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-17-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "DC 17.10 — Financial institutions subject to Union financial services law internal governance rules are deemed compliant with QMS obligations except Art. 17(1)(g)(h)(i) → appartiene a GOAL 17",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-17-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "QC 17.1 — QMS implementation must be proportionate to the size of the provider organisation → appartiene a GOAL 17",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-17-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "QC 17.2 — Degree of rigour and level of protection must be sufficient to ensure AI Act compliance regardless of organisation size → appartiene a GOAL 17",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-17-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-17-13",
                        "data": {
                            "isHidden": false,
                            "label": "QC 17.3 — Accountability framework must clearly set out responsibilities for all QMS aspects across management and staff → appartiene a SUBGOAL 17.13",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-17-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "CF 17.1 — provider_organisation_size — dimensione del provider (influenza proporzionalità dell'implementazione QMS)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-17-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "CF 17.2 — sectoral_union_law_qms — il provider è già soggetto a obblighi QMS sotto altra normativa UE settoriale (es. MDR)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-17-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "CF 17.3 — financial_institution — il provider è un'istituzione finanziaria soggetta a Union financial services law",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-17-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "CF 17.4 — harmonised_standards_applicable — esistono standard armonizzati applicabili e se sono applicati in pieno",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-17-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-17",
                        "data": {
                            "isHidden": false,
                            "label": "CF 17.5 — post_market_phase — il sistema è già in fase post-market (attiva SUBGOAL 17.8 e 17.9)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-18",
                "type": "goal",
                "position": {
                    "x": 36000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 18 — Retain and keep at disposal of national competent authorities all required documentation for 10 years after market placement or service deployment"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-18-1",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 18.1 — Retain technical documentation (→ Art. 11)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-18-2",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 18.2 — Retain quality management system documentation (→ Art. 17)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-18-3",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 18.3 — Retain documentation of changes approved by notified bodies where applicable"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-18-4",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 18.4 — Retain decisions and documents issued by notified bodies where applicable"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-18-5",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 18.5 — Retain EU declaration of conformity (→ Art. 47)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-18-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "DC 18.1 — All documentation must be kept for 10 years after market placement or service deployment → appartiene a GOAL 18",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-18-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "DC 18.2 — Documentation must be kept at disposal of national competent authorities throughout the retention period → appartiene a GOAL 18",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-18-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "DC 18.3 — Member States must determine conditions for documentation availability in case of provider bankruptcy or cessation of activity → appartiene a GOAL 18",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-18-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-18-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 18.4 — Financial institutions subject to Union financial services law must maintain technical documentation as part of documentation kept under that law → appartiene a SUBGOAL 18.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-18-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "QC 18.1 — Documentation must remain accessible and retrievable throughout the entire 10-year retention period → appartiene a GOAL 18",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-18-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "QC 18.2 — Continuity of documentation availability must be ensured even in case of bankruptcy or cessation of activity → appartiene a GOAL 18",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-18-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "CF 18.1 — notified_body_involved — è coinvolto un notified body nel processo di conformity assessment (attiva SUBGOAL 18.3 e 18.4)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-18-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "CF 18.2 — financial_institution — il provider è soggetto a Union financial services law (cambia modalità di retention)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-18-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "CF 18.3 — market_placement_date — data di prima messa sul mercato o in servizio (determina scadenza dei 10 anni)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-18-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-18",
                        "data": {
                            "isHidden": false,
                            "label": "CF 18.4 — provider_continuity_risk — rischio di interruzione dell'attività del provider prima dei 10 anni",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-19",
                "type": "goal",
                "position": {
                    "x": 38000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 19 — Retain automatically generated logs of high-risk AI system for the required retention period"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-19-1",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-19",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 19.1 — Retain logs generated by the system (→ Art. 12(1)) when under provider control"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-19-2",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-19",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 19.2 — Ensure log retention period is appropriate to intended purpose and at minimum six months"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-19-3",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-19",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 19.3 — For financial institutions: maintain logs as part of financial services law documentation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-19-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-19-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 19.1 — Logs must be kept only to the extent they are under provider control → appartiene a SUBGOAL 19.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-19-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-19-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 19.2 — Minimum log retention period is six months unless Union or national law provides otherwise → appartiene a SUBGOAL 19.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-19-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-19-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 19.3 — Applicable Union or national law on personal data protection may override retention period → appartiene a SUBGOAL 19.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-19-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-19-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 19.4 — Financial institutions must maintain logs as part of documentation under relevant financial services law → appartiene a SUBGOAL 19.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-19-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-19-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 19.1 — Log retention period must be appropriate to the intended purpose of the system, not just the minimum → appartiene a SUBGOAL 19.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-19-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-19",
                        "data": {
                            "isHidden": false,
                            "label": "CF 19.1 — provider_control_of_logs — i log sono sotto il controllo del provider o del deployer (determina applicabilità)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-19-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-19",
                        "data": {
                            "isHidden": false,
                            "label": "CF 19.2 — applicable_data_protection_law — esiste normativa UE o nazionale sulla protezione dei dati personali che modifica il periodo di retention",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-19-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-19",
                        "data": {
                            "isHidden": false,
                            "label": "CF 19.3 — financial_institution — il provider è soggetto a Union financial services law",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-19-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-19",
                        "data": {
                            "isHidden": false,
                            "label": "CF 19.4 — intended_purpose_retention_need — il periodo di retention appropriato in base allo scopo del sistema (es. follow-up oncologico può richiedere retention più lunga)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-20",
                "type": "goal",
                "position": {
                    "x": 40000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 20 — Take immediate corrective action and inform relevant parties when high-risk AI system is not in conformity with AI Act"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-20-1",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 20.1 — Identify non-conformity or reason to consider non-conformity of the system"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-20-2",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 20.2 — Take necessary corrective actions to restore conformity, withdraw, disable or recall the system"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-20-3",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 20.3 — Inform distributors, deployers, authorised representative and importers of non-conformity"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-20-4",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 20.4 — Investigate causes of risk in collaboration with reporting deployer (→ Art. 79(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-20-5",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 20.5 — Inform market surveillance authorities and notified body of non-conformity and corrective actions taken"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-20-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "DC 20.1 — Corrective actions must be taken immediately upon identifying or having reason to consider non-conformity → appartiene a SUBGOAL 20.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-20-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 20.2 — Corrective actions may include: restoring conformity, withdrawal, disabling or recall as appropriate → appartiene a SUBGOAL 20.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-20-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 20.3 — Distributors, deployers, authorised representative and importers must be informed of non-conformity where applicable → appartiene a SUBGOAL 20.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-20-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 20.4 — Where system presents risk per Art. 79(1), provider must immediately investigate causes in collaboration with reporting deployer where applicable → appartiene a SUBGOAL 20.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-20-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 20.5 — Market surveillance authorities competent for the system must be informed immediately of risk per Art. 79(1) → appartiene a SUBGOAL 20.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-20-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 20.6 — Notified body that issued certificate per Art. 44 must be informed where applicable → appartiene a SUBGOAL 20.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-20-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 20.7 — Information to authorities must include nature of non-conformity and relevant corrective actions taken → appartiene a SUBGOAL 20.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-20-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 20.1 — Investigation of causes must be immediate upon becoming aware of risk → appartiene a SUBGOAL 20.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-20-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 20.2 — Corrective actions must be appropriate to the nature and severity of the non-conformity → appartiene a SUBGOAL 20.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-20-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-20-3",
                        "data": {
                            "isHidden": false,
                            "label": "QC 20.3 — Communication to all relevant parties must be timely and complete → appartiene a SUBGOAL 20.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-20-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "CF 20.1 — notified_body_certificate — è stato emesso un certificato da un notified body per il sistema (→ Art. 44)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-20-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "CF 20.2 — risk_identified — è stato identificato un rischio ai sensi dell'Art. 79(1)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-20-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "CF 20.3 — reporting_deployer_exists — esiste un deployer che ha segnalato il problema",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-20-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "CF 20.4 — distribution_chain — esistono distributori, importatori o rappresentanti autorizzati nella catena di distribuzione",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-20-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-20",
                        "data": {
                            "isHidden": false,
                            "label": "CF 20.5 — corrective_action_type — tipo di azione correttiva necessaria (conformity restoration, withdrawal, disabling, recall)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-21",
                "type": "goal",
                "position": {
                    "x": 42000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 21 — Provide competent authorities with all information, documentation and logs necessary to demonstrate conformity upon reasoned request"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-21-1",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-21",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 21.1 — Provide all information and documentation demonstrating Section 2 compliance upon reasoned request"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-21-2",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-21",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 21.2 — Provide access to automatically generated logs (→ Art. 12(1)) upon reasoned request when under provider control"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-21-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-21",
                        "data": {
                            "isHidden": false,
                            "label": "DC 21.1 — Information and documentation must be provided only upon a reasoned request by competent authority → appartiene a GOAL 21",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-21-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-21-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 21.2 — Information must be provided in a language easily understood by the authority, in one of the official languages of the Union institutions as indicated by the Member State → appartiene a SUBGOAL 21.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-21-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-21-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 21.3 — Log access must be provided only to the extent logs are under provider control → appartiene a SUBGOAL 21.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-21-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-21",
                        "data": {
                            "isHidden": false,
                            "label": "DC 21.4 — Information obtained by competent authority must be treated per confidentiality obligations (→ Art. 78) → appartiene a GOAL 21",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-21-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-21-1",
                        "data": {
                            "isHidden": false,
                            "label": "QC 21.1 — Documentation provided must be sufficient to demonstrate conformity with all Section 2 requirements → appartiene a SUBGOAL 21.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-21-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-21-1",
                        "data": {
                            "isHidden": false,
                            "label": "QC 21.2 — Language used must be easily understandable by the authority → appartiene a SUBGOAL 21.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-21-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-21",
                        "data": {
                            "isHidden": false,
                            "label": "CF 21.1 — provider_control_of_logs — i log sono sotto controllo del provider (determina applicabilità SUBGOAL 21.2)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-21-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-21",
                        "data": {
                            "isHidden": false,
                            "label": "CF 21.2 — competent_authority_language — lingua ufficiale UE richiesta dall'autorità competente del Member State",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-21-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-21",
                        "data": {
                            "isHidden": false,
                            "label": "CF 21.3 — reasoned_request_received — è stata ricevuta una richiesta motivata da autorità competente",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-22",
                "type": "goal",
                "position": {
                    "x": 44000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 22 — Appoint and enable an authorised representative in the Union for third-country providers before market placement"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-22-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.1 — Appoint authorised representative by written mandate before making system available on Union market"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-22-2",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.2 — Enable authorised representative to perform all mandated tasks"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-22-3",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.3 — Verify EU declaration of conformity, technical documentation and conformity assessment procedure (→ Art. 47, Art. 11)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-22-4",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.4 — Keep required documentation at disposal of competent authorities for 10 years (→ Art. 47, Art. 11, Art. 74(10))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-22-5",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.5 — Provide competent authorities with all information and documentation including logs upon reasoned request (→ Art. 12(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-22-6",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.6 — Cooperate with competent authorities upon reasoned request to reduce and mitigate risks"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-22-7",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.7 — Comply with or ensure correctness of registration obligations (→ Art. 49(1), Annex VIII Section A point 3)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-22-8",
                        "type": "subgoal",
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 22.8 — Terminate mandate and inform authorities if provider acts contrary to AI Act obligations"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.1 — Authorised representative must be appointed by written mandate before market availability in the Union → appartiene a SUBGOAL 22.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.2 — Authorised representative must be established in the Union → appartiene a SUBGOAL 22.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.3 — Copy of mandate must be provided to market surveillance authorities upon request in an official Union language → appartiene a SUBGOAL 22.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.4 — Documentation must be kept for 10 years after market placement or service deployment → appartiene a SUBGOAL 22.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.5 — Documentation to keep includes: provider contact details, EU declaration of conformity, technical documentation, notified body certificate if applicable → appartiene a SUBGOAL 22.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.6 — Log access must be provided only to extent logs are under provider control → appartiene a SUBGOAL 22.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.7 — Authorised representative must terminate mandate if provider acts contrary to AI Act obligations → appartiene a SUBGOAL 22.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.8 — Upon mandate termination, relevant market surveillance authority and notified body must be immediately informed with reasons → appartiene a SUBGOAL 22.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-22-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 22.9 — Mandate must empower authorised representative to be addressed by competent authorities in addition to or instead of provider → appartiene a SUBGOAL 22.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-22-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-5",
                        "data": {
                            "isHidden": false,
                            "label": "QC 22.1 — Information and documentation provided to authorities must be sufficient to demonstrate Section 2 conformity → appartiene a SUBGOAL 22.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-22-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 22.2 — Cooperation with authorities must be effective in reducing and mitigating risks → appartiene a SUBGOAL 22.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-22-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-22-8",
                        "data": {
                            "isHidden": false,
                            "label": "QC 22.3 — Termination of mandate must be immediate upon identifying provider non-compliance → appartiene a SUBGOAL 22.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-22-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "CF 22.1 — provider_location — il provider è stabilito in un paese terzo (attiva GOAL 22 intero)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-22-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "CF 22.2 — notified_body_certificate — è stato emesso un certificato da notified body (attiva DC 22.5 per il certificato)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-22-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "CF 22.3 — provider_control_of_logs — i log sono sotto controllo del provider (determina applicabilità SUBGOAL 22.5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-22-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-22",
                        "data": {
                            "isHidden": false,
                            "label": "CF 22.4 — registration_carried_out_by — la registrazione è effettuata dal provider stesso o dall'authorised representative",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-23",
                "type": "goal",
                "position": {
                    "x": 46000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 23 — Fulfil all importer obligations to ensure conformity of high-risk AI system before and after market placement"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-23-1",
                        "type": "subgoal",
                        "position": {
                            "x": -2000,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.1 — Verify conformity assessment procedure has been carried out by provider (→ Art. 43)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-2",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.2 — Verify technical documentation has been drawn up per Art. 11 and Annex IV"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-3",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.3 — Verify CE marking, EU declaration of conformity and instructions for use are present (→ Art. 47)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-4",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.4 — Verify provider has appointed authorised representative (→ Art. 22(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-5",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.5 — Withhold non-conforming or falsified systems from market until conformity is restored"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-6",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.6 — Inform provider, authorised representative and market surveillance authorities of risk (→ Art. 79(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-7",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.7 — Indicate importer identity and contact details on system, packaging or documentation"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-8",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.8 — Ensure storage and transport conditions do not jeopardise Section 2 compliance"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-9",
                        "type": "subgoal",
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.9 — Retain certificate, instructions for use and EU declaration of conformity for 10 years"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-10",
                        "type": "subgoal",
                        "position": {
                            "x": 1600,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.10 — Provide competent authorities with all information and documentation upon reasoned request"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-23-11",
                        "type": "subgoal",
                        "position": {
                            "x": 2000,
                            "y": 500
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 23.11 — Cooperate with competent authorities to reduce and mitigate risks"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.1 — All four conformity verifications (SUBGOAL 23.1–23.4) must be completed before market placement → appartiene a GOAL 23",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.2 — Non-conforming or falsified systems must not be placed on market until conformity is restored → appartiene a SUBGOAL 23.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.3 — Where system presents risk per Art. 79(1), provider, authorised representative and market surveillance authorities must be informed → appartiene a SUBGOAL 23.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.4 — Importer identity must be indicated on system, packaging or accompanying documentation where applicable → appartiene a SUBGOAL 23.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.5 — Storage and transport conditions must not jeopardise Section 2 compliance while system is under importer responsibility → appartiene a SUBGOAL 23.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.6 — Retention period for certificate, instructions for use and EU declaration of conformity is 10 years after market placement or service deployment → appartiene a SUBGOAL 23.9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.7 — Certificate from notified body must be retained where applicable → appartiene a SUBGOAL 23.9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-10",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.8 — Information provided to authorities must include documentation referred to in paragraph 5 → appartiene a SUBGOAL 23.10",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-23-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-10",
                        "data": {
                            "isHidden": false,
                            "label": "DC 23.9 — Technical documentation must be made available to competent authorities → appartiene a SUBGOAL 23.10",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-23-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "QC 23.1 — Information and documentation provided to authorities must be in a language easily understood by them → appartiene a SUBGOAL 23.10",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-23-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-11",
                        "data": {
                            "isHidden": false,
                            "label": "QC 23.2 — Documentation must be sufficient to demonstrate Section 2 conformity → appartiene a SUBGOAL 23.10",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-23-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-11",
                        "data": {
                            "isHidden": false,
                            "label": "QC 23.3 — Cooperation with authorities must be effective in reducing and mitigating risks → appartiene a SUBGOAL 23.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-23-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-23-8",
                        "data": {
                            "isHidden": false,
                            "label": "QC 23.4 — Storage and transport conditions must be actively monitored throughout importer responsibility period → appartiene a SUBGOAL 23.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-23-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "CF 23.1 — importer_role — esiste un importer nella catena di distribuzione (attiva GOAL 23 intero)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-23-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "CF 23.2 — notified_body_certificate — è stato emesso un certificato da notified body (attiva DC 23.7)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-23-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "CF 23.3 — risk_identified — è stato identificato un rischio ai sensi Art. 79(1) (attiva SUBGOAL 23.6)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-23-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "CF 23.4 — storage_transport_required — il sistema richiede condizioni specifiche di stoccaggio o trasporto",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-23-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-23",
                        "data": {
                            "isHidden": false,
                            "label": "CF 23.5 — falsified_documentation_suspected — esistono ragioni per considerare documentazione falsificata (attiva SUBGOAL 23.5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-24",
                "type": "goal",
                "position": {
                    "x": 48000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 24 — Fulfil all distributor obligations to ensure conformity of high-risk AI system before and after market availability"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-24-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.1 — Verify CE marking, EU declaration of conformity, instructions for use and provider/importer obligations before market availability (→ Art. 47, Art. 16(b)(c), Art. 23(3))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-24-2",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.2 — Withhold non-conforming systems from market until conformity is restored"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-24-3",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.3 — Inform provider or importer of risk when system presents risk (→ Art. 79(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-24-4",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.4 — Ensure storage and transport conditions do not jeopardise Section 2 compliance"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-24-5",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.5 — Take corrective actions or ensure provider/importer/operator takes corrective actions for non-conforming systems"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-24-6",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.6 — Inform provider or importer and competent authorities immediately of risk and corrective actions taken (→ Art. 79(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-24-7",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.7 — Provide competent authorities with all information and documentation upon reasoned request"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-24-8",
                        "type": "subgoal",
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 24.8 — Cooperate with competent authorities to reduce and mitigate risks"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-24-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 24.1 — Verification of CE marking, EU declaration of conformity, instructions for use and provider/importer obligations must be completed before market availability → appartiene a SUBGOAL 24.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-24-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 24.2 — Non-conforming systems must not be made available on market until conformity is restored → appartiene a SUBGOAL 24.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-24-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 24.3 — Where system presents risk per Art. 79(1), provider or importer must be informed → appartiene a SUBGOAL 24.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-24-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 24.4 — Storage and transport conditions must not jeopardise Section 2 compliance while under distributor responsibility → appartiene a SUBGOAL 24.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-24-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 24.5 — Corrective actions may include: restoring conformity, withdrawal or recall → appartiene a SUBGOAL 24.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-24-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 24.6 — Where system presents risk per Art. 79(1), provider or importer and competent authorities must be immediately informed with details of non-compliance and corrective actions → appartiene a SUBGOAL 24.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-24-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 24.7 — Information provided to authorities must cover all actions pursuant to paragraphs 1–4 → appartiene a SUBGOAL 24.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-24-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-7",
                        "data": {
                            "isHidden": false,
                            "label": "QC 24.1 — Information to competent authorities must be sufficient to demonstrate Section 2 conformity → appartiene a SUBGOAL 24.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-24-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 24.2 — Notification to provider/importer and authorities must be immediate where risk is identified → appartiene a SUBGOAL 24.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-24-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-8",
                        "data": {
                            "isHidden": false,
                            "label": "QC 24.3 — Cooperation with authorities must be effective in reducing and mitigating risks → appartiene a SUBGOAL 24.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-24-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-24-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 24.4 — Storage and transport conditions must be actively monitored throughout distributor responsibility period → appartiene a SUBGOAL 24.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-24-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "CF 24.1 — distributor_role — esiste un distributor nella catena di distribuzione (attiva GOAL 24 intero)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-24-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "CF 24.2 — risk_identified — è stato identificato un rischio ai sensi Art. 79(1) (attiva SUBGOAL 24.3 e 24.6)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-24-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "CF 24.3 — non_conformity_identified — il distributor ha ragione di considerare il sistema non conforme (attiva SUBGOAL 24.2 e 24.5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-24-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "CF 24.4 — storage_transport_required — il sistema richiede condizioni specifiche di stoccaggio o trasporto",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-24-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-24",
                        "data": {
                            "isHidden": false,
                            "label": "CF 24.5 — importer_in_chain — esiste un importer nella catena (determina a chi va indirizzata la comunicazione)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-25",
                "type": "goal",
                "position": {
                    "x": 50000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 25 — Correctly identify provider role and establish obligations when distributor, importer, deployer or third party assumes provider responsibilities"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-25-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 25.1 — Assume provider obligations when own name or trademark is affixed to system already on market (→ Art. 16)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-25-2",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 25.2 — Assume provider obligations when substantial modification is made to system already on market (→ Art. 6)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-25-3",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 25.3 — Assume provider obligations when intended purpose is modified causing system to become high-risk (→ Art. 6)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-25-4",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 25.4 — Ensure initial provider cooperates with and supports new provider upon role transfer"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-25-5",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 25.5 — Identify product manufacturer as provider when high-risk AI system is safety component of product under Annex I Section A"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-25-6",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 25.6 — Establish written agreement with third party suppliers of AI tools, services, components or processes integrated in high-risk AI system"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.1 — Affixing own name or trademark to system already on market triggers full provider obligations per Art. 16 → appartiene a SUBGOAL 25.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.2 — Substantial modification triggering continued high-risk classification per Art. 6 transfers provider obligations → appartiene a SUBGOAL 25.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.3 — Modification of intended purpose causing high-risk classification per Art. 6 transfers provider obligations → appartiene a SUBGOAL 25.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.4 — Initial provider ceases to be considered provider upon role transfer → appartiene a SUBGOAL 25.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.5 — Initial provider must make available necessary information, technical access and assistance to new provider → appartiene a SUBGOAL 25.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.6 — DC 25.5 does not apply if initial provider has clearly specified system is not to be changed into high-risk → appartiene a SUBGOAL 25.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.7 — Product manufacturer is considered provider when high-risk AI system is placed on market or put into service under manufacturer name or trademark → appartiene a SUBGOAL 25.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.8 — Written agreement with third party suppliers must specify: necessary information, capabilities, technical access and other assistance → appartiene a SUBGOAL 25.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.9 — Written agreement obligation does not apply to third parties making available tools/services/processes/components under free and open-source licence (excluding GPAI models) → appartiene a SUBGOAL 25.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-25-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "DC 25.10 — Intellectual property rights, confidential business information and trade secrets must be observed and protected throughout role transfers → appartiene a GOAL 25",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-25-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 25.1 — Information, technical access and assistance provided by initial provider must be reasonably expected and sufficient for new provider to fulfil AI Act obligations → appartiene a SUBGOAL 25.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-25-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 25.2 — Written agreement with third party must be based on generally acknowledged state of the art → appartiene a SUBGOAL 25.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-25-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-25-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 25.3 — Cooperation between initial and new provider must be close and continuous → appartiene a SUBGOAL 25.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-25-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "CF 25.1 — role_change_trigger — quale evento ha causato il cambio di ruolo (rebranding, substantial modification, purpose change)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-25-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "CF 25.2 — substantial_modification_made — è stata effettuata una modifica sostanziale al sistema (attiva SUBGOAL 25.2)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-25-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "CF 25.3 — intended_purpose_modified — è stato modificato lo scopo del sistema causando classificazione high-risk (attiva SUBGOAL 25.3)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-25-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "CF 25.4 — initial_provider_restriction — il provider iniziale ha esplicitamente specificato che il sistema non deve essere trasformato in high-risk (disattiva DC 25.5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-25-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "CF 25.5 — product_manufacturer_role — il sistema è safety component di prodotto sotto Annex I Section A (attiva SUBGOAL 25.5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-25-6",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "CF 25.6 — third_party_supplier — esistono fornitori terzi di strumenti, servizi, componenti o processi integrati nel sistema",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-25-7",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-25",
                        "data": {
                            "isHidden": false,
                            "label": "CF 25.7 — open_source_licence — il fornitore terzo distribuisce sotto licenza open-source libera (disattiva DC 25.8)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-26",
                "type": "goal",
                "position": {
                    "x": 52000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 26 — Fulfil all deployer obligations to ensure compliant, monitored and transparent use of high-risk AI system"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-26-1",
                        "type": "subgoal",
                        "position": {
                            "x": -2400,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.1 — Use system in accordance with provider instructions for use (→ Art. 13)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-2",
                        "type": "subgoal",
                        "position": {
                            "x": -2000,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.2 — Assign human oversight to competent, trained and authorised natural persons with necessary suppor"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-3",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.3 — Ensure input data is relevant and sufficiently representative when deployer controls input data"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-4",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.4 — Monitor system operation based on instructions for use and inform provider where relevant (→ Art. 72)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-5",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.5 — Inform provider/distributor and market surveillance authority and suspend use upon identifying risk (→ Art. 79(1))"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-6",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.6 — Inform provider immediately and then importer/distributor and market surveillance authorities upon identifying serious incident (→ Art. 73)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-7",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.7 — Keep automatically generated logs for minimum six months when under deployer control"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-8",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.8 — Inform workers' representatives and affected workers before putting system into service at workplace"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-9",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.9 — Comply with registration obligations for public authority deployers and verify system registration before use (→ Art. 49, Art. 71)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-10",
                        "type": "subgoal",
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.10 — Use Art. 13 information to carry out data protection impact assessment where applicable (→ Art. 35 GDPR, Art. 27 Directive 2016/680)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-11",
                        "type": "subgoal",
                        "position": {
                            "x": 1600,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.11 — Request prior authorisation for post-remote biometric identification use in criminal investigations"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-12",
                        "type": "subgoal",
                        "position": {
                            "x": 2000,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.12 — Inform natural persons subject to high-risk AI system decisions or assistance in decisions (→ Annex III)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-26-13",
                        "type": "subgoal",
                        "position": {
                            "x": 2400,
                            "y": 500
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 26.13 — Cooperate with competent authorities in any action taken in relation to the high-risk AI system"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.1 — Technical and organisational measures must ensure use in accordance with instructions for use → appartiene a SUBGOAL 26.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.2 — Human oversight must be assigned to natural persons with necessary competence, training, authority and support → appartiene a SUBGOAL 26.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.3 — Input data relevance and representativeness obligation applies only when deployer exercises control over input data → appartiene a SUBGOAL 26.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.4 — Where risk per Art. 79(1) is identified, provider or distributor and market surveillance authority must be informed without undue delay and use must be suspended → appartiene a SUBGOAL 26.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.5 — Upon serious incident, provider must be informed first, then importer or distributor and market surveillance authorities → appartiene a SUBGOAL 26.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.6 — Where provider cannot be reached, Art. 73 applies mutatis mutandis → appartiene a SUBGOAL 26.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.7 — Logs must be kept for minimum six months unless Union or national law provides otherwise → appartiene a SUBGOAL 26.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.8 — Log retention period must be appropriate to intended purpose → appartiene a SUBGOAL 26.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.9 — Financial institution deployers fulfil monitoring obligation by complying with internal governance rules under Union financial services law → appartiene a SUBGOAL 26.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.10 — Financial institution deployers must maintain logs as part of documentation under Union financial services law → appartiene a SUBGOAL 26.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-11",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.11 — Worker information must be provided before putting system into service at workplace, per Union and national law → appartiene a SUBGOAL 26.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-12",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.12 — Public authority deployers must not use unregistered systems and must inform provider or distributor → appartiene a SUBGOAL 26.9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-13",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.13 — Post-remote biometric identification requires ex-ante or max 48h judicial or administrative authorisation → appartiene a SUBGOAL 26.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-14",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.14 — If authorisation for biometric identification is rejected, use must stop immediately and personal data must be deleted → appartiene a SUBGOAL 26.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-15",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.15 — Post-remote biometric identification must not be used in untargeted way without link to criminal offence → appartiene a SUBGOAL 26.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-16",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.16 — Each use of post-remote biometric identification must be documented in police file and made available to authorities upon request → appartiene a SUBGOAL 26.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-17",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-11",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.17 — Annual reports on post-remote biometric identification use must be submitted to market surveillance and data protection authorities → appartiene a SUBGOAL 26.11",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-18",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-12",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.18 — Natural persons subject to Annex III system decisions must be informed, except where law enforcement Art. 13 Directive 2016/680 applies → appartiene a SUBGOAL 26.12",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-26-19",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 26.19 — Sensitive operational data of law enforcement deployers is exempt from monitoring reporting obligation → appartiene a SUBGOAL 26.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-26-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 26.1 — Human oversight persons must have necessary competence, training and authority appropriate to the system → appartiene a SUBGOAL 26.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-26-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-3",
                        "data": {
                            "isHidden": false,
                            "label": "QC 26.2 — Input data must be relevant and sufficiently representative in view of intended purpose → appartiene a SUBGOAL 26.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-26-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-5",
                        "data": {
                            "isHidden": false,
                            "label": "QC 26.3 — Notification of risk must be without undue delay → appartiene a SUBGOAL 26.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-26-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-6",
                        "data": {
                            "isHidden": false,
                            "label": "QC 26.4 — Notification of serious incident to provider must be immediate → appartiene a SUBGOAL 26.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-26-5",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "QC 26.5 — Log retention period must be appropriate to intended purpose beyond minimum six months where needed → appartiene a SUBGOAL 26.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-26-6",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-26-13",
                        "data": {
                            "isHidden": false,
                            "label": "QC 26.6 — Cooperation with authorities must be effective in implementing the Regulation → appartiene a SUBGOAL 26.13",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.1 — deployer_controls_input_data — il deployer ha controllo sui dati di input (attiva SUBGOAL 26.3)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.2 — deployer_controls_logs — i log sono sotto controllo del deployer (attiva SUBGOAL 26.7)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.3 — deployer_is_employer — il deployer è un datore di lavoro (attiva SUBGOAL 26.8)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.4 — deployer_is_public_authority — il deployer è autorità pubblica o istituzione UE (attiva SUBGOAL 26.9)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.5 — financial_institution — il deployer è istituzione finanziaria soggetta a Union financial services law (modifica SUBGOAL 26.4 e 26.7)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-6",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.6 — post_remote_biometric_identification — il sistema è usato per identificazione biometrica post-remota (attiva SUBGOAL 26.11)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-7",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.7 — annex_III_decisions_on_persons — il sistema prende o assiste decisioni su persone naturali per Annex III (attiva SUBGOAL 26.12)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-8",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.8 — law_enforcement_deployer — il deployer è autorità di law enforcement (modifica obblighi di reporting e notifica)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-9",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.9 — serious_incident_identified — è stato identificato un serious incident (attiva SUBGOAL 26.6)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-26-10",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-26",
                        "data": {
                            "isHidden": false,
                            "label": "CF 26.10 — applicable_data_protection_law — normativa applicabile sulla protezione dei dati personali (influenza SUBGOAL 26.7 e 26.10)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-50",
                "type": "goal",
                "position": {
                    "x": 100000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 50 — Ensure transparency obligations for providers and deployers of AI systems interacting with or affecting natural persons"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-50-1",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 50.1 — Inform natural persons that they are interacting with an AI system when not obvious"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-50-2",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 50.2 — Mark synthetic audio, image, video or text outputs in machine-readable format as artificially generated or manipulated"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-50-3",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 50.3 — Inform natural persons exposed to emotion recognition or biometric categorisation systems of system operation and process personal data accordingly"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-50-4",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 50.4 — Disclose that deep fake image, audio or video content has been artificially generated or manipulated"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-50-5",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 50.5 — Disclose that AI-generated text published to inform public on matters of public interest has been artificially generated or manipulated"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.1 — Providers must design systems interacting with natural persons to inform them of AI interaction unless obvious to a reasonably well-informed, observant and circumspect person → appartiene a SUBGOAL 50.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-1",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.2 — Obligation of DC 50.1 does not apply to systems authorised by law for criminal offence detection/prevention/investigation/prosecution unless available for public reporting → appartiene a SUBGOAL 50.1",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.3 — Synthetic content outputs must be marked in machine-readable format detectable as artificially generated or manipulated → appartiene a SUBGOAL 50.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-2",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.4 — Marking obligation does not apply where system performs assistive function for standard editing or does not substantially alter input data or semantics, or where authorised by law for criminal offence purposes → appartiene a SUBGOAL 50.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.5 — Deployers of emotion recognition or biometric categorisation systems must inform exposed natural persons of system operation → appartiene a SUBGOAL 50.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.6 — Personal data processed by emotion recognition or biometric categorisation systems must comply with GDPR, Regulation 2018/1725 and Directive 2016/680 → appartiene a SUBGOAL 50.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-3",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.7 — Obligation of DC 50.5 does not apply to systems permitted by law for criminal offence detection/prevention/investigation with appropriate safeguards → appartiene a SUBGOAL 50.3",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.8 — Deployers of deep fake systems must disclose artificial generation or manipulation of content → appartiene a SUBGOAL 50.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.9 — Deep fake disclosure obligation does not apply where authorised by law for criminal offence purposes → appartiene a SUBGOAL 50.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.10 — For artistic, creative, satirical or fictional works, disclosure is limited to appropriate indication not hampering display or enjoyment → appartiene a SUBGOAL 50.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-11",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-5",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.11 — AI-generated text published to inform public must be disclosed as artificially generated unless authorised by law for criminal offence purposes or subject to human review/editorial control with editorial responsibility → appartiene a SUBGOAL 50.5",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-12",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.12 — All information per paragraphs 1–4 must be provided at the latest at the time of first interaction or exposure → appartiene a GOAL 50",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-50-13",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "DC 50.13 — Art. 50 obligations are without prejudice to Chapter III requirements and other Union or national transparency obligations → appartiene a GOAL 50",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-50-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "QC 50.1 — Information to natural persons must be provided in a clear and distinguishable manner → appartiene a GOAL 50",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-50-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "QC 50.2 — Information must conform to applicable accessibility requirements → appartiene a GOAL 50",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-50-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 50.3 — Technical solutions for marking synthetic content must be effective, interoperable, robust and reliable as far as technically feasible → appartiene a SUBGOAL 50.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-50-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-50-2",
                        "data": {
                            "isHidden": false,
                            "label": "QC 50.4 — Technical solutions must take into account specificities and limitations of content types, implementation costs and state of the art → appartiene a SUBGOAL 50.2",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.1 — direct_human_interaction — il sistema interagisce direttamente con persone naturali (attiva SUBGOAL 50.1)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.2 — synthetic_content_generation — il sistema genera audio, immagini, video o testo sintetico (attiva SUBGOAL 50.2)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.3 — emotion_recognition_or_biometric_categorisation — il sistema usa riconoscimento emotivo o categorizzazione biometrica (attiva SUBGOAL 50.3)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.4 — deep_fake_generation — il sistema genera o manipola contenuti deep fake (attiva SUBGOAL 50.4)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.5 — public_information_text — il sistema genera testo pubblicato per informare il pubblico su materie di interesse pubblico (attiva SUBGOAL 50.5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-6",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.6 — law_enforcement_authorisation — il sistema è autorizzato per legge per scopi di law enforcement (disattiva vari obblighi)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-7",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.7 — artistic_creative_context — il contenuto generato fa parte di opera artistica, creativa, satirica o finzionale (modifica DC 50.8)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-8",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.8 — editorial_control_applied — il testo generato è soggetto a revisione umana o controllo editoriale con responsabilità editoriale (disattiva SUBGOAL 50.5)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-50-9",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-50",
                        "data": {
                            "isHidden": false,
                            "label": "CF 50.9 — standard_editing_assistive — il sistema svolge funzione assistiva per editing standard senza alterare sostanzialmente i dati (disattiva SUBGOAL 50.2)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            },
            {
                "id": "goal-27",
                "type": "goal",
                "position": {
                    "x": 54000,
                    "y": 0
                },
                "data": {
                    "isHidden": false,
                    "label": "GOAL 27 — Perform and notify a fundamental rights impact assessment before deploying high-risk AI system"
                },
                "draggable": false,
                "children": [
                    {
                        "id": "subgoal-27-1",
                        "type": "subgoal",
                        "position": {
                            "x": -1600,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.1 — Describe deployer processes in which system will be used in line with intended purpose"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-2",
                        "type": "subgoal",
                        "position": {
                            "x": -1200,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.2 — Describe period of time and frequency of intended system use"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-3",
                        "type": "subgoal",
                        "position": {
                            "x": -800,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.3 — Identify categories of natural persons and groups likely to be affected"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-4",
                        "type": "subgoal",
                        "position": {
                            "x": -400,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.4 — Identify specific risks of harm to affected persons/groups taking into account provider information (→ Art. 13)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-5",
                        "type": "subgoal",
                        "position": {
                            "x": 0,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.5 — Describe implementation of human oversight measures per instructions for use"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-6",
                        "type": "subgoal",
                        "position": {
                            "x": 400,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.6 — Define measures to be taken upon materialisation of risks including internal governance and complaint mechanisms"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-7",
                        "type": "subgoal",
                        "position": {
                            "x": 800,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.7 — Notify market surveillance authority of assessment results using AI Office templat"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-8",
                        "type": "subgoal",
                        "position": {
                            "x": 1200,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.8 — Update assessment when any element has changed or is no longer up to date"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "subgoal-27-9",
                        "type": "subgoal",
                        "position": {
                            "x": 1600,
                            "y": 500
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "SUBGOAL 27.9 — Complement data protection impact assessment where applicable (→ Art. 35 GDPR, Art. 27 Directive 2016/680)"
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-1",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.1 — Assessment must be performed prior to deployment, not after → appartiene a GOAL 27",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-2",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.2 — Obligation applies to deployers that are: bodies governed by public law, private entities providing public services, or deployers of Annex III points 5(b) and 5(c) systems → appartiene a GOAL 27",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-3",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.3 — Obligation does not apply to high-risk AI systems in area listed in Annex III point 2 → appartiene a GOAL 27",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-4",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.4 — Assessment obligation applies to first use of system; in similar cases deployer may rely on previously conducted assessments or provider assessments → appartiene a GOAL 27",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-5",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-4",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.5 — Specific risks must take into account information provided by provider per Art. 13 → appartiene a SUBGOAL 27.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-6",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-6",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.6 — Measures upon risk materialisation must include internal governance arrangements and complaint mechanisms → appartiene a SUBGOAL 27.6",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-7",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.7 — Market surveillance authority must be notified of results using AI Office template → appartiene a SUBGOAL 27.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-8",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-7",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.8 — Deployers exempt per Art. 46(1) are exempt from notification obligation → appartiene a SUBGOAL 27.7",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-9",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-9",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.9 — Where DPIA under Art. 35 GDPR or Art. 27 Directive 2016/680 already covers obligations, fundamental rights impact assessment must complement (not replace) it → appartiene a SUBGOAL 27.9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "dc-27-10",
                        "type": "domain-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-8",
                        "data": {
                            "isHidden": false,
                            "label": "DC 27.10 — Deployer must update assessment when any element listed in paragraph 1 has changed or is no longer up to date → appartiene a SUBGOAL 27.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-27-1",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "QC 27.1 — Assessment must be sufficiently detailed to cover all six elements of paragraph 1 → appartiene a GOAL 27",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-27-2",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-4",
                        "data": {
                            "isHidden": false,
                            "label": "QC 27.2 — Risk identification must be specific to categories of affected persons in the specific deployment context → appartiene a SUBGOAL 27.4",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-27-3",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-8",
                        "data": {
                            "isHidden": false,
                            "label": "QC 27.3 — Update of assessment must be timely when changes are identified during use → appartiene a SUBGOAL 27.8",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "qc-27-4",
                        "type": "quality-constraint",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "subgoal-27-9",
                        "data": {
                            "isHidden": false,
                            "label": "QC 27.4 — Fundamental rights impact assessment must complement and not duplicate data protection impact assessment → appartiene a SUBGOAL 27.9",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-27-1",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "CF 27.1 — deployer_type — il deployer è ente di diritto pubblico, entità privata che fornisce servizi pubblici, o deployer di sistemi Annex III 5(b)(c) (determina applicabilità GOAL 27)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-27-2",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "CF 27.2 — annex_III_point_2 — il sistema rientra nel punto 2 di Annex III (esclude obbligo di assessment)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-27-3",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "CF 27.3 — previous_assessment_available — esiste già una valutazione precedente su caso simile o assessment del provider (può essere riutilizzata)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-27-4",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "CF 27.4 — art46_exemption — il deployer rientra nell'esenzione Art. 46(1) (disattiva SUBGOAL 27.7)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-27-5",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "CF 27.5 — dpia_already_conducted — è già stato condotto un DPIA per Art. 35 GDPR o Art. 27 Directive 2016/680 (attiva SUBGOAL 27.9)",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-27-6",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "CF 27.6 — affected_vulnerable_groups — esistono categorie vulnerabili tra le persone potenzialmente affette dal sistema",
                             
                        },
                        "draggable": false,
                        "children": null
                    },
                    {
                        "id": "cf-27-7",
                        "type": "context-factor",
                        "position": {
                            "x": 0,
                            "y": 1000
                        },
                        "parentId": "goal-27",
                        "data": {
                            "isHidden": false,
                            "label": "CF 27.7 — system_already_in_use — il sistema è già in uso (obbligo si applica solo alla prima volta, ma update necessario se elementi cambiano)",
                             
                        },
                        "draggable": false,
                        "children": null
                    }
                ],
                "parentId": "ai-act-compliance"
            }
        ]
    }
];

export const AIActNodes = normalizeTreePositions(raw_AIActNodes);
