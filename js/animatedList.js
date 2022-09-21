((AnimatedList) => {
    const listBusyAnimatingAttribute = "busyAnimating";
    const awaitingInsertionAttribute = "awaitingInsertion";
    const awaitingRemovalAttribute = "awaitingRemoval";
    const animMillis = 200;

    /**
     * @type TypeAnimationHandlerCallback
     *
     * @function
     * @param {HTMLElement} targetNode
     * @param {number} targetNodeHeight
     * @param {number} currentYOffset
     * @returns {void}
     */
    AnimatedList.animateInflateInsertion = function animateInflateInsertion(targetNode, targetNodeHeight, currentYOffset) {
        let targetNodeYOffset = (0.5 * targetNodeHeight) + currentYOffset;
        animateTransform(targetNode, "translateY(-" + targetNodeYOffset + "px) scaleY(0)", null);
    }

    /**
     * @type TypeAnimationHandlerCallback
     *
     * @function
     * @param {HTMLElement} targetNode
     * @param {number} targetNodeHeight
     * @param {number} currentYOffset
     * @returns {void}
     */
    AnimatedList.animateShiftRightRemove = function animateShiftRightRemove(targetNode, targetNodeHeight, currentYOffset) {
        let targetNodeWidth = targetNode.offsetWidth;
        targetNode.style.zIndex = "-999";
        animateTransform(targetNode, null, "translateX(" + (0.5 * targetNodeWidth) + "px) translateY(-" + currentYOffset + "px) scaleX(0)");
    }

    AnimatedList.insertNode = function insertNode(animatedList, nodeToInsert, insertionIndex, animationID = AnimatedList.animateInflateInsertion.name) {
        markNodeForInsertion(nodeToInsert, animationID);
        animatedList.insertBefore(nodeToInsert, animatedList.children.item(insertionIndex));
        onNodeListModified(animatedList);
    }

    AnimatedList.appendNode = function appendNode(animatedList, nodeToInsert, animationID = AnimatedList.animateInflateInsertion.name) {
        markNodeForInsertion(nodeToInsert, animationID);
        animatedList.insertBefore(nodeToInsert, null);
        onNodeListModified(animatedList);
    }

    AnimatedList.removeNode = function insertNode(animatedList, nodeToRemove, animationID = AnimatedList.animateShiftRightRemove.name) {
        markNodeForRemoval(nodeToRemove, animationID);
        onNodeListModified(animatedList);
    }

    /**
     * @callback TypeAnimationHandlerCallback
     * @param {HTMLElement} targetNode
     * @param {number} targetNodeHeight
     * @param {number} currentYOffset
     * @returns {void}
     */

    /**
     * @type Object.<string,TypeAnimationHandlerCallback>
     */
    const listAnimations = {
        [AnimatedList.animateInflateInsertion.name]: AnimatedList.animateInflateInsertion,
        [AnimatedList.animateShiftRightRemove.name]: AnimatedList.animateShiftRightRemove
    };

    function reflow(element) {
        void (element.offsetHeight);
    }

    function onAnimationStarted(animatedList) {
        animatedList.setAttribute(listBusyAnimatingAttribute, true);
    }

    function onNodeListModified(animatedList) {
        if (!animatedList.hasAttribute(listBusyAnimatingAttribute)) {
            checkForNodesToAnimate(animatedList);
        }
    }

    /**
     * @param {HTMLElement} animatedList
     * @returns {boolean} true if a node awaiting animation was found and animation was started
     */
    function checkForNodesToAnimate(animatedList) {
        let children = animatedList.children;
        let numChildren = children.length;

        let anyNodesAwaitingAnimation = false;
        let nodesAwaitingRemoval = [];
        let nodesAwaitingInsertion = [];

        for (let i = 0; i < numChildren; i++) {
            let child = children.item(i);
            if (child.hasAttribute(awaitingRemovalAttribute)) {
                nodesAwaitingRemoval.push(child);
                anyNodesAwaitingAnimation = true;
            }
            if (child.hasAttribute(awaitingInsertionAttribute)) {
                nodesAwaitingInsertion.push(child);
                anyNodesAwaitingAnimation = true;
            }
        }

        if (!anyNodesAwaitingAnimation) {
            return false;
        }

        onAnimationStarted(animatedList);
        if (nodesAwaitingRemoval.length > 0) {
            handleNodeRemovalAnimation(animatedList, nodesAwaitingRemoval);
        } else {
            handleNodeAdditionAnimation(animatedList, nodesAwaitingInsertion);
        }

        return true;
    }

    function onAnimationFinished(animatedList) {
        if (checkForNodesToAnimate(animatedList)) {
            return;
        }

        // if no more nodes need to be animated
        animatedList.removeAttribute(listBusyAnimatingAttribute);
    }

    function animateTransform(targetNode, transformBegin, transformEnd) {
        targetNode.style.transition = null;
        targetNode.style.transform = transformBegin;
        reflow(targetNode);
        targetNode.style.transition = "all " + animMillis + "ms ease-in-out";
        targetNode.style.transform = transformEnd;
    }

    /**
     * @param {HTMLElement} animatedList
     * @param {Array.<HTMLElement>} targetNodes
     */
    function handleNodeAdditionAnimation(animatedList, targetNodes) {
        let children = animatedList.children;
        let numChildren = children.length;

        let currentYOffsetGain = 0;
        for (let i = 0; i < numChildren; i++) {
            let child = children.item(i);
            if (targetNodes.includes(child)) {
                child.style.display = null;
                let targetNodeHeight = child.offsetHeight;

                let animationCallback = listAnimations[child.getAttribute(awaitingInsertionAttribute)];
                child.removeAttribute(awaitingInsertionAttribute);
                animationCallback(child, targetNodeHeight, currentYOffsetGain);

                currentYOffsetGain += targetNodeHeight;
            } else if (currentYOffsetGain > 0) {
                animateTransform(child, "translateY(-" + currentYOffsetGain + "px)", null);
            }
        }

        setTimeout(onAnimationFinished, animMillis, animatedList);
    }

    /**
     * @param {HTMLElement} animatedList
     * @param {Array.<HTMLElement>} targetNodes
     */
    function handleNodeRemovalAnimation(animatedList, targetNodes) {
        let children = animatedList.children;
        let numChildren = children.length;

        let currentYOffsetGain = 0;
        let movingNodes = [];
        for (let i = 0; i < numChildren; i++) {
            let child = children.item(i);
            if (targetNodes.includes(child)) {
                let targetNodeHeight = child.offsetHeight;
                let animationCallback = listAnimations[child.getAttribute(awaitingRemovalAttribute)];
                animationCallback(child, targetNodeHeight, currentYOffsetGain);
                currentYOffsetGain += targetNodeHeight;
            } else if (currentYOffsetGain > 0) {
                animateTransform(child, null, "translateY(-" + currentYOffsetGain + "px)");
                movingNodes.push(child);
            }
        }

        setTimeout(onNodeRemovalAnimationEnd, animMillis, animatedList, targetNodes, movingNodes);
    }

    function onNodeRemovalAnimationEnd(animatedList, removedNodes, movingNodes) {
        let numRemovedNodes = removedNodes.length;
        for (let i = 0; i < numRemovedNodes; i++) {
            removedNodes[i].remove();
        }

        let numMovingNodes = movingNodes.length;
        for (let i = 0; i < numMovingNodes; i++) {
            let movingNode = movingNodes[i];
            movingNode.style.transition = null;
            movingNode.style.transform = null;
        }

        onAnimationFinished(animatedList);
    }

    function markNodeForInsertion(nodeToInsert, insertionAnimationID) {
        nodeToInsert.setAttribute(awaitingInsertionAttribute, insertionAnimationID);
        nodeToInsert.style.display = "none";
    }

    function markNodeForRemoval(nodeToRemove, removalAnimationID) {
        nodeToRemove.setAttribute(awaitingRemovalAttribute, removalAnimationID);
    }
})(window.AnimatedList = window.AnimatedList || {})