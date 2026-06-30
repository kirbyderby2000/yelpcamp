import { PaginationController } from "/js/paginationController.js";


const template = document.querySelector('#camp-template');

const campConatiner = document.querySelector('#camp-container');


function clearCamps() {
    const campCards = Array.from(campConatiner.querySelectorAll('.camp-card'));

    for (let index = 0; index < campCards.length; index++) {
        const card = campCards[index];
        card.remove();
    }
}

function createCampCard(cardData) {

    const templateClone = template.content.cloneNode(true);

    const campImg = templateClone.querySelector('.camp-img');
    const campTitle = templateClone.querySelector('.camp-title');
    const campLoc = templateClone.querySelector('.camp-loc');
    const campDesc = templateClone.querySelector('.camp-desc');
    const campLink = templateClone.querySelector('.camp-link');

    campImg.setAttribute('src', cardData.coverImage);
    campImg.setAttribute('alt', cardData.title);
    campTitle.textContent = cardData.title;
    campLoc.textContent = cardData.descriptionTruncated;
    campLink.setAttribute('href', `/campgrounds/${cardData._id}`);

    campConatiner.appendChild(templateClone);
}

function populateCamps(data) {
    const metaData = data.metadata;
    const campDatas = data.data;

    for (let index = 0; index < campDatas.length; index++) {
        const campData = campDatas[index];
        createCampCard(campData);
    }
}



async function getCampgroundData(page, queryString) {

    let url = `/api/campgrounds?page=${page}`;

    if (queryString) {
        url = url + `&q=${queryString}`
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Error encountered. Status ${response.status}`)
    }

    const data = await response.json();

    return data;
}

async function updatePage(targetPage) {

    const queryString = PaginationController.parseQueryParameter('q');

    const data = await getCampgroundData(targetPage, queryString);

    const totalPages = data.metadata.totalPages;

    clearCamps();

    populateCamps(data);

    return totalPages;
}


let startingPage = PaginationController.parseCurrentPage();


const campgroundPagination = new PaginationController(updatePage, { initToStartingPage: startingPage });










