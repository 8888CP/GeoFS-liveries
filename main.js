// ==UserScript==
// @name         GeoFS-liveries
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  add some liveries
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
        console.log("✅ Plugin Loaded v1.2-fixed");

        try {
            data = await fetch(jsonUrl).then(r => r.json());
        } catch (e) {
            console.error("JSON Loading Failed:", e);
            return;
        }

        createUI();
        startLoop();
    }

    // =========================
    // UI CREATION (UNCHANGED)
    // =========================
    function createUI() {
        if (panel && document.body.contains(panel)) return;

        panel = document.createElement("div");
        Object.assign(panel.style, {
            position: "absolute",
            top: "80px",
            right: "20px",
            width: "280px",
            height: "420px",
            background: "rgba(10, 10, 20, 0.65)",
            color: "white",
            padding: "10px",
            borderRadius: "14px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 25px rgba(0,255,255,0.08)"
        });

        let isDragging = false, offsetX, offsetY;

        panel.addEventListener("mousedown", (e) => {
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

        const title = document.createElement("div");
        title.innerHTML = "<b>Liveries</b>";
        panel.appendChild(title);

        const hint = document.createElement("div");
        hint.innerText = "Click game then press Shift to hide";
        Object.assign(hint.style, {
            fontSize: "12px",
            opacity: "0.7",
            marginBottom: "5px"
        });
        panel.appendChild(hint);

        searchInput = document.createElement("input");
        searchInput.placeholder = "Search...";
        Object.assign(searchInput.style, {
            marginTop: "6px",
            padding: "5px",
            borderRadius: "5px",
            border: "none",
            outline: "none"
        });

        ["keydown", "keyup", "keypress"].forEach(evt => {
            searchInput.addEventListener(evt, e => e.stopPropagation());
        });

        searchInput.oninput = filterList;
        panel.appendChild(searchInput);

        filterSelect = document.createElement("select");
        filterSelect.innerHTML = `
            <option value="all">All Liveries</option>
            <option value="real">Real Liveries</option>
            <option value="virtual">Virtual Liveries</option>
        `;

        filterSelect.onchange = (e) => {
            displayType = e.target.value;
            filterList();
        };

        panel.appendChild(filterSelect);

        listContainer = document.createElement("div");
        Object.assign(listContainer.style, {
            marginTop: "8px",
            overflowY: "auto",
            flex: "1"
        });

        panel.appendChild(listContainer);
        document.body.appendChild(panel);
    }

    // =========================
    // APPLY LIVERY (UNCHANGED)
    // =========================
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

    // =========================
    // RENDER (UNCHANGED)
    // =========================
    function renderList(list) {
        listContainer.innerHTML = "";

        const fragment = document.createDocumentFragment();

        list.forEach(livery => {
            if (!livery || !livery.name || !livery.texture) return;

            const div = document.createElement("div");

            div.innerHTML = `
                <div>${livery.name}</div>
                <div style="font-size:12px; opacity:0.7;">by: ${livery.credits || "Unknown"}</div>
                <div style="font-size:10px; color: gray;">
                    (${data.livery_types[livery.type_id] === 'real' ? 'Real' : 'Virtual'})
                </div>
            `;

            Object.assign(div.style, {
                cursor: "pointer",
                marginTop: "6px",
                padding: "6px",
                borderRadius: "6px",
                transition: "0.15s"
            });

            div.onmousemove = (e) => {
                const rect = div.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                div.style.background = `
                    radial-gradient(
                        120px circle at ${x}px ${y}px,
                        rgba(0, 255, 255, 0.25),
                        rgba(255, 255, 255, 0.05),
                        transparent 70%
                    )
                `;
            };

            div.onmouseleave = () => {
                div.style.background = "transparent";
            };

            div.onclick = () => applyLivery(livery);

            fragment.appendChild(div);
        });

        listContainer.appendChild(fragment);
    }

    // =========================
    // FILTER (UNCHANGED)
    // =========================
    function filterList() {
        const keyword = searchInput.value.toLowerCase();
        const id = geofs.aircraft.instance.id;
        const ac = data.aircrafts[id];

        listContainer.innerHTML = "";

        if (!ac || !ac.liveries?.length) {
            const empty = document.createElement("div");
            empty.innerText = "No liveries available";
            empty.style.color = "gray";
            empty.style.marginTop = "10px";
            listContainer.appendChild(empty);
            return;
        }

        const list = ac.liveries.filter(l =>
            l.name.toLowerCase().includes(keyword) ||
            (l.credits || "").toLowerCase().includes(keyword)
        );

        renderList(list);
    }

    // =========================
    // ⭐ FIXED SHIFT LOGIC (ONLY CHANGE)
    // =========================

    function isTypingInUI() {
        const el = document.activeElement;
        if (!el) return false;

        const tag = el.tagName;
        return (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            el.isContentEditable
        );
    }

    document.addEventListener("mousedown", (e) => {
        const t = e.target;

        // ❗点击UI不算游戏焦点
        if (panel.contains(t) || t.tagName === "INPUT" || t.tagName === "SELECT") {
            gameFocused = false;
            return;
        }

        gameFocused = true;
    });

    searchInput?.addEventListener("focus", () => gameFocused = false);
    searchInput?.addEventListener("blur", () => gameFocused = true);

    document.addEventListener("keydown", (e) => {

        if (!panel) return;

        // ⭐ 核心修复1：输入状态直接禁止
        if (isTypingInUI()) return;

        // ⭐ 核心修复2：必须点击过游戏
        if (!gameFocused) return;

        // ⭐ Shift 才触发
        if (e.key === "Shift") {
            panel.style.display =
                panel.style.display === "none" ? "flex" : "none";
        }
    });

    // =========================
    // LOOP (UNCHANGED)
    // =========================
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
