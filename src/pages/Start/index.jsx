import React, {useEffect} from "react";
import HomeBackground from "../../components/Background/HomeBackground.jsx";
import {Animator} from "@arwes/react-animator";
import {Text} from "@arwes/react-text";
// import {useBleeps} from "@arwes/react-bleeps";
// import {BleepsOnAnimator} from "@arwes/react-core";

import Button from "arwes/lib/Button/index.js";
import {Animated} from "@arwes/react-animated";

export default function Home() {
    // const bleeps = useBleeps();

    // const hoverFunc = () => {
    //     document.getElementById("get-started").style.backgroundColor = "#00ff00";
    //     bleeps.hover?.play()
    // }
    const hoverOutFunc = () => {
        document.getElementById("get-started").style.backgroundColor = "";
    }
    const clickFunc = () => {
        window.location.href = "/app";
    }
    useEffect(() => {
        document.getElementById("get-started").classList.add("animate-pulse");
    }, []);

    return (
        <>
            <HomeBackground/>
            <div className={"inset-center"}>
                <Animator active={true} combine manager="sequence">
                    <Animator duration={3}>
                        {/*<BleepsOnAnimator*/}
                        {/*    transitions={{*/}
                        {/*        entered: "intro"*/}
                        {/*    }}/>*/}
                        <h1 className={"font-semibold text-5xl"}>
                            <Text manager="decipher" easing="outSine" fixed>
                                REG-AGON
                            </Text>
                        </h1>
                    </Animator>
                    <Animator duration={2}>
                        {/*<BleepsOnAnimator*/}
                        {/*    transitions={{*/}
                        {/*        entered: "enter"*/}
                        {/*    }}/>*/}
                        <div className={"font-medium text-lg"}>
                            <Text manager="decipher" easing="outSine" fixed>
                                A Tool for the Gamification of Regulatory Comliance Analysis
                            </Text>
                        </div>
                    </Animator>
                    <div className={"mt-6"}>
                        <Animator>
                            <Animated animated={{
                                transitions: {
                                    entering: {
                                        y: [150, 0],
                                        options: {duration: 0.4, easing: "ease-in-out"}
                                    },
                                }
                            }}>
                                {/*<BleepsOnAnimator*/}
                                {/*    transitions={{*/}
                                {/*        entering: "intro",*/}
                                {/*    }}/>*/}
                                <Button buttonProps={{
                                    // onMouseEnter: () => hoverFunc(),
                                    onClick: () => clickFunc(),
                                    onMouseLeave: () => hoverOutFunc()
                                }}
                                        animate layer={"success"}
                                        id={"get-started"}
                                >
                                    <Text>Get Started</Text>
                                </Button>
                            </Animated>
                        </Animator>
                    </div>
                </Animator>
            </div>
        </>
    );
}
