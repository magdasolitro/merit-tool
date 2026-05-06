import {NodeGlossary} from "../data/NodeGlossary.js";

export function getGlossary(term) {
    if (term == null) {
        return "Term not available.";
    }
    const normalizedTerm = String(term).trim();
    if (!normalizedTerm) {
        return "Term not available.";
    }
    const lowerCaseTerm = normalizedTerm.toLowerCase();
    for (const type of NodeGlossary) {
        for (const key in type.glossary) {
            if (key.toLowerCase() === lowerCaseTerm) {
                return type.glossary[key];
            }
        }
    }
    return "Term not available.";
}
