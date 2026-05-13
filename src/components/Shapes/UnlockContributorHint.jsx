import React from "react";

const HINT_BG = "#ffba00";

/**
 * Shows which Phase 1 context factors (via unlocks) contributed to making this node visible.
 * Rendered below the node body (sibling), not inside the shaped clip/outline.
 */
export default function UnlockContributorHint({
    labels,
    compact = false,
    compactPrefix = "CF: ",
    heading = "Unlocked by CF:",
    compactSeparator,
}) {
    if (!Array.isArray(labels) || labels.length === 0) {
        return null;
    }

    const text = compact ? labels.join(compactSeparator ?? " · ") : labels.join("\n");
    const title = labels.join("\n");

    const boxStyle = {
        marginTop: 8,
        padding: compact ? "4px 8px" : "6px 10px",
        maxWidth: 380,
        width: "max-content",
        alignSelf: "center",
        borderRadius: 6,
        backgroundColor: HINT_BG,
        border: "1px solid #c68400",
        color: "#1c1917",
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        lineHeight: 1.25,
        whiteSpace: compact ? "normal" : "pre-line",
        overflowWrap: "break-word",
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
    };

    if (compact) {
        return (
            <div style={boxStyle} title={title}>
                <span style={{fontWeight: 800}}>{compactPrefix}</span>
                {text}
            </div>
        );
    }

    return (
        <div style={boxStyle} title={title}>
            <span style={{fontWeight: 800}}>{heading}</span>
            <br/>
            {text}
        </div>
    );
}
