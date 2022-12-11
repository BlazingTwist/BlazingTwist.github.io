((NodeUtils) => {

    /**
     * @param {Element} node
     * @returns {Element[]}
     */
    NodeUtils.getChildrenAsArray = function getChildrenAsArray(node) {
        let array = [];
        const childCount = node.children.length;
        for (let i = 0; i < childCount; i++) {
            array.push(node.children.item(i));
        }
        return array;
    }

    /***
     * @param {Element|Node} container
     * @param {string} tagString
     * @returns {HTMLElement|Element|null} child if found / null if not found
     */
    NodeUtils.findChildWithTag = function findChildWithTag(container, tagString) {
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

    /**
     * @param {Element[]} nodes
     * @param {string} tagName
     * @returns {Element|undefined}
     */
    NodeUtils.findByTagName = function findByTagName(nodes, tagName) {
        return nodes.find(node => node.tagName.toUpperCase() === tagName.toUpperCase());
    }

})(window.NodeUtils = window.NodeUtils || {});