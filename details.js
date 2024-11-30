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
        orcid: orcid, // Add this line to store the ORCID
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
    
    // Calculate total citations
    const totalCitations = citationCounts.reduce((a, b) => a + b, 0);
    
    // Calculate average citations
    const averageCitations = citationCounts.length > 0 ?
        (totalCitations / citationCounts.length).toFixed(2) : 0;
    
    // Calculate h-index
    const sortedCitations = [...citationCounts].sort((a, b) => b - a);
    let hIndex = 0;
    for (let i = 0; i < sortedCitations.length; i++) {
        if (sortedCitations[i] >= (i + 1)) {
            hIndex = i + 1;
        } else {
            break;
        }
    }
    
    // Calculate i10-index (number of publications with at least 10 citations)
    const i10Index = citationCounts.filter(count => count >= 10).length;
    
   // Update researcher name in the header
   const researcherNameElement = document.querySelector('.researcher-info h1');
   researcherNameElement.textContent = researcherData.name;

    // Prepare the basic info cards HTML
    const basicInfoDiv = document.getElementById('basicInfo');
    basicInfoDiv.innerHTML = `
      
        <div class="basic-info-card">
            <h3>Total Publications</h3>
            <p>${publications.length}</p>
        </div>
        <div class="basic-info-card">
            <h3>Total Citations</h3>
            <p>${totalCitations}</p>
        </div>
        <div class="basic-info-card">
            <h3>H-Index</h3>
            <p>${hIndex}</p>
        </div>
        <div class="basic-info-card">
            <h3>i10-Index</h3>
            <p>${i10Index}</p>
        </div>
    `;
}



// Configuration (add these at the top of the file)
const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1/paper/';


function displayPublications(researcherData) {
    // Ensure publicationAbstracts exists in localStorage
    if (!localStorage.getItem('publicationAbstracts')) {
        localStorage.setItem('publicationAbstracts', JSON.stringify({}));
    }
 
    const publicationsDiv = document.getElementById('publicationsList');
    let html = '<h2>Publications</h2>';
    
    // Collect all abstracts
    const allAbstracts = [];
    
    researcherData.publications
        .sort((a, b) => {
            const yearA = a.published?.['date-parts']?.[0]?.[0] || 0;
            const yearB = b.published?.['date-parts']?.[0]?.[0] || 0;
            return yearB - yearA; // Sort by year descending
        })
        .forEach((pub) => {
            // Store abstract in localStorage if it exists
            if (pub.DOI && pub.abstract) {
                const abstracts = JSON.parse(localStorage.getItem('publicationAbstracts') || '{}');
                abstracts[pub.DOI] = pub.abstract;
                localStorage.setItem('publicationAbstracts', JSON.stringify(abstracts));
                
                // Collect abstracts for keyword analysis
                allAbstracts.push(pub.abstract);
            }
            const authors = pub.author.map(author => {
                if (author.ORCID) {
                    const authorOrcid = author.ORCID.replace('http://orcid.org/', '');
                    return `<a href="details.html?orcid=${authorOrcid}&name=${encodeURIComponent(`${author.given} ${author.family}`)}" class="author-link">${author.given} ${author.family}</a>`;
                }
                return `${author.given} ${author.family}`;
            }).join(', ');
            // Fetch citation count
            const fetchCitationCount = async (doi) => {
                try {
                    const response = await fetch(`${SEMANTIC_SCHOLAR_API}${doi}/citations?fields=title&limit=1`);
                    const data = await response.json();
                    return data.total || 0;
                } catch (error) {
                    console.error('Error fetching citation count:', error);
                    return 0;
                }
            };
 
            // Add citation count to the publications
            let citationCountHtml = '<p><strong>Citations:</strong> Loading...</p>';
            
            if (pub.DOI) {
                fetchCitationCount(pub.DOI).then(count => {
                    const citationElement = document.querySelector(`[data-doi="${pub.DOI}"] .citation-count`);
                    if (citationElement) {
                        citationElement.textContent = `Citations: ${count}`;
                    }
                });
            }
            html += `
                <div class="publication-item" data-doi="${pub.DOI || ''}">
                    <h3>${pub.title ? pub.title[0] : 'Untitled'}</h3>
                    <p><strong>Authors:</strong> ${authors}</p>
                    <p><strong>Published:</strong> ${pub.published ? pub.published['date-parts'][0][0] : 'N/A'}</p>
                    <p><strong>DOI:</strong> <a href="https://doi.org/${pub.DOI}" target="_blank">${pub.DOI}</a></p>
                    ${pub['container-title'] ? `<p><strong>Journal:</strong> ${pub['container-title'][0]}</p>` : ''}
                    
                     <p><strong>Citations:</strong> ${pub['is-referenced-by-count'] || 'N/A'}</p>
                    
                    ${pub.DOI ? `
                        <div class="publication-actions">
                            ${pub.abstract ? `
                                <button class="toggle-abstract" data-doi="${pub.DOI}">About</button>
                            ` : ''}
                            <button class="view-citations" data-doi="${pub.DOI}">View Citations</button>
                        </div>
                        <div class="abstract-content" data-doi="${pub.DOI}" style="display: none;">
                            <p><strong>Abstract:</strong> ${pub.abstract || ''}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    
    publicationsDiv.innerHTML = html;
    // Add event listeners for abstract and citations toggle buttons
    publicationsDiv.addEventListener('click', async function(event) {
        // Abstract toggle
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
 
        // Citations view
        if (event.target.classList.contains('view-citations')) {
            const doi = event.target.getAttribute('data-doi');
            window.location.href = `citations.html?doi=${encodeURIComponent(doi)}`;
        }
    });


    
    displayResearchDomains(researcherData.publications);
     


     
    // Extract and display keywords
    // const keywords = extractKeywords(allAbstracts);
    // displayResearchDomains(researcherData.publications);
 }
 
 function extractResearchDomains(publications) {
    // Predefined research domains with associated keywords
    const domainDefinitions = [
        {
            name: 'Computer Science',
            keywords: ['machine learning', 'artificial intelligence', 'deep learning', 'neural networks', 'algorithm', 'data science', 'computer vision', 'natural language processing', 'deep neural', 'reinforcement learning']
        },
        {
            name: 'Biology',
            keywords: ['genomics', 'molecular biology', 'gene', 'protein', 'cellular', 'ecosystem', 'biodiversity', 'genetic', 'mutation', 'genome']
        },
        {
            name: 'Physics',
            keywords: ['quantum', 'particle physics', 'astronomy', 'cosmology', 'gravitational', 'relativity', 'nuclear', 'electromagnetic', 'wavelength', 'spectrum']
        },
        {
            name: 'Chemistry',
            keywords: ['molecular structure', 'chemical reaction', 'synthesis', 'catalyst', 'polymer', 'organic chemistry', 'inorganic', 'chemical bond', 'molecular weight', 'spectroscopy']
        },
        {
            name: 'Medical Research',
            keywords: ['clinical trial', 'medical treatment', 'disease', 'patient', 'diagnostic', 'therapeutic', 'epidemiology', 'medical intervention', 'health outcomes', 'pathology']
        },
        {
            name: 'Environmental Science',
            keywords: ['climate change', 'ecosystem', 'sustainability', 'environmental impact', 'biodiversity', 'conservation', 'pollution', 'renewable energy', 'carbon', 'ecological']
        },
        {
            name: 'Psychology',
            keywords: ['cognitive', 'behavioral', 'mental health', 'neuropsychology', 'social psychology', 'psychological', 'perception', 'emotional', 'psychological disorder', 'neurological']
        },
        {
            name: 'Economics',
            keywords: ['economic model', 'market', 'financial', 'economic policy', 'investment', 'economic growth', 'monetary', 'fiscal policy', 'economic analysis', 'economic development']
        },
        {
            name: 'Engineering',
            keywords: ['design', 'mechanical', 'electrical', 'structural', 'engineering solution', 'innovative design', 'engineering process', 'technical', 'system design', 'optimization']
        }
    ];
 
    // Combine all publication titles and abstracts
    const combinedText = publications
        .map(pub => `${pub.title ? pub.title[0] : ''} ${pub.abstract || ''}`)
        .join(' ')
        .toLowerCase();
 
    // Score domains based on keyword matches
    const domainScores = domainDefinitions.map(domain => {
        const matches = domain.keywords.filter(keyword => 
            combinedText.includes(keyword.toLowerCase())
        );
        
        return {
            name: domain.name,
            score: matches.length,
            matchedKeywords: matches
        };
    });
 
    // Sort domains by score and get top domains
    const topDomains = domainScores
        .sort((a, b) => b.score - a.score)
        .filter(domain => domain.score > 0)
        .slice(0, 3);  // Top 3 domains
 
    return topDomains;
 }
 
 function displayResearchDomains(publications) {
    const researchDomains = extractResearchDomains(publications);
 
    // Create or get the domains container
    let domainsContainer = document.getElementById('researchDomains');
    if (!domainsContainer) {
        domainsContainer = document.createElement('div');
        domainsContainer.id = 'researchDomains';
        domainsContainer.className = 'research-domains-container';
        
        // Insert it after the publications list
        const publicationsDiv = document.getElementById('publicationsList');
        publicationsDiv.insertAdjacentElement('afterend', domainsContainer);
    }
 
    // Create HTML for domains
    const domainsHtml = `
        <h3>Research Domains</h3>
        <div class="domains-list">
            ${researchDomains.map(domain => `
                <div class="domain-tag">
                    <span class="domain-name">${domain.name}</span>
                    <span class="domain-score" title="Number of matching keywords">${domain.score}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    domainsContainer.innerHTML = domainsHtml;
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