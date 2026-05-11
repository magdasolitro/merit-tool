import React, {useMemo, useState} from "react";
import {Handle, NodeToolbar, Position} from "reactflow";
import Card from "../Card";
import {getGlossary} from "../../utils/getGlossary.js";
import UnlockContributorHint from "./UnlockContributorHint.jsx";

const CircleNode = ({id, data}) => {
    const [isGlossaryVisible, setGlossaryVisible] = useState(false);
    const glossaryMessage = useMemo(() => (id != null ? getGlossary(id) : "Term not available."), [id]);
    const hasGlossaryEntry = glossaryMessage !== "Term not available.";
    const showGlossaryOnHover = Boolean(data?.isConnectable) || hasGlossaryEntry;
    const outerStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    };

    const nodeStyle = {
        width: data.size || 100,
        height: data.size || 100,
        borderRadius: "50%",
        cursor: data.isConnectable ? "pointer" : "default",
        padding: 2,
        outline: data.isChosen && "4px solid #5D803F",
        outlineOffset: "10px",
        backgroundColor: data.background || "white",
        color: data.background === "black" ? "white" : "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        boxSizing: "border-box",
    };
    const noTopHandle = data.top === "no";
    return (
        <div style={outerStyle}>
            <div
                style={nodeStyle}
                onMouseEnter={() => showGlossaryOnHover && setGlossaryVisible(true)}
                onMouseLeave={() => showGlossaryOnHover && setGlossaryVisible(false)}
            >
                {showGlossaryOnHover && (
                    <NodeToolbar isVisible={isGlossaryVisible} position={Position.Left}>
                        <Card
                            title={data.label ?? id}
                            message={glossaryMessage}
                            width={data.width ? data.width * 2 : 420}
                        />
                    </NodeToolbar>
                )}
                {data.isHidden && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            pointerEvents: "none",
                            backgroundColor: "rgba(220, 38, 38, 0.15)",
                            color: "#dc2626",
                            fontWeight: 900,
                            fontSize: "6rem",
                            lineHeight: 1,
                            borderRadius: "50%",
                        }}
                    >
                        ×
                    </div>
                )}
                {!noTopHandle && <Handle type="target" position={Position.Top} id={"circle_top"} isConnectable={false}/>}
                <p className={"text-sm text-center"}>{data.label}</p>
                <Handle type="source" position={Position.Bottom} id={"circle_bottom"} className={"custom-handle"}
                        isConnectable={false}/>
            </div>
            <UnlockContributorHint labels={data.unlockContributorLabels} compact/>
        </div>
    );
};

export default CircleNode;
