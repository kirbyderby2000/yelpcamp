const pageBtn = document.querySelector('#page-btn');
const pageInput = document.querySelector('#page');


pageBtn.addEventListener('click', e => {
    e.preventDefault();
    const pageTarget = pageInput.value;
    const query = pageBtn.getAttribute('data-q');




    window.location.href = `/admin?p=${pageTarget}${query ? `&q=${query}` : ''}`;

});