((SpaceTexParallax) => {
    /***
     * @param {HTMLElement} container
     * @param {string} tagString
     * @returns {HTMLElement|null} child if found / null if not found
     */
    function findChildWithTag(container, tagString) {
        let children = container.children;
        let numChildren = children.length;
        for (let i = 0; i < numChildren; i++) {
            let child = children.item(i);
            if (child.tagName.toLowerCase() === tagString.toLowerCase()) {
                return child;
            }
        }
        return null;
    }

    SpaceTexParallax.registerElements = async function registerElements(parallaxContainerID, mainContentDivID, spaceTexDivID, treelineDivID, zIndexOffset) {
        let spaceTexDiv = document.getElementById(spaceTexDivID);
        spaceTexDiv.classList.add("parallax_layer", "parallax_layer--back");
        spaceTexDiv.style.height = "100%";
        spaceTexDiv.style.width = "100%";
        spaceTexDiv.style.fontSize = "0";
        spaceTexDiv.style.zIndex = "" + (zIndexOffset - 2);

        /** @type {HTMLImageElement|null} */
        let spaceTexImg = findChildWithTag(findChildWithTag(spaceTexDiv, "picture") || spaceTexDiv, "img");
        let spaceTexWidth = 100;
        let spaceTexHeight = 100;
        let spaceTexImgPromise = null;
        if (spaceTexImg) {
            spaceTexImg.style.width = "100%";
            spaceTexImgPromise = new Promise((resolve) => {
                spaceTexImg.onload = () => {
                    spaceTexWidth = spaceTexImg.naturalWidth;
                    spaceTexHeight = spaceTexImg.naturalHeight;
                    resolve();
                }
            })
        } else {
            console.warn("failed to find image in spaceTexDiv with id: '" + spaceTexDivID + "'");
        }

        let treelineDiv = document.getElementById(treelineDivID);
        treelineDiv.classList.add("parallax_layer", "parallax_layer--back_overlay");
        treelineDiv.style.height = "100%";
        treelineDiv.style.width = "100%";
        treelineDiv.style.fontSize = "0";
        treelineDiv.style.zIndex = "" + (zIndexOffset + 1);

        /** @type {HTMLImageElement|null} */
        let treelineImg = findChildWithTag(treelineDiv, "img");
        let treelineWidth = 100;
        let treelineHeight = 100;
        let treelineImgPromise = null;
        if (treelineImg) {
            treelineImg.style.width = "100%";
            treelineImgPromise = new Promise((resolve) => {
                treelineImg.onload = () => {
                    treelineWidth = treelineImg.naturalWidth;
                    treelineHeight = treelineImg.naturalHeight;
                    resolve();
                }
            })
        } else {
            console.warn("failed to find image in treelineDiv with id: '" + treelineDivID + "'");
        }

        let treelineBlackbox = findChildWithTag(treelineDiv, "div");
        if (treelineBlackbox) {
            treelineBlackbox.style.width = "100%";
            treelineBlackbox.style.height = "100%";
        }

        let mainContentDiv = document.getElementById(mainContentDivID);
        mainContentDiv.classList.add("parallax_layer", "parallax_layer--base");
        mainContentDiv.style.height = "max-content";
        mainContentDiv.style.zIndex = "" + zIndexOffset;

        if (spaceTexImgPromise !== null) {
            await spaceTexImgPromise;
        }
        if (treelineImgPromise !== null) {
            await treelineImgPromise;
        }

        let parallaxData = {
            parallaxContainer: document.getElementById(parallaxContainerID),
            zIndexOffset,
            mainContentDiv,

            spaceTexDiv,
            spaceTexWidth,
            spaceTexHeight,

            treelineDiv,
            treelineImg,
            treelineBlackbox,
            treelineWidth,
            treelineHeight,

            _previousTreelineScale: null,
        }

        resizeBackground(parallaxData);

        new ResizeObserver(() => {
            resizeBackground(parallaxData)
        }).observe(mainContentDiv);
    }

    function reflow(element) {
        void (element.offsetHeight);
    }

    function animateTranslateFromTo(target, translateFrom, translateTo) {
        if (target === null) {
            return;
        }

        target.style.transition = null;
        target.style.translate = translateFrom;
        reflow(target);
        target.style.transition = "translate 500ms ease-in-out";
        target.style.translate = translateTo;
    }

    function resizeBackground(parallaxData) {
        let mainContentDiv = parallaxData.mainContentDiv;
        let windowHeight = window.innerHeight;
        let windowWidth = window.innerWidth;

        let spaceTexDiv = parallaxData.spaceTexDiv;
        let treelineDiv = parallaxData.treelineDiv;
        let treelineImg = parallaxData.treelineImg;
        let treelineBlackbox = parallaxData.treelineBlackbox;

        let treelineVisibleHeight = windowWidth / parallaxData.treelineWidth * parallaxData.treelineHeight;

        // for tall screens, overlay treeline on top of main content, for wide screens overlay main content on treeline
        treelineDiv.style.zIndex = parallaxData.zIndexOffset + (windowHeight > windowWidth ? 1 : -1);

        let scrollHeight = Math.max(0, (mainContentDiv.offsetHeight + (0.2 * windowHeight)) - windowHeight)
        scrollHeight += (treelineVisibleHeight * 2);

        // compute size for spaceTex
        let targetSpaceTexWidth = (windowWidth * 2);
        let targetSpaceTexHeight = ((windowHeight + (scrollHeight)) * 2);

        spaceTexDiv.style.transform = "translateX(-" + (windowWidth / 2) + "px) translateY(-" + (windowHeight / 2) + "px) translateZ(-300px)";
        spaceTexDiv.style.width = "" + targetSpaceTexWidth + "px";
        spaceTexDiv.style.height = "" + targetSpaceTexHeight + "px";

        // repeat image if target height exceeds height of image
        let currentSingleImageHeight = targetSpaceTexWidth / parallaxData.spaceTexWidth * parallaxData.spaceTexHeight;
        let coveredHeight = spaceTexDiv.childElementCount * currentSingleImageHeight;
        while (coveredHeight < targetSpaceTexHeight) {
            let skyTexImgClone = spaceTexDiv.children.item(0).cloneNode(true);
            let skyTexImgElement = (skyTexImgClone.tagName === "img" ? skyTexImgClone : findChildWithTag(skyTexImgClone, "img"));
            skyTexImgElement.style.marginTop = "-1px";

            spaceTexDiv.appendChild(skyTexImgClone);
            coveredHeight += currentSingleImageHeight;
        }

        // compute size for treeline
        // this should set the translateZ property such that the image is
        //  - fully off-screen at the top of the page (top edge of img is touching bottom edge of view)
        //  - fully on-screen at the bottom of the page (bottom edge of img is touching bottom edge of view)
        // consequently: visible y translation on page scroll == true image height
        // thus: translateZ = perspective - (perspective * scrollableHeight / trueImageHeight)
        // e.g.: translateZ = 300 - (300 * 2500 / 250) = 300 - (300 * 10) = -2700
        //  the resulting scroll slowdown will then be 10x -> 2500 px scroll translates to 250 px scroll
        let treelineScaleFactor = scrollHeight / treelineVisibleHeight;
        let treelineTranslateZ = 300 - (300 * treelineScaleFactor);

        // currently the image left edge is ((windowWidth / 2) - ((windowWidth / 2) / treelineScaleFactor))
        //  pixels away from the left edge of the viewport (the same applies to the topEdge using windowHeight)
        // ((windowWidth / 2) - ((windowWidth / 2) / treelineScaleFactor)) * treelineScaleFactor
        // = (windowWidth / 2 * treelineScaleFactor) - (windowWidth / 2)
        // = (windowWidth / 2) * ((treelineScaleFactor) - (1))
        let treelineOffsetFactor = (treelineScaleFactor - 1) / 2;
        let treelineWidthOffset = windowWidth * treelineOffsetFactor;
        let treelineHeightOffset = windowHeight * treelineOffsetFactor;
        treelineDiv.style.transform =
            "translateX(-" + (treelineWidthOffset) + "px) translateY(-" + (treelineHeightOffset) + "px) translateZ(" + treelineTranslateZ + "px)";
        treelineDiv.style.width = "" + (windowWidth * treelineScaleFactor) + "px";
        treelineDiv.style.height = "" + ((windowHeight + scrollHeight) * treelineScaleFactor) + "px";

        let currentScrollAmount = parallaxData.parallaxContainer.scrollTop;
        let previousTreelineScale = parallaxData._previousTreelineScale || treelineScaleFactor;
        let shiftOffset = ((currentScrollAmount / treelineScaleFactor) - (currentScrollAmount / previousTreelineScale)) * treelineScaleFactor;
        animateTranslateFromTo(
            treelineImg,
            "0px " + (shiftOffset + (windowHeight * 0.9 * treelineScaleFactor)) + "px",
            "0px " + (windowHeight * 0.9 * treelineScaleFactor) + "px"
        );
        animateTranslateFromTo(
            treelineBlackbox,
            "0px " + (shiftOffset + ((windowHeight * 0.9 - 1) * treelineScaleFactor)) + "px",
            "0px " + ((windowHeight * 0.9 - 1) * treelineScaleFactor) + "px"
        );

        parallaxData._previousTreelineScale = treelineScaleFactor;
    }
})(window.SpaceTexParallax = window.SpaceTexParallax || {});