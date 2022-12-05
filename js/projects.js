((Projects) => {

    /**
     * @typedef ProjectEntry
     * @property {ProjectData} data
     * @property {HTMLElement} node
     */

    /**
     * @typedef ProjectData
     * @property {string} iconPath
     * @property {string} title
     * @property {string[]} tags
     * @property {Node} summary
     * @property {Node} body
     * @property {Node} buttons
     */

    /**
     * @type {ProjectEntry[]}
     */
    Projects.projectList = [];


    /**
     * @typedef TagButtonEntry
     * @property {HTMLElement} selectButton
     * @property {HTMLElement|Node|null} deselectButton
     */

    /**
     * maps tags to buttons that control tags
     * @type {Map<string, TagButtonEntry>}
     */
    Projects.tagButtons = new Map();

    /** @type {HTMLElement} */
    Projects.selectedFiltersElement = null;

    /** @type {string|null} */
    Projects.currentSearchText = null;

    /**
     * @param {ProjectData} projectEntry
     * @returns {HTMLDivElement}
     */
    function buildProjectNode(projectEntry) {
        let projectDiv = document.createElement("div");
        projectDiv.classList.add("project-container");

        let projectIcon = document.createElement("img");
        projectIcon.src = projectEntry.iconPath;
        projectIcon.classList.add("project-entry-icon");
        projectDiv.appendChild(projectIcon);

        let projectTitle = document.createElement("div");
        projectTitle.innerHTML = projectEntry.title;
        projectTitle.classList.add("project-entry-title");
        projectDiv.appendChild(projectTitle);

        let projectTags = document.createElement("div");
        projectTags.classList.add("project-entry-tags");
        for (let tagName of projectEntry.tags) {
            let singleTag = document.createElement("div");
            singleTag.classList.add("project-entry-tag");
            singleTag.innerHTML = tagName;
            singleTag.onclick = () => onTagSelectButtonPressed(tagName);
            projectTags.appendChild(singleTag);
        }
        projectDiv.appendChild(projectTags);

        let projectSummary = document.createElement("div");
        projectSummary.appendChild(projectEntry.summary.cloneNode(true));
        projectSummary.classList.add("project-entry-summary");
        projectDiv.appendChild(projectSummary);

        let projectBody = document.createElement("div");
        projectBody.appendChild(projectEntry.body.cloneNode(true));
        projectBody.classList.add("project-entry-body");
        projectDiv.appendChild(projectBody);

        let projectButtons = document.createElement("div");
        projectButtons.appendChild(projectEntry.buttons.cloneNode(true));
        projectButtons.classList.add("project-entry-buttons");
        projectDiv.appendChild(projectButtons);

        return projectDiv;
    }

    /**
     * @param {HTMLElement} projectsListElement
     */
    Projects.loadProjects = function loadProjects(projectsListElement) {
        for (let projectNode of NodeUtils.getChildrenAsArray(projectsListElement)) {
            let projectChildren = NodeUtils.getChildrenAsArray(projectNode);

            let iconNode = NodeUtils.findByTagName(projectChildren, "icon");
            let titleNode = NodeUtils.findByTagName(projectChildren, "title");
            let tagsNode = NodeUtils.findByTagName(projectChildren, "tags");
            let summaryNode = NodeUtils.findByTagName(projectChildren, "summaryBody");
            let bodyNode = NodeUtils.findByTagName(projectChildren, "descriptionBody");
            let buttonsNode = NodeUtils.findByTagName(projectChildren, "buttons");

            let tagNameList = NodeUtils.getChildrenAsArray(tagsNode).map(node => node.getAttribute("text"));

            const projectData = {
                iconPath: iconNode.getAttribute("iconPath"),
                title: titleNode.getAttribute("text"),
                tags: tagNameList,
                summary: summaryNode.children[0],
                body: bodyNode.children[0],
                buttons: buttonsNode.children[0]
            };

            Projects.projectList.push({
                data: projectData,
                node: buildProjectNode(projectData)
            });
        }
    }

    function onTagSelectButtonPressed(tagName) {
        let tagButtonObj = Projects.tagButtons.get(tagName);
        if (tagButtonObj.selectButton.hasAttribute("checked")) {
            onTagDeselectButtonPressed(tagName);
            return;
        }

        tagButtonObj.selectButton.setAttribute("checked", "true");
        tagButtonObj.deselectButton = tagButtonObj.selectButton.cloneNode(true);
        tagButtonObj.deselectButton.setAttribute("selected", "true");
        tagButtonObj.deselectButton.onclick = () => {
            onTagDeselectButtonPressed(tagName);
        };
        AnimatedList.appendNode(Projects.selectedFiltersElement, tagButtonObj.deselectButton);

        updateProjectFilters();
    }

    function onTagDeselectButtonPressed(tagName) {
        let tagButtonObj = Projects.tagButtons.get(tagName);
        if (tagButtonObj.deselectButton === null) {
            return;
        }

        tagButtonObj.selectButton.removeAttribute("checked");
        AnimatedList.removeNode(Projects.selectedFiltersElement, tagButtonObj.deselectButton);
        tagButtonObj.deselectButton = null;

        updateProjectFilters();
    }

    /**
     * @param {HTMLElement} modalElement
     * @param {string} tagsListID
     * @param {string} selectedFiltersListID
     */
    Projects.populateFilters = function populateFilters(modalElement, tagsListID, selectedFiltersListID) {
        let tagsListElement = document.getElementById(tagsListID);
        Projects.selectedFiltersElement = document.getElementById(selectedFiltersListID);
        let tagListChildren = NodeUtils.getChildrenAsArray(tagsListElement);
        for (const tagCategory of tagListChildren) {
            let categoryName = tagCategory.getAttribute("text");
            let tagStrings = NodeUtils.getChildrenAsArray(tagCategory).map(x => x.getAttribute("text"));

            let titleSpan = document.createElement("span");
            titleSpan.innerText = categoryName;
            titleSpan.classList.add("tag-category-text");
            modalElement.appendChild(titleSpan)

            let tagsFlexbox = document.createElement("div");
            tagsFlexbox.classList.add("tag-select-flex");
            for (let tagString of tagStrings) {
                let tagButton = document.createElement("div");
                tagButton.classList.add("tag-select-modal-button");
                tagButton.innerText = tagString;
                tagButton.onclick = () => {
                    onTagSelectButtonPressed(tagString)
                };
                tagsFlexbox.appendChild(tagButton);
                Projects.tagButtons.set(tagString, {
                    selectButton: tagButton,
                    deselectButton: null,
                });
            }
            modalElement.appendChild(tagsFlexbox);
        }
    }

    /**
     * @param {string|null} text
     */
    Projects.setSearchText = function (text) {
        if (Projects.currentSearchText !== text) {
            Projects.currentSearchText = text;
            updateProjectFilters();
        }
    }

    function updateProjectFilters() {
        let filterAllowedProjects = Projects.projectList;

        if (Projects.currentSearchText != null) {
            let regExp = RegExp(Projects.currentSearchText, 'i');
            filterAllowedProjects = filterAllowedProjects
                .filter(project => regExp.test(project.data.title || "") || regExp.test(project.data.summary.textContent || ""));
        }

        let selectedTagNames = Array.from(Projects.tagButtons.entries())
            .filter(tagEntry => tagEntry[1].selectButton.hasAttribute("checked"))
            .map(tagEntry => tagEntry[0]);
        console.log("filtering for tags: " + JSON.stringify(selectedTagNames));
        if (selectedTagNames.length > 0) {
            filterAllowedProjects = filterAllowedProjects
                .filter(project => project.data.tags.filter(tagName => selectedTagNames.includes(tagName)).length === selectedTagNames.length);
        }

        for (let project of Projects.projectList) {
            project.node.style.display = 'None';
        }
        for (let project of filterAllowedProjects) {
            project.node.style.display = null;
        }
    }

})(window.Projects = window.Projects || {});