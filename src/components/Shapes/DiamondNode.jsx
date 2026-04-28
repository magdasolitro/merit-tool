import React from "react";
import {Handle, Position} from "reactflow";

const DiamondNode = ({data}) => {
    const size = data.size || 120;

    const nodeStyle = {
        width: size,
        height: size,
        cursor: data.isConnectable ? "pointer" : "default",
        outline: data.isChosen && "4px solid #5D803F",
        outlineOffset: "8px",
        backgroundColor: data.background || "white",
        color: data.background === "black" ? "white" : "black",
        border: "2px solid #2b2b2b",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: "rotate(45deg)",
        boxSizing: "border-box",
    };

    const labelStyle = {
        transform: "rotate(-45deg)",
        margin: 0,
        width: size * 0.75,
        lineHeight: 1.2,
    };

    const noTopHandle = data.top === "no";

    return (
        <div style={nodeStyle}>
            {!noTopHandle && <Handle type="target" position={Position.Top} id={"diamond_top"} isConnectable={false}/>}
            <p className={"text-xs text-center"} style={labelStyle}>{data.label}</p>
            <Handle type="source" position={Position.Bottom} id={"diamond_bottom"} className={"custom-handle"}
                    isConnectable={false}/>
        </div>
    );
};

export default DiamondNode;
