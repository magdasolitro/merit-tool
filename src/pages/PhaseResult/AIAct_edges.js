import {AIActNodes} from "./AIAct_nodes.js";

const collectEdgesFromTree = (nodes) => {
    const edges = [];

    const walk = (node) => {
        if (node?.parentId) {
            edges.push({
                id: `${node.parentId}->${node.id}`,
                source: node.parentId,
                target: node.id,
                type: "straight",
            });
        }

        if (Array.isArray(node?.children)) {
            node.children.forEach(walk);
        }
    };

    nodes.forEach(walk);
    return edges;
};

export const AIActEdges = collectEdgesFromTree(AIActNodes);

export default AIActEdges;
