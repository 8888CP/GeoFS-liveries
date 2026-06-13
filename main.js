// ==UserScript==
// @name         GeoFS-liveries
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  add some liveries - Modern Tech Edition (White Gradient)
// @author       ChatGPT & CP8888
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let panel, listContainer, searchInput, filterSelect;
    let data;
    let lastAircraftId = null;
    let currentList = [];
    let displayType = "all";

    let gameFocused = false;

    const jsonUrl =
        "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/main/livery.json";

    const wait = setInterval(() => {
        if (window.geofs && (window.LiverySelector || geofs.aircraft?.instance)) {
            clearInterval(wait);
            init();
        }
    }, 1000);

    async function init() {
        console.log("✅ Plugin Loaded v1.4 - Modern Tech Edition (White Gradient)");

        try {
            data = await fetch(jsonUrl).then(r => r.json());
        } catch (e) {
            console.error("JSON Loading Failed:", e);
            return;
        }

        createUI();
        setupHideKey();
        startLoop();
    }

    function setupHideKey() {
        document.addEventListener("mousedown", (e) => {
            if (panel && panel.contains(e.target)) {
                gameFocused = false;
            } else {
                gameFocused = true;
            }
        });

        document.addEventListener("keydown", (e) => {
            const active = document.activeElement;
            const typing =
                active &&
                (active.tagName === "INPUT" ||
                 active.tagName === "TEXTAREA" ||
                 active.isContentEditable);

            if (typing) return;

            if (e.key === "Shift" && gameFocused && panel) {
                panel.style.display =
                    panel.style.display === "none" ? "flex" : "none";
            }
        });
    }

    function createUI() {
        if (panel && document.body.contains(panel)) return;

        panel = document.createElement("div");
        Object.assign(panel.style, {
            position: "absolute",
            top: "80px",
            right: "20px",
            width: "300px",
            height: "450px",
            background: "rgba(8, 12, 25, 0.75)",
            color: "#eef",
            padding: "12px",
            borderRadius: "18px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 0 30px rgba(255, 255, 255, 0.1), inset 0 0 10px rgba(255, 255, 255, 0.05)",
            fontFamily: "'Segoe UI', 'Poppins', system-ui, sans-serif"
        });

        let isDragging = false, offsetX, offsetY;
        panel.addEventListener("mousedown", (e) => {
            if (listContainer && (e.target === listContainer || listContainer.contains(e.target))) {
                return;
            }
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
        });
        document.addEventListener("mousemove", (e) => {
            if (isDragging) {
                panel.style.left = (e.clientX - offsetX) + "px";
                panel.style.top = (e.clientY - offsetY) + "px";
                panel.style.right = "auto";
            }
        });
        document.addEventListener("mouseup", () => isDragging = false);

        const titleBar = document.createElement("div");
        titleBar.className = "panel-header";
        titleBar.innerHTML = "<b style='letter-spacing:1px'>⚡ GeoFS Liveries V1.4</b>";
        Object.assign(titleBar.style, {
            cursor: "grab",
            paddingBottom: "6px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
            marginBottom: "8px",
            userSelect: "none"
        });
        panel.appendChild(titleBar);

        const hint = document.createElement("div");
        hint.innerText = "Shift to hide | Mouse over for glow";
        Object.assign(hint.style, {
            fontSize: "11px",
            opacity: "0.65",
            marginBottom: "10px",
            letterSpacing: "0.3px"
        });
        panel.appendChild(hint);

        searchInput = document.createElement("input");
        searchInput.placeholder = "🔍 Search liveries...";
        Object.assign(searchInput.style, {
            marginTop: "4px",
            marginBottom: "8px",
            padding: "8px 10px",
            borderRadius: "40px",
            border: "none",
            outline: "none",
            background: "rgba(0, 0, 0, 0.4)",
            color: "#fff",
            fontSize: "12px",
            backdropFilter: "blur(4px)",
            width: "calc(100% - 20px)"
        });

        ["keydown", "keyup", "keypress"].forEach(evt => {
            searchInput.addEventListener(evt, e => e.stopPropagation());
        });
        searchInput.oninput = filterList;
        panel.appendChild(searchInput);

        filterSelect = document.createElement("select");
        filterSelect.innerHTML = `
            <option value="all">✨ All Liveries</option>
            <option value="real">✈️ Real Liveries</option>
            <option value="virtual">🎨 Virtual Liveries</option>
        `;
        Object.assign(filterSelect.style, {
            background: "rgba(0, 0, 0, 0.5)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "40px",
            padding: "5px 10px",
            marginBottom: "12px",
            fontSize: "12px",
            cursor: "pointer"
        });
        filterSelect.onchange = (e) => {
            displayType = e.target.value;
            filterList();
        };
        panel.appendChild(filterSelect);

        listContainer = document.createElement("div");
        Object.assign(listContainer.style, {
            marginTop: "4px",
            overflowY: "auto",
            flex: "1",
            scrollBehavior: "smooth"
        });

        const style = document.createElement("style");
        style.textContent = `
            #livery-list-container::-webkit-scrollbar {
                width: 5px;
            }
            #livery-list-container::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.3);
                border-radius: 10px;
            }
            #livery-list-container::-webkit-scrollbar-thumb {
                background: #fff;
                border-radius: 10px;
            }
        `;
        listContainer.id = "livery-list-container";
        panel.appendChild(listContainer);
        document.head.appendChild(style);
        document.body.appendChild(panel);
    }

    function applyLivery(livery) {
        const id = geofs.aircraft.instance.id;

        if (window.LiverySelector) {
            const airplane = window.LiverySelector.liveryobj.aircrafts[id];
            if (airplane) {
                window.LiverySelector.loadLivery(
                    livery.texture,
                    airplane.index,
                    airplane.parts,
                    livery.materials
                );
                return;
            }
        }

        const aircraft = geofs.aircraft.instance;
        if (!aircraft || !livery.texture) return;

        let i = 0;
        aircraft.object3d.traverse((child) => {
            if (child.material && child.material.map && livery.texture[i]) {
                const tex = new THREE.TextureLoader().load(livery.texture[i]);
                child.material.map = tex;
                child.material.needsUpdate = true;
                i++;
            }
        });
    }

    function renderList(list) {
        listContainer.innerHTML = "";
        const fragment = document.createDocumentFragment();

        list.forEach((livery, idx) => {
            if (!livery || !livery.name || !livery.texture) return;

            const isReal = data.livery_types[livery.type_id] === 'real';
            const typeLabel = isReal ? '✈️ Real' : '🎨 Virtual';

            const div = document.createElement("div");
            div.innerHTML = `
                <div style="font-weight:500;">${livery.name}</div>
                <div style="font-size:11px; opacity:0.7;">by ${livery.credits || "Anonymous"}</div>
                <div style="font-size:9px; color: #ccc; margin-top:4px;">
                    ${typeLabel}
                </div>
            `;

            Object.assign(div.style, {
                cursor: "pointer",
                padding: "10px 12px",
                margin: "0",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                transition: "background 0.25s ease-out, border-color 0.2s",
                background: "transparent",
                fontFamily: "inherit"
            });

            div.onmousemove = (e) => {
                const rect = div.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                div.style.background = `
                    radial-gradient(
                        280px circle at ${x}px ${y}px,
                        rgba(255, 255, 255, 0.35),
                        rgba(255, 255, 255, 0.1),
                        rgba(0, 0, 0, 0) 75%
                    )
                `;
            };

            div.onmouseleave = () => {
                div.style.background = "transparent";
            };

            div.onclick = () => applyLivery(livery);
            fragment.appendChild(div);
        });

        if (list.length > 0) {
            const thanksDiv = document.createElement("div");
            thanksDiv.innerText = "Thank you for using GeoFS Liveries addon";
            Object.assign(thanksDiv.style, {
                textAlign: "center",
                fontSize: "11px",
                color: "rgba(255, 255, 255, 0.5)",
                padding: "12px 8px",
                marginTop: "4px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                fontStyle: "italic",
                letterSpacing: "0.5px"
            });
            fragment.appendChild(thanksDiv);
        }

        listContainer.appendChild(fragment);
    }

    function filterList() {
        const keyword = searchInput.value.toLowerCase();
        const id = geofs.aircraft.instance.id;
        const ac = data.aircrafts[id];

        listContainer.innerHTML = "";

        if (!ac || !ac.liveries?.length) {
            const empty = document.createElement("div");
            empty.innerText = "No liveries available for this aircraft";
            empty.style.color = "#aaa";
            empty.style.marginTop = "20px";
            empty.style.textAlign = "center";
            empty.style.fontSize = "13px";
            listContainer.appendChild(empty);
            return;
        }

        let filtered = ac.liveries.filter(l =>
            l.name.toLowerCase().includes(keyword) ||
            (l.credits || "").toLowerCase().includes(keyword)
        );

        if (displayType !== "all") {
            filtered = filtered.filter(l => {
                const type = data.livery_types[l.type_id];
                return type === displayType;
            });
        }

        filtered.sort((a, b) =>
            a.name.localeCompare(b.name, "en", { sensitivity: "base" })
        );

        if (filtered.length === 0) {
            const empty = document.createElement("div");
            let msg = displayType === "all"
                ? "No matching liveries"
                : `No ${displayType === 'real' ? 'real' : 'virtual'} liveries found`;
            empty.innerText = msg;
            empty.style.color = "#aaa";
            empty.style.marginTop = "20px";
            empty.style.textAlign = "center";
            empty.style.fontSize = "13px";
            listContainer.appendChild(empty);
            return;
        }

        renderList(filtered);
    }

    function startLoop() {
        setInterval(() => {
            if (!panel || !document.body.contains(panel)) createUI();

            const id = geofs.aircraft.instance.id;
            if (id !== lastAircraftId) {
                lastAircraftId = id;
                searchInput.value = "";
                filterList();
            }
        }, 1000);
    }
})();