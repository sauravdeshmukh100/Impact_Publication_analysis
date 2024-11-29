// Configuration
const API_BASE_URL = 'https://api.crossref.org/works';
const MAILTO = 'your-email@domain.com'; // Replace with your email

// Utility functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('results').innerHTML = '';
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function isORCID(input) {
    // ORCID pattern: 0000-0000-0000-0000
    return /^\d{4}-\d{4}-\d{4}-\d{4}$/.test(input);
}

// Main search function
async function searchResearcher() {
    const searchInput = document.getElementById('searchInput').value.trim();
    
    if (!searchInput) {
        showError('Please enter a researcher name or ORCID');
        return;
    }

    showLoading();

    try {
        if (isORCID(searchInput)) {
            // Search by ORCID with complete data
            const response = await fetch(`${API_BASE_URL}?filter=orcid:${searchInput}&rows=1000&mailto=${MAILTO}`);
            const data = await response.json();
            displayORCIDResults(data, searchInput);
        } else {
            // Search by name with complete data
            const response = await fetch(`${API_BASE_URL}?query.author="${encodeURIComponent(searchInput)}"&rows=1000&mailto=${MAILTO}`);
            const data = await response.json();
            displayNameResults(data, searchInput);
        }
    } catch (error) {
        showError('Error fetching data. Please try again.');
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

function displayNameResults(data, searchName) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.classList.remove('hidden');
    const items = data.message.items;
    searchName = searchName.toLowerCase();

    if (items.length === 0) {
        showError('No researchers found with that name');
        return;
    }

    const authorMap = new Map();

    // First pass: identify all unique authors and their ORCIDs
    items.forEach(item => {
        if (item.author) {
            item.author.forEach(author => {
                if (author.ORCID) {
                    const authorName = `${author.given} ${author.family}`.toLowerCase();
                    if (authorName.includes(searchName)) {
                        const key = `${author.given} ${author.family}`;
                        const orcid = author.ORCID.replace('http://orcid.org/', '');
                        
                        if (!authorMap.has(key)) {
                            authorMap.set(key, {
                                name: key,
                                orcid: orcid,
                                fullName: authorName,
                                publications: []
                            });
                        }
                    }
                }
            });
        }
    });

    // Second pass: collect ALL publications for each author
    items.forEach(item => {
        if (item.author) {
            authorMap.forEach((authorData, authorName) => {
                if (item.author.some(a => 
                    a.ORCID?.replace('http://orcid.org/', '') === authorData.orcid
                )) {
                    authorData.publications.push(item);
                }
            });
        }
    });

    let html = '';
    authorMap.forEach(author => {
        // Store complete publication data for the details page
        sessionStorage.setItem(
            `researcher_${author.orcid}`, 
            JSON.stringify({
                name: author.name,
                publications: author.publications
            })
        );

        html += `
            <div class="researcher-card">
                <h3>${author.name}</h3>
                <p>ORCID: ${author.orcid}</p>
                <p>Publications: ${author.publications.length}</p>
                <button onclick="window.location.href='details.html?orcid=${author.orcid}&name=${encodeURIComponent(author.name)}'">
                    View Details
                </button>
            </div>
        `;
    });

    resultsDiv.innerHTML = html || '<p>No researchers found with matching name and ORCID</p>';
}

function displayORCIDResults(data, searchOrcid) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.classList.remove('hidden');
    const items = data.message.items;

    if (items.length === 0) {
        showError('No researcher found with that ORCID');
        return;
    }

    // Get all publications where the researcher is an author
    const publications = items.filter(item =>
        item.author?.some(a => 
            a.ORCID?.replace('http://orcid.org/', '') === searchOrcid
        )
    );

    // Get researcher info from the first publication
    const researcher = items[0].author.find(a => 
        a.ORCID && a.ORCID.replace('http://orcid.org/', '') === searchOrcid
    );

    if (researcher) {
        // Store complete publication data for the details page
        sessionStorage.setItem(
            `researcher_${searchOrcid}`,
            JSON.stringify({
                name: `${researcher.given} ${researcher.family}`,
                publications: publications
            })
        );

        resultsDiv.innerHTML = `
            <div class="researcher-card">
                <h3>${researcher.given} ${researcher.family}</h3>
                <p>ORCID: ${searchOrcid}</p>
                <p>Publications: ${publications.length}</p>
                <button onclick="window.location.href='details.html?orcid=${searchOrcid}&name=${encodeURIComponent(`${researcher.given} ${researcher.family}`)}'">
                    View Details
                </button>
            </div>
        `;
    } else {
        showError('Error retrieving researcher details');
    }
}
