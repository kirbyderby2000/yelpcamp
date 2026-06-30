const paginationContainer = document.querySelector('#pagination-container')
const pageLinks = Array.from(document.querySelectorAll('.page-link'));

const firstPageButton = pageLinks[0];
const prevPageButton = pageLinks[1];

const pageButtons = pageLinks.slice(2, 7);

const nextPageButton = pageLinks[7];
const lastPageButton = pageLinks[8];





function setPageText(pageBtn, page) {
    pageBtn.innerHTML = page;
}

function setPageIndexAttribute(btn, index, totalPages) {
    btn.setAttribute('data-page', index);
}

function getPageIndexAttribute(btn) {
    const dataPage = btn.getAttribute('data-page');
    const dataPageInt = parseInt(dataPage);
    return dataPageInt;
}

function updatePagination(currentPage, totalPages) {

    if (totalPages === 0) {
        paginationContainer.classList.add('d-none');
    }

    setPageIndexAttribute(firstPageButton, 1);
    setPageIndexAttribute(prevPageButton, currentPage - 1);
    setPageIndexAttribute(nextPageButton, currentPage + 1);
    setPageIndexAttribute(lastPageButton, totalPages);

    lastPageButton.setAttribute('data-page', totalPages);

    let firstBtnIndex = Math.max(currentPage - 2, 1);

    if (totalPages <= pageButtons.length) {
        firstBtnIndex = 1;
    }
    else if (currentPage >= pageButtons.length && currentPage >= totalPages - pageButtons.length / 2) {
        firstBtnIndex = totalPages - pageButtons.length + 1;
    }

    for (let index = 0; index < pageButtons.length; index++) {
        const pageButton = pageButtons[index];
        const pageIndex = firstBtnIndex + index;
        setPageIndexAttribute(pageButton, pageIndex);
        setPageText(pageButton, pageIndex);

        if (pageIndex === currentPage) {
            pageButton.classList.add('active');
            pageButton.disabled = true;
        }
        else {
            pageButton.classList.remove('active');
            pageButton.disabled = false;
        }

        if (pageIndex > totalPages) {
            pageButton.classList.add('d-none');
            pageButton.disabled = true;
        } else {
            pageButton.classList.remove('d-none');
            pageButton.disabled = false;
        }
    }

    if (currentPage <= 1) {
        firstPageButton.disabled = true;
        prevPageButton.disabled = true;
        firstPageButton.classList.add('disabled');
        prevPageButton.classList.add('disabled');
    }
    else {
        firstPageButton.disabled = false;
        prevPageButton.disabled = false;
        firstPageButton.classList.remove('disabled');
        prevPageButton.classList.remove('disabled');
    }

    if (currentPage >= totalPages) {
        lastPageButton.disabled = true;
        nextPageButton.disabled = true;
        lastPageButton.classList.add('disabled');
        nextPageButton.classList.add('disabled');
    }
    else {
        lastPageButton.disabled = false;
        nextPageButton.disabled = false;
        lastPageButton.classList.remove('disabled');
        nextPageButton.classList.remove('disabled');
    }

    if (totalPages > 0) {
        paginationContainer.classList.remove('d-none');
    }

}


for (let index = 0; index < pageLinks.length; index++) {
    const pageButton = pageLinks[index];
    pageButton.addEventListener('click', e => {
        const targetElement = e.target.closest('.page-btn');
        const targetPage = getPageIndexAttribute(targetElement);
        const pageClickedEvent = new CustomEvent('paginationClicked', {
            detail: targetPage
        })
        window.dispatchEvent(pageClickedEvent);
    });
}


/**
 * Updates the current URL in the browser with the query parameter
 * @param {*} targetPage 
 * @param {*} pageQuery 
 */
function updatePageUrlQuery(targetPage, pageQuery = 'page', pushHistory = true) {
    // 1. Create an object representing the current URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // 2. Set or update your 'page' parameter
    urlParams.set(pageQuery, targetPage);

    // 3. Construct the new relative path string (e.g., "/campgrounds?page=2")
    const newRelativePathQuery = `${window.location.pathname}?${urlParams.toString()}`;

    // 4. Update the address bar seamlessly without refreshing the page!
    // Arguments: (stateObject, title, newUrl)
    if (pushHistory) {

        window.history.pushState({ page: targetPage }, '', newRelativePathQuery);
    }
    else {
        window.history.replaceState({ page: targetPage }, '', newRelativePathQuery);
    }
}



class PaginationController {

    static parseCurrentPage(pageQuery = 'page', forceInt = true) {
        let currentPage = parseInt(PaginationController.parseQueryParameter(pageQuery));
        if (isNaN(currentPage)) {
            currentPage = forceInt ? 1 : undefined;
        }
        return currentPage;
    }

    static parseQueryParameter(querySearch) {
        const queryString = window.location.search;

        const urlParams = new URLSearchParams(queryString);

        const val = urlParams.get(querySearch);
        return val;
    }

    constructor(updatePageHandler, { initToStartingPage = undefined, throttlePageUpdates = true, listenForPaginationInput = true } = {}) {
        this.updatePageDataHandler = updatePageHandler;
        this.currentPage = undefined;
        this.listening = false;

        // Tracks whether the current browser URL arrived with an initial page query parameter string attached
        this.hadInitialQueryOnLoad = window.location.search.includes('page=');

        this.onPageClickedEventHandler = this.onPageClickedEventHandler.bind(this);
        this.onPopStateChangedEventListener = this.onPopStateChangedEventListener.bind(this);

        this.throttlePageUpdates = throttlePageUpdates;

        if (initToStartingPage) {
            this.updatePage(initToStartingPage);
        }



        if (listenForPaginationInput) {
            this.listenForPagination(true);
        }
    }

    listenForPagination(toggle) {
        if (this.listening !== toggle) {
            this.listening = !this.listening;
            if (this.listening) {
                window.addEventListener('paginationClicked', this.onPageClickedEventHandler);
                window.addEventListener('popstate', this.onPopStateChangedEventListener);
            } else {
                window.removeEventListener('paginationClicked', this.onPageClickedEventHandler);
                window.removeEventListener('popstate', this.onPopStateChangedEventListener);
            }
        }
    }

    // Added a second flag parameter 'fromHistory' to identify history navigation actions
    async updatePage(pageIndex, fromHistory = false) {

        if (this.throttlePageUpdates && this.updatingInProgress) {
            return;
        }
        if (this.currentPage === pageIndex) {
            return;
        }

        this.updatingInProgress = true;

        this.currentPage = pageIndex;
        const totalPages = await this.updatePageDataHandler(pageIndex, this);
        this.totalPages = totalPages;
        this.#updatePaginationDisplay(pageIndex, totalPages, fromHistory);



        this.updatingInProgress = false;
    }


    #updatePaginationDisplay(currentPage, totalPages, fromHistory) {
        // 1. If this call originated from a back/forward click, do NOT rewrite history!
        if (!fromHistory) {
            // 2. Only push to stack if we already have an established query string trail, or if this isn't our very first load
            const shouldPush = this.hadInitialQueryOnLoad || this.currentPage !== 1;

            updatePageUrlQuery(currentPage, undefined, shouldPush);

            // Flip flag to true so all consecutive organic button clicks push onto history correctly
            this.hadInitialQueryOnLoad = true;
        }

        updatePagination(currentPage, totalPages);
    }

    onPageClickedEventHandler(e) {
        const targetPage = e.detail;
        this.updatePage(targetPage, false);
    }

    onPopStateChangedEventListener(e) {
        // Fixed syntax bug: reading from 'e.state' context, not global 'event'
        let targetPage = e.state && e.state.page;

        if (!targetPage) {
            targetPage = PaginationController.parseCurrentPage(undefined, true);
        }

        // Pass 'true' as the second argument to let updatePage know this is a browser history pop change event
        this.updatePage(targetPage, true);
    }

    togglePaginationDisplay(toggle) {
        if (toggle) {
            paginationContainer.classList.remove('d-none');
        }
        else {
            paginationContainer.classList.add('d-none');
        }
    }
}


export { PaginationController };