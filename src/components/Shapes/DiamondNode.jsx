import React from "react";
import {Handle, Position} from "reactflow";
import UnlockContributorHint from "./UnlockContributorHint.jsx";

const DiamondNode = ({data}) => {
    const size = data.size || 150;

    const outerStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    };

    const nodeStyle = {
        width: size,
        height: size,
        cursor: data.isConnectable ? "pointer" : "default",
        outline: data.isChosen && "4px solid #5D803F",
        outlineOffset: "8px",
        backgroundColor: "#fcfcb8",
        color: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: "rotate(45deg)",
        boxSizing: "border-box",
    };

    const innerWrapStyle = {
        transform: "rotate(-45deg)",
        margin: 0,
        width: size * 0.95,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    };

    const labelStyle = {
        margin: 0,
        width: size * 0.82,
        lineHeight: 1.3,
        textAlign: "center",
    };

    const noTopHandle = data.top === "no";

    return (
        <div style={outerStyle}>
            <div style={nodeStyle}>
                {!noTopHandle && <Handle type="target" position={Position.Top} id={"diamond_top"} isConnectable={false}/>}
                <div style={innerWrapStyle}>
                    <p className={"text-sm text-center"} style={labelStyle}>{data.label}</p>
                </div>
                <Handle type="source" position={Position.Bottom} id={"diamond_bottom"} className={"custom-handle"}
                        isConnectable={false}/>
            </div>
            <UnlockContributorHint labels={data.unlockContributorLabels} compact/>
        </div>
    );
};

export default DiamondNode;
