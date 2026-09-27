import React, { useEffect } from "react";
import "./app.css";
import SiteContent from "./SiteContent.jsx";

export default function App() {
  useEffect(() => {
    let active = true;
    let stopPageEffects = () => {};

    import("./page-effects.js")
      .then(({ initPageEffects }) => {
        if (active) stopPageEffects = initPageEffects();
      })
      .catch((error) => {
        if (!active) return;
        console.error("Could not start the page effects.", error);
        document.getElementById("loader")?.classList.add("done");
      });

    return () => {
      active = false;
      stopPageEffects();
    };
  }, []);

  return <SiteContent />;
}
