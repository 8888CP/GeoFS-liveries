// ==UserScript==
// @name         GeoFS-liveries
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  add some liveries
// @author       ai & CP8888
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const JSON_URL = "https://raw.githubusercontent.com/8888CP/GeoFS-liveries/main/livery.json";

    let panel, searchInput, filterSelect;
    let data = null;
    let currentAircraftId = null;
    let displayType = "all";
    let gameFocused = false;
    let dataLoaded = false;

    let availableContainer = null;
    let favoritesContainer = null;

    const sectionState = {
        available: true,
        favorites: true
    };

    function getFavorites() {
        try {
            const raw = localStorage.getItem('liveryFavorites_all');
            if (!raw) return [];
            return JSON.parse(raw);
        } catch { return []; }
    }

    function saveFavorites(favList) {
        try {
            localStorage.setItem('liveryFavorites_all', JSON.stringify(favList));
        } catch (e) { console.warn('Save favorites failed', e); }
    }

    function toggleFavorite(acId, liveryName) {
        const key = acId + '|' + liveryName;
        let favs = getFavorites();
        const idx = favs.indexOf(key);
        if (idx > -1) {
            favs.splice(idx, 1);
        } else {
            favs.push(key);
        }
        saveFavorites(favs);
        return favs;
    }

    function isFavorite(acId, liveryName) {
        const key = acId + '|' + liveryName;
        return getFavorites().includes(key);
    }

    const wait = setInterval(() => {
        if (window.geofs && geofs.aircraft?.instance) {
            clearInterval(wait);
            loadDataAndInit();
        }
    }, 1000);

    async function loadDataAndInit() {
        try {
            const response = await fetch(JSON_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            data = await response.json();
            dataLoaded = true;
        } catch (e) {
            console.error('Failed to load liveries:', e);
            data = { aircrafts: {}, livery_types: {} };
        }
        init();
        filterList();
    }

    function init() {
        createUI();
        setupHideKey();
        startLoop();

        window.GeoFSLiveries = {
            applyLivery: applyLivery,
            toggleFavorite: toggleFavorite,
            getFavorites: getFavorites,
            reloadList: filterList,
            togglePanel: togglePanel,
            getData: () => data,
            refreshData: async () => { await loadDataAndInit(); }
        };
    }

    function getCurrentAircraftId() {
        if (geofs && geofs.aircraft && geofs.aircraft.instance) {
            return geofs.aircraft.instance.id;
        }
        return null;
    }

    function applyLivery(livery) {
        if (!data) return;
        const aircraft = geofs.aircraft.instance;
        if (!aircraft) return;

        const currentAcId = aircraft.id;
        const targetAcId = livery._acId || currentAcId;

        if (currentAcId != targetAcId) {
            ui.notification.show(`This livery belongs to ${targetAcId}, not current.`, 'warning');
            console.warn(`Livery for ${targetAcId} cannot be applied to ${currentAcId}`);
            return;
        }

        const acData = data.aircrafts[targetAcId];
        if (!acData) return;

        const parts = acData.parts;
        const indexes = acData.index;
        const textures = livery.texture;
        const materials = livery.materials;

        if (!textures || textures.length === 0) return;

        const textureUrls = textures.filter(t => typeof t === 'string');

        const loadPromises = textureUrls.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => resolve(url);
                img.src = url;
            });
        });

        Promise.all(loadPromises).then(() => {
            for (let i = 0; i < textures.length; i++) {
                const partIdx = parts[i];
                const model3d = aircraft.definition.parts[partIdx]['3dmodel'];
                const tex = textures[i];

                if (typeof tex === 'object' && tex.material !== undefined) {
                    if (materials && materials[tex.material]) {
                        const mat = materials[tex.material];
                        const keys = Object.keys(mat).filter(k => k !== 'name');
                        if (keys.length > 0) {
                            const type = keys[0];
                            const color = mat[type];
                            try {
                                model3d._model.getMaterial(mat.name)
                                    .setValue(type, new Cesium.Cartesian4(color[0], color[1], color[2], 1.0));
                            } catch (e) {}
                        }
                    }
                    continue;
                }

                if (typeof tex !== 'string') continue;

                try {
                    const version = geofs.version || 0;
                    if (version >= 3.7) {
                        geofs.api.changeModelTexture(model3d._model, tex, { index: indexes[i] });
                    } else if (version >= 3.0 && version <= 3.7) {
                        geofs.api.changeModelTexture(model3d._model, tex, indexes[i]);
                    } else if (version == 2.9) {
                        geofs.api.Model.prototype.changeTexture(tex, indexes[i], model3d);
                    } else {
                        geofs.api.changeModelTexture(model3d._model, tex, { index: indexes[i] });
                    }
                } catch (e) {}
            }
        }).catch(() => {});
    }

    function renderList(container, list, acId, isFavorites) {
        if (!container) return;
        container.innerHTML = "";

        if (!list || list.length === 0) {
            const empty = document.createElement("div");
            empty.innerText = isFavorites ? "No favorites yet. Star some liveries!" : "No liveries available for this aircraft";
            empty.style.color = "#aaa";
            empty.style.marginTop = "10px";
            empty.style.textAlign = "center";
            empty.style.fontSize = "13px";
            container.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();

        list.forEach((livery) => {
            if (!livery || !livery.name || !livery.texture) return;

            const isReal = data.livery_types[livery.type_id] === 'real';
            const typeLabel = isReal ? '✈️ Real' : '🎨 Virtual';
            const faved = isFavorite(acId, livery.name);

            const div = document.createElement("div");
            div.style.cssText = `
                cursor: pointer;
                padding: 8px 10px;
                margin: 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                transition: background 0.25s ease-out;
                background: transparent;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-family: inherit;
            `;

            const info = document.createElement("div");
            info.style.flex = "1";
            info.innerHTML = `
                <div style="font-weight:500;font-size:14px;">${livery.name}</div>
                <div style="font-size:11px; opacity:0.7;">by ${livery.credits || "Anonymous"}</div>
                <div style="font-size:9px; color: #ccc; margin-top:2px;">${typeLabel}</div>
            `;

            const star = document.createElement("span");
            star.className = "favorite-star" + (faved ? " faved" : "");
            star.textContent = faved ? "★" : "☆";
            star.style.cssText = `
                float: right;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                color: ${faved ? '#ffcc00' : '#aaa'};
                transition: color 0.2s, transform 0.2s;
                margin-left: 8px;
                user-select: none;
                text-shadow: ${faved ? '0 0 8px rgba(255,204,0,0.6)' : 'none'};
            `;
            star.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleFavorite(acId, livery.name);
                filterList();
            });

            div.appendChild(info);
            div.appendChild(star);

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

            div.onclick = () => applyLivery({ ...livery, _acId: acId });

            fragment.appendChild(div);
        });

        container.appendChild(fragment);
    }

    function filterList() {
        if (!data) {
            if (availableContainer) {
                availableContainer.innerHTML = `<div style="color:#aaa;text-align:center;padding:10px;">⏳ Loading liveries...</div>`;
            }
            if (favoritesContainer) {
                favoritesContainer.innerHTML = `<div style="color:#aaa;text-align:center;padding:10px;">⏳ Loading...</div>`;
            }
            return;
        }

        const acId = getCurrentAircraftId();
        if (!acId) {
            if (availableContainer) {
                availableContainer.innerHTML = `<div style="color:#aaa;text-align:center;padding:10px;">⚠️ No aircraft loaded</div>`;
            }
            if (favoritesContainer) {
                favoritesContainer.innerHTML = `<div style="color:#aaa;text-align:center;padding:10px;">⚠️ No aircraft loaded</div>`;
            }
            return;
        }

        const acData = data.aircrafts[acId];
        let allLiveries = (acData && acData.liveries) ? acData.liveries.slice() : [];

        const keyword = searchInput ? searchInput.value.toLowerCase() : "";
        const typeFilter = displayType;

        let filtered = allLiveries.filter(l =>
            l.name.toLowerCase().includes(keyword) ||
            (l.credits || "").toLowerCase().includes(keyword)
        );

        if (typeFilter !== "all") {
            filtered = filtered.filter(l => {
                const type = data.livery_types[l.type_id];
                return type === typeFilter;
            });
        }

        filtered.sort((a, b) =>
            a.name.localeCompare(b.name, "en", { sensitivity: "base" })
        );

        const favKeys = getFavorites();
        const favFiltered = filtered.filter(l => favKeys.includes(acId + '|' + l.name));

        renderList(availableContainer, filtered, acId, false);
        renderList(favoritesContainer, favFiltered, acId, true);
    }

    function createSection(title, id, container, defaultOpen) {
        const section = document.createElement("div");
        section.style.marginBottom = "6px";

        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 4px 0;
            user-select: none;
            border-bottom: 1px solid rgba(255,255,255,0.15);
            margin-bottom: 4px;
        `;

        const arrow = document.createElement("span");
        arrow.textContent = defaultOpen ? "▼" : "▶";
        arrow.style.cssText = "margin-right:8px;font-size:14px;transition:transform 0.2s;display:inline-block;";

        const titleSpan = document.createElement("span");
        titleSpan.textContent = title;
        titleSpan.style.fontWeight = "bold";
        titleSpan.style.fontSize = "14px";

        header.appendChild(arrow);
        header.appendChild(titleSpan);

        const content = document.createElement("div");
        content.className = "section-content";
        content.style.cssText = `
            overflow: hidden;
            transition: max-height 0.3s ease;
            max-height: ${defaultOpen ? '2000px' : '0'};
            padding: ${defaultOpen ? '4px 0' : '0'};
        `;

        header.addEventListener("click", () => {
            const isOpen = content.style.maxHeight !== '0px' && content.style.maxHeight !== '0';
            const newState = !isOpen;
            content.style.maxHeight = newState ? '2000px' : '0';
            content.style.padding = newState ? '4px 0' : '0';
            arrow.textContent = newState ? "▼" : "▶";
            if (id === 'available') sectionState.available = newState;
            else sectionState.favorites = newState;
        });

        section.appendChild(header);
        section.appendChild(content);
        container.appendChild(section);
        return content;
    }

    function createUI() {
        if (panel && document.body.contains(panel)) return;

        panel = document.createElement("div");
        Object.assign(panel.style, {
            position: "absolute",
            top: "80px",
            right: "20px",
            width: "320px",
            height: "520px",
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
            if (e.target.closest('.section-content')) return;
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
        titleBar.innerHTML = "<b style='letter-spacing:1px'>⚡ GeoFS Liveries V1.6</b>";
        Object.assign(titleBar.style, {
            cursor: "grab",
            paddingBottom: "6px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
            marginBottom: "8px",
            userSelect: "none"
        });
        panel.appendChild(titleBar);

        const hint = document.createElement("div");
        hint.innerText = "Press Shift to hide | ★ to favorite";
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
            <option value="real">✈️ Real</option>
            <option value="virtual">🎨 Virtual</option>
        `;
        Object.assign(filterSelect.style, {
            background: "rgba(0, 0, 0, 0.5)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "40px",
            padding: "5px 10px",
            marginBottom: "10px",
            fontSize: "12px",
            cursor: "pointer"
        });
        filterSelect.onchange = (e) => {
            displayType = e.target.value;
            filterList();
        };
        panel.appendChild(filterSelect);

        const sectionsWrapper = document.createElement("div");
        sectionsWrapper.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            margin-top: 4px;
        `;

        const availContent = createSection('📦 Available Liveries', 'available', sectionsWrapper, sectionState.available);
        const favContent = createSection('⭐ Favorited Liveries', 'favorites', sectionsWrapper, sectionState.favorites);

        panel.appendChild(sectionsWrapper);

        availableContainer = availContent;
        favoritesContainer = favContent;

        const style = document.createElement("style");
        style.textContent = `
            .favorite-star {
                float: right;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                color: #aaa;
                transition: color 0.2s, transform 0.2s;
                margin-left: 8px;
                user-select: none;
            }
            .favorite-star.faved {
                color: #ffcc00;
                text-shadow: 0 0 8px rgba(255,204,0,0.6);
            }
            .favorite-star:hover {
                transform: scale(1.2);
            }
            .section-content::-webkit-scrollbar {
                width: 4px;
            }
            .section-content::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.3);
                border-radius: 10px;
            }
            .section-content::-webkit-scrollbar-thumb {
                background: #fff;
                border-radius: 10px;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);

        filterList();
    }

    function togglePanel() {
        if (!panel) return;
        panel.style.display = panel.style.display === "none" ? "flex" : "none";
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

    function startLoop() {
        setInterval(() => {
            if (!panel || !document.body.contains(panel)) createUI();
            if (!data) {
                if (!dataLoaded) {
                    loadDataAndInit();
                }
                return;
            }

            const newId = getCurrentAircraftId();
            if (newId !== currentAircraftId) {
                currentAircraftId = newId;
                if (searchInput) searchInput.value = "";
                filterList();
            }
        }, 1000);
    }

})();