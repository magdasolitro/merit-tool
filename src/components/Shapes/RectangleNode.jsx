import React, {useMemo, useState} from "react";
import {Handle, NodeToolbar, Position} from "reactflow";
import {useSelector} from "react-redux";
import Card from "../Card";
import {getGlossary} from "../../utils/getGlossary.js";
import UnlockContributorHint from "./UnlockContributorHint.jsx";

const GLOSSARY_FALLBACK = "Term not available.";

const RectangleNode = ({id, data}) => {
    const outerStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    };

    const nodeStyle = {
        width: data.sizeX || 220,
        minHeight: data.sizeY || 100,
        borderRadius: "12px",
        cursor: data.isConnectable ? "pointer" : "default",
        padding: "8px 10px",
        outline: data.isChosen && "4px solid #5D803F",
        outlineOffset: "8px",
        backgroundColor: data.background || "white",
        color: data.background === "black" ? "white" : "black",
        border: "2px solid #2b2b2b",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxSizing: "border-box",
    };

    const noTopHandle = data.top === "no";
    const [isVisible, setVisible] = useState(false);
    const {infoToggle} = useSelector((state) => state.phaseStatus);
    const glossaryMessage = useMemo(() => {
        const candidates = [
            id,
            data?.id,
            typeof id === "string" && id.includes(":") ? id.split(":").pop() : null,
            typeof data?.id === "string" && data.id.includes(":") ? data.id.split(":").pop() : null,
        ].filter(Boolean);

        for (const candidate of candidates) {
            const message = getGlossary(candidate);
            if (message !== GLOSSARY_FALLBACK) {
                return message;
            }
        }

        return GLOSSARY_FALLBACK;
    }, [data?.id, id]);

    return (
        <div style={outerStyle}>
            <div
                style={nodeStyle}
                onMouseEnter={() => infoToggle && setVisible(true)}
                onMouseLeave={() => infoToggle && setVisible(false)}
            >
                <NodeToolbar isVisible={isVisible} position={Position.Left}>
                    <Card title={data.label} message={glossaryMessage} width={data.sizeX * 2 || 480}/>
                </NodeToolbar>
                {!noTopHandle && <Handle type="target" position={Position.Top} id={"rectangle_top"} isConnectable={false}/>}
                <p className={"text-sm text-center"}>{data.label}</p>
                <Handle type="source" position={Position.Bottom} id={"rectangle_bottom"} className={"custom-handle"}
                        isConnectable={false}/>
            </div>
            <UnlockContributorHint labels={data.unlockContributorLabels} compact/>
        </div>
    );
};

export default RectangleNode;
