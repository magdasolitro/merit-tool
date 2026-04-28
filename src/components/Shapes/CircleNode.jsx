import React from "react";
import {Handle, Position} from "reactflow";

const CircleNode = ({data}) => {
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
    };
    const noTopHandle = data.top === "no";
    return (
        <div style={nodeStyle}>
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
            <p className={"text-xs text-center"}>{data.label}</p>
            <Handle type="source" position={Position.Bottom} id={"circle_bottom"} className={"custom-handle"}
                    isConnectable={false}/>
        </div>
    );
};

export default CircleNode;
