const API_CANDIDATES = BoutiqueApp.API_ROOTS.map((root) => `${root}/api/voitures`);

let activeApiBase = 'http://localhost:8080';

let activeBrand = 'Tous';

const searchInput = document.querySelector('#searchInput');

function matchesSearch(car, query) {
    if (!query) return true;

    const haystack = [
        car.nom_modele,
        car.constructeur,
        car.categorie,
        ...(car.variantes || []).map((variant) => variant.nom)
    ]
        .join(' ')
        .toLowerCase();

    return haystack.includes(query);
}