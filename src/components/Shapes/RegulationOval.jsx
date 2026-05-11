import React, {useState} from "react";
import {Handle, NodeToolbar, Position} from "reactflow";
import Card from "../Card";
import {getGlossary} from "../../utils/getGlossary.js";
import {useSelector} from "react-redux";

const RegulationOval = ({id, data}) => {
    const glossaryKey = id ?? data.label;
    const nodeStyle = {
        width: data.width || 300,
        height: data.height || 100,
        borderRadius: "50%",
        padding: "8px 16px",
        backgroundColor: "#bae6fd",
        color: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    };
    const noTopHandle = data.top === "no";
    const [isVisible, setVisible] = useState(false);
    const {infoToggle} = useSelector((state) => state.phaseStatus);

    return (
        <div style={nodeStyle} onMouseEnter={() => infoToggle && setVisible(true)}
             onMouseLeave={() => infoToggle && setVisible(false)}>
            {data.isHidden &&
                <img src={"/assets/cross.png"} style={{position: "absolute"}} alt={"hidden"}/>
            }
            <NodeToolbar isVisible={isVisible} position={Position.Left}>
                <Card title={data.label} message={getGlossary(glossaryKey) || getGlossary(data.label)} width={data.width * 2 || 480}/>
            </NodeToolbar>
            {!noTopHandle && <Handle type="target" position={Position.Top} id={"principles_oval_target_top"} isConnectable={false}/>}
            {data.left && <Handle type="target" position={Position.Left} id={"principles_oval_target_left"} isConnectable={false}/>}
            {data.right && <Handle type="target" position={Position.Right} id={"principles_oval_target_right"} isConnectable={false}/>}
            {data.bottom &&
                <Handle type="target" position={Position.Bottom} id={"principles_oval_target_bottom"} isConnectable={false}/>}
            <div className={"block"}>
                <p className={"text-sm text-center font-bold"}>
                    {!data.titleDisable && <>
                        &lt;&lt;Regulatory_Artefact&gt;&gt;
                        <br/>
                    </>
                    }
                    {data.label}
                    <br/>
                </p>
            </div>
            <Handle type="source" position={Position.Bottom} id={"principles_oval_source_bottom"} className={"custom-handle"}
                    isConnectable={false}
            />
            {data.sourceLeft &&
                <Handle type="source" position={Position.Left} id={"principles_oval_source_left"} isConnectable={false}/>}
            {data.sourceRight &&
                <Handle type="source" position={Position.Right} id={"principles_oval_source_right"} isConnectable={false}/>}
            {data.sourceTop &&
                <Handle type="source" position={Position.Top} id={"principles_oval_source_top"} isConnectable={false}/>
            }
        </div>
    );
};

export default RegulationOval;