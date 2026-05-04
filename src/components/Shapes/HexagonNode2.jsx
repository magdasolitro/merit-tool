import React from "react";
import {Handle, Position} from "reactflow";

const HexagonNode2 = ({data}) => {
    const size = data.size || 120;

    const nodeStyle = {
        width: "fit-content",
        height: "fit-content",
        minWidth: size,
        minHeight: size * (3 / 5),
        cursor: data.isConnectable ? "pointer" : "default",
        outline: data.isChosen && "4px solid #5D803F",
        outlineOffset: "8px",
        backgroundColor: "#7ccfa1",
        color: "black",
        clipPath: "polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px 30px",
    };

    const labelStyle = {
        margin: 0,
        width: "100%",
        maxWidth: data.maxTextWidth || 380,
        lineHeight: 1.2,
        overflowWrap: "break-word",
    };

    const noTopHandle = data.top === "no";

    return (
        <div style={nodeStyle}>
            {!noTopHandle && <Handle type="target" position={Position.Top} id={"hexagon2_top"} isConnectable={false}/>}
            <p className={"text-xs text-center"} style={labelStyle}>{data.label}</p>
            <Handle type="source" position={Position.Bottom} id={"hexagon2_bottom"} className={"custom-handle"}
                    isConnectable={false}/>
        </div>
    );
};

export default HexagonNode2;
