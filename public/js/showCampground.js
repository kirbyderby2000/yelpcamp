import { PaginationController } from "/js/paginationController.js";


const template = document.querySelector('#review-template');

const reviewContainer = document.querySelector('#reviews-container');


const campId = template.getAttribute('data-campId');


function clearReviews() {
    const reviewCards = Array.from(reviewContainer.querySelectorAll('.review-card'));

    for (let index = 0; index < reviewCards.length; index++) {
        const card = reviewCards[index];
        card.remove();
    }
}

function createReviewCard(reviewData) {

    const templateClone = template.content.cloneNode(true);

    const reviewStars = templateClone.querySelector('.review-stars');
    const reviewAuthor = templateClone.querySelector('.review-author');
    const reviewComment = templateClone.querySelector('.review-comment');
    const reviewDeleteBtn = templateClone.querySelector('.review-delete-btn');

    reviewStars.setAttribute('data-rating', reviewData.rating);

    reviewAuthor.textContent = `Submitted By: ${reviewData.displayName}`;

    reviewComment.textContent = `Review: ${reviewData.comment}`;

    if (reviewData.isOwner) {
        reviewDeleteBtn.setAttribute('action', `/reviews/${reviewData.reviewId}?_method=DELETE`);
    }
    else {
        reviewDeleteBtn.remove();
    }

    reviewContainer.appendChild(templateClone);
}

function populateReviews(data) {
    const metaData = data.metadata;
    const reviewDatas = data.data;

    for (let index = 0; index < reviewDatas.length; index++) {
        const reviewData = reviewDatas[index];
        createReviewCard(reviewData);
    }
}



async function getReviewData(page) {
    const response = await fetch(`/api/campgrounds/${campId}/reviews?page=${page}`);

    if (!response.ok) {
        throw new Error(`Error encountered. Status ${response.status}`);
    }

    const data = await response.json();

    return data;
}

async function updatePage(targetPage) {
    const data = await getReviewData(targetPage);

    const totalPages = data.metadata.totalPages;

    clearReviews();

    populateReviews(data);

    return totalPages;
}


let startingPage = PaginationController.parseCurrentPage();


const campgroundPagination = new PaginationController(updatePage, { initToStartingPage: startingPage });










