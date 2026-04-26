import React, {useEffect} from "react";
import Button from "arwes/lib/Button/index.js";
import {useDispatch, useSelector, useStore} from "react-redux";
import {Outlet, useNavigate} from "react-router-dom";
import {FaDownload, FaFileUpload} from "react-icons/fa";
import {Tooltip} from 'react-tooltip'
import {Text} from "@arwes/react-text";
import {setPhaseStatusState, toggleInfo} from "../../redux/slices/phaseStatusSlice.js";
import {setPhaseOneState} from "../../redux/slices/phaseOneSlice.js";
import SelectOption from "../Select";

export default function MainLayout() {
    // const bleeps = useBleeps();
    const navigate = useNavigate();
    const {nextPhaseEnabled, currentPhase, infoToggle, phase3Value} = useSelector((state) => state.phaseStatus);
    const dispatch = useDispatch();
    const store = useStore();

    const saveAsJson = () => {
        const json = JSON.stringify(store.getState(), null, 2);
        const blob = new Blob([json], {type: "application/json"});
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = "web-agon.json";
        document.body.appendChild(link);
        link.click();
    }

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.classList.toggle('dark', savedTheme === 'dark');
        } else {
            // set dark theme by default
            document.body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        savedTheme === 'dark' ? document.querySelector(".sun").classList.add("hide") : document.querySelector(".moon").classList.add("hide");
    }, [])

    const uploadJson = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const json = event.target.result;
                const data = JSON.parse(json);
                dispatch(setPhaseStatusState(data.phaseStatus));
                if (data.phaseOne) {
                    dispatch(setPhaseOneState(data.phaseOne));
                }
                // if (data.phaseTwo) {
                //     dispatch(setPhaseTwoState(data.phaseTwo));
                // }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    const handleThemeChange = () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
        document.querySelector(".sun").classList.toggle("hide");
        document.querySelector(".moon").classList.toggle("hide");
    }

    // function phase3Navigation() {
    //     if (phase3Value === "Phase C1")
    //         navigate("phase3/b");
    //     else if (phase3Value === "Phase C2")
    //         navigate("phase3/c");
    //     else if (phase3Value === "Phase C3")
    //         navigate("phase4");
    // }

    // const phaseThreeOnChange = (event) => {
    //     const selectedValue = event.target.value
    //     dispatch(setPhase3Value(selectedValue));
    //     if (selectedValue === "Phase C1")
    //         navigate("phase3/a");
    //     else if (selectedValue === "Phase C2")
    //         navigate("phase3/b");
    //     else if (selectedValue === "Phase C3")
    //         navigate("phase3/c");
    // }

    const goToNextPhase = () => {
        switch (currentPhase) {
            case 1:
                navigate("phase2");
                break;
            case 2:
                navigate("phase3");
                break;
            // case 3:
            //     phase3Navigation();
            //     break;
            // case 4:
            //     navigate("phase5");
            //     break;
        }
    }
    const goToPhase1 = () => {
        navigate("/app");
    }
    const goToPhase2 = () => {
        navigate("phase2");
    }
    const goToPhase3 = () => {
        navigate("phase3");
    }
    const getPhaseLayer = (phaseNumber) => {
        if (currentPhase === phaseNumber) {
            return "success";
        }
        return "secondary";
    };

    const getPhaseButtonClass = (baseClass, phaseNumber) => {
        const isCompleted = phaseNumber < currentPhase;
        const isFuture = phaseNumber > currentPhase;
        return `${baseClass} ${isCompleted ? "phase-button-completed" : ""} ${isFuture ? "phase-button-future" : ""}`.trim();
    };
    // const goToPhase4 = () => {
    //     navigate("phase4");
    // }
    // const goToPhase5 = () => {
    //     navigate("phase5");
    // }
    return (
        <div className="holy-grail bg-slate-400 dark:bg-slate-900">
            <header>
                <nav className=" bg-zinc-900 px-4 lg:px-6 py-2.5 dark:bg-gray-800">
                    <div className="flex flex-wrap justify-between items-center mx-auto">
                        <a href="/" className="flex items-center">
                            <img src="/assets/logo.png" className="mr-3 h-6 sm:h-9" alt="Flowbite Logo"/>
                            <span
                                className="self-center text-xl font-semibold whitespace-nowrap text-white">X-Reg</span>
                        </a>
                        <ul className="flex flex-col mt-4 font-medium lg:flex-row lg:space-x-8 lg:mt-0"
                            key={currentPhase}>
                            <li>
                                <Button className={getPhaseButtonClass("font-semibold text-lg phase-button phase-1", 1)}
                                        layer={getPhaseLayer(1)} onClick={goToPhase1}>
                                    Phase A
                                </Button>
                            </li>
                            <li>
                                <Button animate className={getPhaseButtonClass("font-semibold text-lg phase-button phase-2", 2)}
                                        disabled={currentPhase < 2}
                                        layer={getPhaseLayer(2)} onClick={goToPhase2}>
                                    Phase B
                                </Button>
                            </li>
                            <li>
                                <Button animate className={getPhaseButtonClass("font-semibold text-lg phase-button phase-3", 3)}
                                        disabled={currentPhase < 3}
                                        layer={getPhaseLayer(3)} onClick={goToPhase3}>
                                    Phase C
                                </Button>
                            </li>                          
                            {/* <li>
                                <Button animate className={"font-semibold text-lg phase-button phase-4"}
                                        disabled={currentPhase < 4}
                                        onClick={goToPhase4}
                                        layer={currentPhase === 4 ? "success" : "secondary"}>
                                    Phase D
                                </Button>
                            </li>
                            <li>
                                <Button animate className={"font-semibold text-lg phase-button phase-5"}
                                        disabled={currentPhase < 5}
                                        onClick={goToPhase5}
                                        layer={currentPhase === 5 ? "success" : "secondary"}>
                                    Phase E
                                </Button>
                            </li>*/}
                        </ul> 
                        {currentPhase !== 5 &&
                            <div className="flex items-center lg:order-2">
                                <Button animate className={"font-semibold text-lg custom-button"}
                                    // buttonProps={{onMouseEnter: () => bleeps.hover?.play()}}
                                        disabled={!nextPhaseEnabled}
                                        onClick={goToNextPhase}>
                                    Next Phase
                                    {/*{ currentPhase !== 5 ? "Next Phase" : "Finalize"}*/}
                                </Button>
                            </div>
                        }
                        <div className="flex items-center lg:order-2">
                            <div className={"w-10"}/>
                            {/*<DownloadButton/>*/}
                            <div className={"w-4"}/>
                            <Button animate className={"font-semibold text-lg custom-button upload"}
                                    layer={"control"}
                                    onClick={uploadJson}>
                                <FaFileUpload size={"1.2em"}/>
                            </Button>
                            <div className={"w-4"}/>
                            <Button animate className={"font-semibold text-lg custom-button download"}
                                    layer={"control"}
                                    onClick={saveAsJson}>
                                <FaDownload size={"1.2em"}/>
                            </Button>
                        </div>
                        <div className="flex flex-col items-center lg:order-2 text-cyan-400">
                            <Text manager="decipher" easing="outSine" fixed>Info</Text>
                            <label className="switch">
                                <input type="checkbox" checked={infoToggle} onChange={() => dispatch(toggleInfo())}/>
                                <span className={`slider`}>
                                </span>
                            </label>
                        </div>
                        <div className="flex flex-col items-center lg:order-2">
                            <label className="switch">
                                <img className="sun" onClick={handleThemeChange}
                                     src="data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUxMiA1MTI7IiB4bWw6c3BhY2U9InByZXNlcnZlIiB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiPgo8cGF0aCBzdHlsZT0iZmlsbDojRkZBNjAwOyIgZD0iTTUwNy44MzQsMzAxLjYwOGwtNTQuNzY5LTQ4LjMxMmw1Mi44MzItNTAuMzk5YzEuOTQxLTEuODUyLDIuNzQtNC41OTEsMi4wOTktNy4xODkgIGMtMC42NDItMi41OTctMi42MjktNC42NTUtNS4yMTEtNS40MDFsLTcwLjMxNi0yMC4yOTJsMjUuOTg4LTY4LjA1NmMwLjk1NS0yLjUsMC40OTUtNS4zMTYtMS4yMDQtNy4zODkgIGMtMS43LTIuMDcyLTQuMzgzLTMuMDg1LTcuMDM4LTIuNjU3bC03Mi4yNzQsMTEuNjUybC01Ljg3OC03Mi41NjFjLTAuMjE2LTIuNjY2LTEuODQ2LTUuMDE1LTQuMjc1LTYuMTYxICBjLTIuNDI5LTEuMTQ2LTUuMjkxLTAuOTE3LTcuNTA0LDAuNjAxbC02MC4yNjYsNDEuMzQyTDI2My40MDksMy43NDJDMjYyLjA2NCwxLjQyNiwyNTkuNTc5LDAsMjU2Ljg4OSwwICBjLTIuNjksMC01LjE3NCwxLjQyNi02LjUxOSwzLjc0MkwyMDguMzQ3LDc2LjExbC03Mi42OS00MS45NTNjLTIuMzI3LTEuMzQzLTUuMTk3LTEuMzQ5LTcuNTI4LTAuMDE4ICBjLTIuMzMzLDEuMzMxLTMuNzczLDMuNzk5LTMuNzgsNi40NzNsLTAuMTc2LDcyLjc5NWwtNzIuOTY1LTYuMDE0Yy0yLjY3NS0wLjIyLTUuMjc1LDAuOTk3LTYuODA3LDMuMTk0ICBjLTEuNTMzLDIuMTk3LTEuNzcxLDUuMDQxLTAuNjIyLDcuNDU5bDMxLjI0Miw2NS44MzVMNi41MDgsMjA5LjU2MmMtMi41MTYsMC45NDMtNC4zMzUsMy4xNS00Ljc3Myw1Ljc4OSAgYy0wLjQzOCwyLjYzOCwwLjU3NSw1LjMwOCwyLjY1Niw3LjAwM2w1Ni42MTksNDYuMTUybC01MC44MTMsNTIuNDFjLTEuODY2LDEuOTI1LTIuNTU5LDQuNjk0LTEuODE2LDcuMjY0ICBjMC43NDQsMi41NywyLjgxLDQuNTUsNS40MTksNS4xOTRsNzEuMDU1LDE3LjU1MUw2MS41Niw0MTkuOTM2Yy0wLjg1NiwyLjUzNS0wLjI4Niw1LjMzMSwxLjQ5NCw3LjMzNiAgYzEuNzgxLDIuMDA1LDQuNTAyLDIuOTEzLDcuMTM3LDIuMzgybDcxLjc2LTE0LjQ0M2w4LjcyMSw3Mi4yNzhjMC4zMTksMi42NTUsMi4wNDEsNC45MzgsNC41MTMsNS45OSAgYzIuNDc0LDEuMDUyLDUuMzIzLDAuNzEyLDcuNDc1LTAuODkxbDU4LjU5Ni00My42NDdsMzkuMDU1LDU5LjU2NmMxLjM4MiwyLjE3OSwzLjc4OSwzLjQ5Miw2LjM2NywzLjQ5MiAgYzAuMDk4LDAsMC4xOTYtMC4wMDIsMC4yOTUtMC4wMDZjMi42ODctMC4xMDQsNS4xMTUtMS42MjYsNi4zNjgtMy45OTJsMzQuMTA3LTYyLjQwNWw2MS44MzksMzguOTc0ICBjMi4yNzMsMS40MzIsNS4xMzcsMS41NSw3LjUyMiwwLjMxYzIuMzgyLTEuMjQsMy45MTktMy42NSw0LjAzLTYuMzIybDMuMDMxLTcyLjczNGw3Mi42NzQsOC44NGMyLjY2NCwwLjMyNCw1LjMxLTAuNzkxLDYuOTI4LTIuOTI3ICBjMS42MTgtMi4xMzcsMS45NjYtNC45NjksMC45MTQtNy40M2wtMjguNjM2LTY2Ljk5N2w2OS40NjUtMjMuMDAzYzIuNTUyLTAuODQ1LDQuNDU2LTIuOTc5LDQuOTk3LTUuNTk5ICBDNTEwLjc1MiwzMDYuMDksNTA5Ljg0NSwzMDMuMzgzLDUwNy44MzQsMzAxLjYwOHoiLz4KPGVsbGlwc2Ugc3R5bGU9ImZpbGw6I0ZGREIyRDsiIGN4PSIyNTQuMzUiIGN5PSIyNTQuNjkxIiByeD0iMTU1LjA2OSIgcnk9IjE1NC45NDkiLz4KPHBhdGggc3R5bGU9ImZpbGw6I0ZGQ0EwMDsiIGQ9Ik0yNTQuMzU0LDk5Ljc0M2MtMy44ODQsMC03LjczMiwwLjE0Ny0xMS41NDMsMC40MjhjODAuMjUsNS45MDEsMTQzLjUyNSw3Mi44MjUsMTQzLjUyNSwxNTQuNTIxICBjMCw4MS42OTUtNjMuMjc1LDE0OC42MTktMTQzLjUyNSwxNTQuNTIxYzMuODExLDAuMjgsNy42NiwwLjQyOCwxMS41NDMsMC40MjhjODUuNjQxLDAsMTU1LjA2OC02OS4zNzMsMTU1LjA2OC0xNTQuOTQ4ICBDNDA5LjQyMiwxNjkuMTE2LDMzOS45OTUsOTkuNzQzLDI1NC4zNTQsOTkuNzQzeiIvPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K"/>
                                <img className="moon" onClick={handleThemeChange}
                                     src="data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDQ5OS43MTIgNDk5LjcxMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDk5LjcxMiA0OTkuNzEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4Ij4KPHBhdGggc3R5bGU9ImZpbGw6I0ZGRDkzQjsiIGQ9Ik0xNDYuODgsMzc1LjUyOGMxMjYuMjcyLDAsMjI4LjYyNC0xMDIuMzY4LDIyOC42MjQtMjI4LjY0YzAtNTUuOTUyLTIwLjE2LTEwNy4xMzYtNTMuNTItMTQ2Ljg4ICBDNDI1LjA1NiwzMy4wOTYsNDk5LjY5NiwxMjkuNjQsNDk5LjY5NiwyNDMuNzA0YzAsMTQxLjM5Mi0xMTQuNjA4LDI1Ni0yNTYsMjU2Yy0xMTQuMDY0LDAtMjEwLjYwOC03NC42NC0yNDMuNjk2LTE3Ny43MTIgIEMzOS43NDQsMzU1LjM2OCw5MC45NDQsMzc1LjUyOCwxNDYuODgsMzc1LjUyOHoiLz4KPHBhdGggc3R5bGU9ImZpbGw6I0Y0QzUzNDsiIGQ9Ik00MDEuOTIsNDIuNzc2YzM0LjI0LDQzLjUwNCw1NC44MTYsOTguMjcyLDU0LjgxNiwxNTcuOTUyYzAsMTQxLjM5Mi0xMTQuNjA4LDI1Ni0yNTYsMjU2ICBjLTU5LjY4LDAtMTE0LjQ0OC0yMC41NzYtMTU3Ljk1Mi01NC44MTZjNDYuODQ4LDU5LjQ3MiwxMTkuMzQ0LDk3Ljc5MiwyMDAuOTI4LDk3Ljc5MmMxNDEuMzkyLDAsMjU2LTExNC42MDgsMjU2LTI1NiAgQzQ5OS43MTIsMTYyLjEyLDQ2MS4zOTIsODkuNjQsNDAxLjkyLDQyLjc3NnoiLz4KPGc+Cgk8cG9seWdvbiBzdHlsZT0iZmlsbDojRkZEODNCOyIgcG9pbnRzPSIxMjguMTI4LDk5Ljk0NCAxNTQuNDk2LDE1My40IDIxMy40NzIsMTYxLjk2IDE3MC44LDIwMy41NiAxODAuODY0LDI2Mi4yOTYgICAgMTI4LjEyOCwyMzQuNTY4IDc1LjM3NiwyNjIuMjk2IDg1LjQ0LDIwMy41NiA0Mi43NjgsMTYxLjk2IDEwMS43NDQsMTUzLjQgICIvPgoJPHBvbHlnb24gc3R5bGU9ImZpbGw6I0ZGRDgzQjsiIHBvaW50cz0iMjc2Ljg2NCw4Mi44NCAyOTAuNTI4LDExMC41NTIgMzIxLjEwNCwxMTQuOTg0IDI5OC45NzYsMTM2LjU1MiAzMDQuMjA4LDE2Ni45ODQgICAgMjc2Ljg2NCwxNTIuNjE2IDI0OS41MiwxNjYuOTg0IDI1NC43NTIsMTM2LjU1MiAyMzIuNjI0LDExNC45ODQgMjYzLjIsMTEwLjU1MiAgIi8+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPGc+CjwvZz4KPC9zdmc+Cg=="/>
                            </label>
                        </div>
                    </div>
                </nav>
            </header>
            <main className="holy-grail__main">
                <Outlet/>
            </main>
            <Tooltip anchorSelect=".download-img" place="bottom">
                Click to download image!
            </Tooltip>
            <Tooltip anchorSelect=".upload" place="bottom">
                Click to upload your json file!
            </Tooltip>
            <Tooltip anchorSelect=".download" place="bottom">
                Click to download a json file!
            </Tooltip>
            <Tooltip anchorSelect=".phase-1" place="bottom">
                Context Characterization Phase
            </Tooltip>
            <Tooltip anchorSelect=".phase-2" place="bottom">
                Context-Based Analysis of Acceptance Requirements
            </Tooltip>
            <Tooltip anchorSelect=".phase-3" place="bottom">
                Acceptance Requirements Refinement
            </Tooltip>
            <Tooltip anchorSelect=".phase-4" place="bottom">
                Specification Summary
            </Tooltip>
            <Tooltip anchorSelect=".phase-5" place="bottom">
                Context-Based Operationalization via Gamification
            </Tooltip>
        </div>
    );
}
