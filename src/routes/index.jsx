import Home from "../pages/Start";
import PhaseOne from "../pages/PhaseOne";
import Intro from "../pages/Intro";
import PhaseTwo from "../pages/PhaseTwo";
import PhaseThree from "../pages/PhaseThree";
import MainLayout from "../components/Layout/MainLayout.jsx";

const routes = [
    {
        path: "/",
        element: <Intro/>,
    },
    {
        path: "/home",
        element: <Home/>,
    },
    {
        path: "/app",
        element: <MainLayout/>,
        children: [
            {
                index: true,
                element: <PhaseOne/>
            },
            {
                path: "phase2",
                element: <PhaseTwo/>
            },
            {
                path: "phase3",
                element: <PhaseThree/>
            }
        ]
    },
]
export default routes;
