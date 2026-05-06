import {getGlossary} from "../utils/getGlossary.js";

describe("Get the node glossary from Agon Framework", () => {
    it("Should return the explanation", () => {
        const label = "Improve_Behavioral_Intention";
        const message = "Improve the intention of the user concerning the possibility to embrace a particular behavior able to satisfy the acceptance subject."
        expect(getGlossary(label)).toBe(message);
    })
    it("Should return term not available", () => {
        const label = "UNKNOWN_LABEL";
        const message = "Term not available.";
        expect(getGlossary(label)).toBe(message);
    })
    it("Should handle undefined term", () => {
        const message = "Term not available.";
        expect(getGlossary(undefined)).toBe(message);
    })
})
