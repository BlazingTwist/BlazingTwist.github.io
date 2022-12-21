((SpaceTexParallax) => {

    SpaceTexParallax.registerElements = async function registerElements(
        parallaxContainerID, parallaxHeightControllerID, mainContentDivID, spaceTexDivID, treelineDivID, footerID, zIndexOffset
    ) {
        let spaceTexDiv = document.getElementById(spaceTexDivID);
        spaceTexDiv.classList.add("parallax_layer", "parallax_layer--back");
        spaceTexDiv.style.height = "100%";
        spaceTexDiv.style.width = "100%";
        spaceTexDiv.style.fontSize = "0";
        spaceTexDiv.style.zIndex = "" + (zIndexOffset - 2);

        /** @type {HTMLImageElement|null} */
        let spaceTexImg = NodeUtils.findChildWithTag(NodeUtils.findChildWithTag(spaceTexDiv, "picture") || spaceTexDiv, "img");
        let spaceTexWidth = 100;
        let spaceTexHeight = 100;
        let spaceTexImgPromise = null;
        if (spaceTexImg) {
            spaceTexImg.style.width = "100%";
            spaceTexImgPromise = new Promise((resolve) => {
                if (spaceTexImg.complete) {
                    resolve();
                    return;
                }
                spaceTexImg.onload = () => {
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
        let treelineImg = NodeUtils.findChildWithTag(treelineDiv, "img");
        let treelineWidth = 100;
        let treelineHeight = 100;
        let treelineImgPromise = null;
        if (treelineImg) {
            treelineImg.style.width = "100%";
            treelineImgPromise = new Promise((resolve) => {
                if (treelineImg.complete) {
                    resolve();
                    return;
                }
                treelineImg.onload = () => {
                    resolve();
                }
            })
        } else {
            console.warn("failed to find image in treelineDiv with id: '" + treelineDivID + "'");
        }

        let treelineBlackbox = NodeUtils.findChildWithTag(treelineDiv, "div");
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
            spaceTexWidth = spaceTexImg.naturalWidth;
            spaceTexHeight = spaceTexImg.naturalHeight;
        }
        if (treelineImgPromise !== null) {
            await treelineImgPromise;
            treelineWidth = treelineImg.naturalWidth;
            treelineHeight = treelineImg.naturalHeight;
        }

        let footerDiv = document.getElementById(footerID);

        let parallaxData = {
            parallaxContainer: document.getElementById(parallaxContainerID),
            parallaxHeightController: document.getElementById(parallaxHeightControllerID),
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

            footerDiv,

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

        let treelineVisibleHeight = (windowWidth / parallaxData.treelineWidth * parallaxData.treelineHeight) + 200;

        // overlay main content over treeline
        treelineDiv.style.zIndex = (parallaxData.zIndexOffset - 1).toString();

        let scrollHeight = Math.max(0, mainContentDiv.offsetHeight - windowHeight);
        let treelineOverscroll = (treelineVisibleHeight * 2.5);

        // compute size for spaceTex
        let spaceTexZTranslate = -1200;
        let spaceTexScaleFactor = (Math.abs(spaceTexZTranslate) + 300) / 300;
        let targetSpaceTexWidth = (windowWidth * spaceTexScaleFactor);
        let targetSpaceTexHeight = (windowHeight * spaceTexScaleFactor) + scrollHeight + treelineOverscroll;

        spaceTexDiv.style.transform = "translateX(-" + (windowWidth / 2 * (spaceTexScaleFactor - 1)) + "px)"
            + " translateY(-" + (windowHeight / 2 * (spaceTexScaleFactor - 1)) + "px)"
            + " translateZ(" + spaceTexZTranslate + "px)";
        spaceTexDiv.style.width = "" + targetSpaceTexWidth + "px";
        spaceTexDiv.style.height = "" + targetSpaceTexHeight + "px";

        // repeat image if target height exceeds height of image
        let currentSingleImageHeight = targetSpaceTexWidth / parallaxData.spaceTexWidth * parallaxData.spaceTexHeight;
        let coveredHeight = spaceTexDiv.childElementCount * currentSingleImageHeight;
        while (coveredHeight < targetSpaceTexHeight) {
            let skyTexImgClone = spaceTexDiv.children.item(0).cloneNode(true);
            let skyTexImgElement = (skyTexImgClone.tagName === "img" ? skyTexImgClone : NodeUtils.findChildWithTag(skyTexImgClone, "img"));
            skyTexImgElement.style.marginTop = "-" + spaceTexScaleFactor + "px";

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
        let treelineScaleFactor = (scrollHeight + treelineOverscroll) / treelineVisibleHeight;
        let treelineTranslateZ = 300 - (300 * treelineScaleFactor);

        treelineDiv.style.transform =
            "translateX(-" + ((windowWidth / 2) * (treelineScaleFactor - 1)) + "px)"
            + " translateY(-" + ((windowHeight / 2) * (treelineScaleFactor - 1)) + "px)"
            + " translateZ(" + treelineTranslateZ + "px)";
        treelineDiv.style.width = "" + (windowWidth * treelineScaleFactor) + "px";
        treelineDiv.style.height = "" + ((windowHeight * treelineScaleFactor) + scrollHeight + treelineOverscroll) + "px";

        parallaxData.parallaxHeightController.style.height = "" + (windowHeight + scrollHeight + treelineOverscroll) + "px";

        let currentScrollAmount = parallaxData.parallaxContainer.scrollTop;
        let previousTreelineScale = parallaxData._previousTreelineScale || treelineScaleFactor;
        let shiftOffset = ((currentScrollAmount / treelineScaleFactor) - (currentScrollAmount / previousTreelineScale)) * treelineScaleFactor;
        animateTranslateFromTo(
            treelineImg,
            "0px " + (shiftOffset + (windowHeight * treelineScaleFactor)) + "px",
            "0px " + ((windowHeight * treelineScaleFactor)) + "px"
        );
        animateTranslateFromTo(
            treelineBlackbox,
            "0px " + (shiftOffset + ((windowHeight - 1) * treelineScaleFactor)) + "px",
            "0px " + ((windowHeight - 1) * treelineScaleFactor) + "px"
        );

        parallaxData.footerDiv.style.transform = "scale(" + treelineScaleFactor + ")";

        parallaxData._previousTreelineScale = treelineScaleFactor;
    }
})(window.SpaceTexParallax = window.SpaceTexParallax || {});