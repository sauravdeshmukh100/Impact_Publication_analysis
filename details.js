// Configuration
const API_BASE_URL = 'https://api.crossref.org/works';
const MAILTO = 'your-email@domain.com'; // Replace with your email

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const orcid = urlParams.get('orcid');
const name = urlParams.get('name');




// Get researcher data from session storage or fetch if not available
async function getResearcherData() {
    let researcherData = sessionStorage.getItem(`researcher_${orcid}`);
    
    if (!researcherData) {
        // If data isn't in session storage, fetch it
        try {
            const response = await fetch(`${API_BASE_URL}?filter=orcid:${orcid}&rows=1000&mailto=${MAILTO}`);
            const data = await response.json();
            
            // Filter publications for this researcher
            const publications = data.message.items.filter(item =>
                item.author?.some(a => 
                    a.ORCID?.replace('http://orcid.org/', '') === orcid
                )
            );

            researcherData = {
                name: name,
                publications: publications
            };

            // Store in session storage
            sessionStorage.setItem(`researcher_${orcid}`, JSON.stringify(researcherData));
        } catch (error) {
            console.error('Error fetching researcher data:', error);
            showError('Error loading researcher data');
            return null;
        }
    } else {
        researcherData = JSON.parse(researcherData);
    }
    
    return researcherData;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.querySelector('.container').prepend(errorDiv);
}

function displayBasicInfo(researcherData) {
    const publications = researcherData.publications;
    const citationCounts = publications.map(pub => pub['is-referenced-by-count'] || 0);
    
    const totalCitations = citationCounts.reduce((a, b) => a + b, 0);
    const averageCitations = citationCounts.length > 0 ? 
        (totalCitations / citationCounts.length).toFixed(2) : 0;
    const highestCitations = Math.max(...citationCounts);
    const lowestCitations = Math.min(...citationCounts);

    const basicInfoDiv = document.getElementById('basicInfo');
    basicInfoDiv.innerHTML = `
        <h2>${researcherData.name}</h2>
        <p>ORCID: ${orcid}</p>
        <p>Total Publications: ${publications.length}</p>
        <p>Total Citations: ${totalCitations}</p>
    `;
}

function displayPublications(researcherData) {
    // Create a global or module-scoped object to store abstracts
    window.publicationAbstracts = window.publicationAbstracts || {};
 
    const publicationsDiv = document.getElementById('publicationsList');
    let html = '<h2>Publications</h2>';
    
    researcherData.publications
        .sort((a, b) => {
            const yearA = a.published?.['date-parts']?.[0]?.[0] || 0;
            const yearB = b.published?.['date-parts']?.[0]?.[0] || 0;
            return yearB - yearA; // Sort by year descending
        })
        .forEach((pub, index) => {
            // Store abstract in the global abstracts object
            if (pub.DOI && pub.abstract) {
                window.publicationAbstracts[pub.DOI] = pub.abstract;
            }
 
            const authors = pub.author.map(author => {
                if (author.ORCID) {
                    const authorOrcid = author.ORCID.replace('http://orcid.org/', '');
                    // Create link to details page for co-authors
                    return `<a href="details.html?orcid=${authorOrcid}&name=${encodeURIComponent(`${author.given} ${author.family}`)}" class="author-link">${author.given} ${author.family}</a>`;
                }
                return `${author.given} ${author.family}`;
            }).join(', ');
 
            html += `
                <div class="publication-item" data-doi="${pub.DOI || ''}">
                    <h3>${pub.title ? pub.title[0] : 'Untitled'}</h3>
                    <p><strong>Authors:</strong> ${authors}</p>
                    <p><strong>Published:</strong> ${pub.published ? pub.published['date-parts'][0][0] : 'N/A'}</p>
                    <p><strong>DOI:</strong> <a href="https://doi.org/${pub.DOI}" target="_blank">${pub.DOI}</a></p>
                    <p><strong>Citations:</strong> ${pub['is-referenced-by-count'] || 'N/A'}</p>
                    ${pub['container-title'] ? `<p><strong>Journal:</strong> ${pub['container-title'][0]}</p>` : ''}
                    
                    ${pub.abstract ? `
                        <button class="toggle-abstract" data-doi="${pub.DOI}">About</button>
                        <div class="abstract-content" data-doi="${pub.DOI}" style="display: none;">
                            <p><strong>Abstract:</strong> ${pub.abstract}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    
    publicationsDiv.innerHTML = html;
 
    // Add event listeners for abstract toggle buttons
    publicationsDiv.addEventListener('click', function(event) {
        if (event.target.classList.contains('toggle-abstract')) {
            const doi = event.target.getAttribute('data-doi');
            const abstractContent = document.querySelector(`.abstract-content[data-doi="${doi}"]`);
            
            if (abstractContent) {
                // Toggle visibility
                if (abstractContent.style.display === 'none') {
                    abstractContent.style.display = 'block';
                    event.target.textContent = 'Hide';
                } else {
                    abstractContent.style.display = 'none';
                    event.target.textContent = 'About';
                }
            }
        }
    });
 }
 
 // Helper function to retrieve an abstract by DOI
 function getPublicationAbstract(doi) {
    return window.publicationAbstracts?.[doi] || null;
 }
 

function createCitationsChart(publications) {
    const citationCounts = publications
        .map(pub => pub['is-referenced-by-count'] || 0);
        
    const highestCitation = Math.max(...citationCounts);
    const lowestCitation = Math.min(...citationCounts);
    const averageCitation = citationCounts.reduce((a, b) => a + b, 0) / citationCounts.length;
    new Chart(document.getElementById('citationsChart'), {
        type: 'bar',
        data: {
            labels: ['Highest Citations', 'Average Citations', 'Lowest Citations'],
            datasets: [{
                label: 'Citation Statistics',
                data: [highestCitation, averageCitation.toFixed(2), lowestCitation],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Citation Statistics'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Citations'
                    }
                }
            }
        }
    });
}

function createYearWiseCitationsChart(publications) {
    const yearCitations = {};
    
    publications.forEach(pub => {
        const year = pub.published?.['date-parts']?.[0]?.[0];
        if (year) {
            yearCitations[year] = (yearCitations[year] || 0) + (pub['is-referenced-by-count'] || 0);
        }
    });
    const years = Object.keys(yearCitations).sort();
    new Chart(document.getElementById('yearCitationsChart'), {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Citations per Year',
                data: years.map(year => yearCitations[year]),
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Year-wise Citations'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Citations'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                }
            }
        }
    });
}

function truncateTitle(title, maxLength = 20) {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

function createCitationPerPublicationChart(publications) {
    const citationsData = publications
        .map(pub => ({
            title: pub.title?.[0] || 'Untitled',
            citations: pub['is-referenced-by-count'] || 0
        }))
        .sort((a, b) => b.citations - a.citations);
    new Chart(document.getElementById('citationPerPublicationChart'), {
        type: 'bar',
        data: {
            labels: citationsData.map(pub => truncateTitle(pub.title)),
            datasets: [{
                label: 'Citations per Publication',
                data: citationsData.map(pub => pub.citations),
                backgroundColor: 'rgba(255, 159, 64, 0.6)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Citations per Publication'
                },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const index = items[0].dataIndex;
                            return citationsData[index].title;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Citations'
                    }
                }
            }
        }
    });
}

function createPublicationsTimelineChart(publications) {
    const yearCounts = {};
    publications.forEach(pub => {
        const year = pub.published?.['date-parts']?.[0]?.[0];
        if (year) {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
    });
    const years = Object.keys(yearCounts).sort();
    new Chart(document.getElementById('publicationsChart'), {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Publications per Year',
                data: years.map(year => yearCounts[year]),
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Publications Timeline'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Number of Publications'
                    }
                }
            }
        }
    });
}

// Initialize all visualizations
async function initializePage() {
    try {
        const researcherData = await getResearcherData();
        if (!researcherData) return;

        const publications = researcherData.publications;

        displayBasicInfo(researcherData);
        displayPublications(researcherData);
        
        createCitationsChart(publications);
        createYearWiseCitationsChart(publications);
        createCitationPerPublicationChart(publications);
        createPublicationsTimelineChart(publications);
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Error loading page data');
    }
}

// Start the page initialization
initializePage();




// Add this function at the bottom of details.js
function addCompareButton() {
    const compareButton = document.createElement('button');
    compareButton.textContent = 'Compare Researcher';
    compareButton.classList.add('compare-btn');
    compareButton.addEventListener('click', () => {
        window.location.href = `comparison.html?orcid=${orcid}&name=${encodeURIComponent(name)}`;
    });
    
    const basicInfoDiv = document.getElementById('basicInfo');
    basicInfoDiv.appendChild(compareButton);
}

// Modify initializePage to call this function
async function initializePage() {
    try {
        const researcherData = await getResearcherData();
        if (!researcherData) return;

        const publications = researcherData.publications;

        displayBasicInfo(researcherData);
        displayPublications(researcherData);
        
        createCitationsChart(publications);
        createYearWiseCitationsChart(publications);
        createCitationPerPublicationChart(publications);
        createPublicationsTimelineChart(publications);
        
        // Add the new compare button
        addCompareButton();
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Error loading page data');
    }
}