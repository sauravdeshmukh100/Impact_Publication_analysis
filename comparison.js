let firstResearcher = null;
let globalChartScales = {
    citationsStatistics: { max: 0 },
    yearWiseCitations: { max: 0 },
    citationsPerPublication: { max: 0 },
    publicationsTimeline: { max: 0 }
};

function initializeFirstResearcher() {
    const urlParams = new URLSearchParams(window.location.search);
    const orcid = urlParams.get('orcid');
    const name = urlParams.get('name');
    
    const storedData = sessionStorage.getItem(`researcher_${orcid}`);
    if (storedData) {
        firstResearcher = JSON.parse(storedData);
        displayFirstResearcherDetails(firstResearcher);
    }
}

function displayFirstResearcherDetails(researcherData) {
    const infoDiv = document.getElementById('firstResearcherInfo');
    const publicationsDiv = document.getElementById('firstResearcherPublications');
    
    const publications = researcherData.publications;
    const citationCounts = publications.map(pub => pub['is-referenced-by-count'] || 0);

    const totalCitations = researcherData.publications.reduce((sum, pub) => 
        sum + (pub['is-referenced-by-count'] || 0), 0);
    

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

    infoDiv.innerHTML = `
        <h2>${researcherData.name}</h2>
        <p>Total Publications: ${researcherData.publications.length}</p>
        <p>Total Citations: ${totalCitations}</p>
        <p>H-Index: ${hIndex}</p>
        <p>i10-Index: ${i10Index}</p>
        
    `;
    

    createChart('firstCitationsChart', 'bar', researcherData.publications, 'Citations Statistics');
    createChart('firstYearCitationsChart', 'line', researcherData.publications, 'Year-wise Citations');
    createChart('firstCitationPerPublicationChart', 'bar', researcherData.publications, 'Citations per Publication');
    createChart('firstPublicationsChart', 'line', researcherData.publications, 'Publications Timeline');
    

    displayPublications(researcherData.publications, 'firstResearcherPublications');
}

function displaySecondResearcherDetails(researcherData) {
    const infoDiv = document.getElementById('secondResearcherInfo');
    const chartsDiv = document.getElementById('secondResearcherCharts');
    const publicationsDiv = document.getElementById('secondResearcherPublications');
    
    const publications = researcherData.publications;
    const citationCounts = publications.map(pub => pub['is-referenced-by-count'] || 0);
    

    const totalCitations = researcherData.publications.reduce((sum, pub) => 
        sum + (pub['is-referenced-by-count'] || 0), 0);

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
    

    infoDiv.innerHTML = `
        <h2>${researcherData.name}</h2>
        <p>Total Publications: ${researcherData.publications.length}</p>
        <p>Total Citations: ${totalCitations}</p>
        <p>H-Index: ${hIndex}</p>
        <p>i10-Index: ${i10Index}</p>
    `;
    

    chartsDiv.classList.remove('hidden');
    

    createChart('secondCitationsChart', 'bar', researcherData.publications, 'Citations Statistics');
    createChart('secondYearCitationsChart', 'line', researcherData.publications, 'Year-wise Citations');
    createChart('secondCitationPerPublicationChart', 'bar', researcherData.publications, 'Citations per Publication');
    createChart('secondPublicationsChart', 'line', researcherData.publications, 'Publications Timeline');
    

    displayPublications(researcherData.publications, 'secondResearcherPublications');
}




    















    






function createChart(canvasId, type, publications, title) {
    const canvas = document.getElementById(canvasId);
    
    let chartData = {};
    switch(title) {
        case 'Citations Statistics':
            chartData = prepareCitationsStatisticsData(publications);
            updateGlobalScales('citationsStatistics', chartData.data.datasets[0].data);
            chartData.options.scales.y.max = globalChartScales.citationsStatistics.max;
            break;
        case 'Year-wise Citations':
            chartData = prepareYearWiseCitationsData(publications);
            updateGlobalScales('yearWiseCitations', chartData.data.datasets[0].data);
            chartData.options.scales.y.max = globalChartScales.yearWiseCitations.max;
            break;
        case 'Citations per Publication':
            chartData = prepareCitationsPerPublicationData(publications);
            updateGlobalScales('citationsPerPublication', chartData.data.datasets[0].data);
            chartData.options.scales.y.max = globalChartScales.citationsPerPublication.max;
            break;
        case 'Publications Timeline':
            chartData = preparePublicationsTimelineData(publications);
            updateGlobalScales('publicationsTimeline', chartData.data.datasets[0].data);
            chartData.options.scales.y.max = globalChartScales.publicationsTimeline.max;
            break;
    }
    
    new Chart(canvas, {
        type: type,
        data: chartData.data,
        options: chartData.options
    });
}

function updateGlobalScales(chartType, dataArray) {
    const maxValue = Math.max(...dataArray);
    const currentMaxValue = globalChartScales[chartType].max || 0;


    globalChartScales[chartType].max = Math.max(currentMaxValue, maxValue * 1.1);
}







function prepareCitationsStatisticsData(publications) {
    const citationCounts = publications.map(pub => pub['is-referenced-by-count'] || 0);
    const highestCitation = Math.max(...citationCounts);
    const lowestCitation = Math.min(...citationCounts);
    const averageCitation = citationCounts.reduce((a, b) => a + b, 0) / citationCounts.length;

    return {
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
    };
}

function prepareYearWiseCitationsData(publications) {
    const yearCitations = {};
    publications.forEach(pub => {
        const year = pub.published?.['date-parts']?.[0]?.[0];
        if (year) {
            yearCitations[year] = (yearCitations[year] || 0) + (pub['is-referenced-by-count'] || 0);
        }
    });
    const years = Object.keys(yearCitations).sort();

    return {
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
    };
}

function prepareCitationsPerPublicationData(publications) {
    const citationsData = publications
        .map(pub => ({
            title: pub.title?.[0] || 'Untitled',
            citations: pub['is-referenced-by-count'] || 0
        }))
        .sort((a, b) => b.citations - a.citations);

    return {
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
    };
}

function preparePublicationsTimelineData(publications) {
    const yearCounts = {};
    publications.forEach(pub => {
        const year = pub.published?.['date-parts']?.[0]?.[0];
        if (year) {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
    });
    const years = Object.keys(yearCounts).sort();

    return {
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
    };
}

function truncateTitle(title, maxLength = 20) {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

function displayPublications(publications, divId) {
    const publicationsDiv = document.getElementById(divId);
    let html = '<h3>Publications</h3>';

    publications
        .sort((a, b) => {
            const yearA = a.published?.['date-parts']?.[0]?.[0] || 0;
            const yearB = b.published?.['date-parts']?.[0]?.[0] || 0;
            return yearB - yearA;
        })
        .forEach(pub => {
            html += `
                <div class="publication-item">
                    <h4>${pub.title ? pub.title[0] : 'Untitled'}</h4>
                    <p><strong>Published:</strong> ${pub.published ? pub.published['date-parts'][0][0] : 'N/A'}</p>
                    <p><strong>DOI:</strong> <a href="https://doi.org/${pub.DOI}" target="_blank">${pub.DOI}</a></p>
                    <p><strong>Citations:</strong> ${pub['is-referenced-by-count'] || 'N/A'}</p>
                </div>
            `;
        });

    publicationsDiv.innerHTML = html;
}

function searchSecondResearcher() {
    const searchInput = document.getElementById('searchInput').value.trim();
    const searchResultsDiv = document.getElementById('searchResults');

    if (!searchInput) {
        searchResultsDiv.innerHTML = 'Please enter a name or ORCID';
        return;
    }


    fetch(`${API_BASE_URL}?query.author="${encodeURIComponent(searchInput)}"&rows=1000&mailto=${MAILTO}`)
        .then(response => response.json())
        .then(data => {
            const items = data.message.items;
            const authorMap = new Map();

            items.forEach(item => {
                if (item.author) {
                    item.author.forEach(author => {
                        if (author.ORCID) {
                            const key = `${author.given} ${author.family}`;
                            const orcid = author.ORCID.replace('http://orcid.org/', '');
                            
                            if (!authorMap.has(key)) {
                                authorMap.set(key, {
                                    name: key,
                                    orcid: orcid,
                                    publications: items.filter(item => 
                                        item.author.some(a => 
                                            a.ORCID?.replace('http://orcid.org/', '') === orcid
                                        )
                                    )
                                });
                            }
                        }
                    });
                }
            });

            let html = '';
            authorMap.forEach(author => {
                sessionStorage.setItem(
                    `researcher_${author.orcid}`, 
                    JSON.stringify({
                        name: author.name,
                        publications: author.publications
                    })
                );

                html += `
                    <div class="researcher-option">
                        <p>${author.name}</p>
                        <button onclick="selectSecondResearcher('${author.orcid}', '${author.name}')">Select</button>
                    </div>
                `;
            });

            searchResultsDiv.innerHTML = html || 'No researchers found';
        })
        .catch(error => {
            console.error('Error:', error);
            searchResultsDiv.innerHTML = 'Error searching researchers';
        });
}

function selectSecondResearcher(orcid, name) {
    const storedData = sessionStorage.getItem(`researcher_${orcid}`);
    if (storedData) {
        const researcherData = JSON.parse(storedData);
        displaySecondResearcherDetails(researcherData);
        

        document.getElementById('searchResults').innerHTML = '';
    } else {

        fetch(`${API_BASE_URL}?filter=orcid:${orcid}&rows=1000&mailto=${MAILTO}`)
            .then(response => response.json())
            .then(data => {
                const publications = data.message.items.filter(item =>
                    item.author?.some(a => 
                        a.ORCID?.replace('http://orcid.org/', '') === orcid
                    )
                );
                
                const researcherData = {
                    name: name,
                    publications: publications
                };
                

                sessionStorage.setItem(`researcher_${orcid}`, JSON.stringify(researcherData));
                
                displaySecondResearcherDetails(researcherData);
                

                document.getElementById('searchResults').innerHTML = '';
            })
            .catch(error => {
                console.error('Error fetching researcher data:', error);
                document.getElementById('error').textContent = 'Error loading researcher details';
                document.getElementById('error').classList.remove('hidden');
            });
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initializeFirstResearcher();
});