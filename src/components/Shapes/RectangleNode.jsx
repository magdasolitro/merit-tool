import React from "react";
import {Handle, Position} from "reactflow";

const RectangleNode = ({data}) => {
    const nodeStyle = {
        width: data.sizeX || 180,
        minHeight: data.sizeY || 90,
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

    return (
        <div style={nodeStyle}>
            {!noTopHandle && <Handle type="target" position={Position.Top} id={"rectangle_top"} isConnectable={false}/>}
            <p className={"text-xs text-center"}>{data.label}</p>
            <Handle type="source" position={Position.Bottom} id={"rectangle_bottom"} className={"custom-handle"}
                    isConnectable={false}/>
        </div>
    );
};

export default RectangleNode;
