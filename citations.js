document.addEventListener('DOMContentLoaded', () => {
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    const urlParams = new URLSearchParams(window.location.search);
    const doi = urlParams.get('doi');

    if (!doi) {
        showError('No DOI provided');
        return;
    }

    fetchCitationsFromSemanticScholar(doi);

    async function fetchCitationsFromSemanticScholar(doi) {
        const url = `https://api.semanticscholar.org/graph/v1/paper/${doi}/citations?fields=citingPaper.title,citingPaper.authors,citingPaper.url&limit=50`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const data = await response.json();
            displayCitations(data);
        } catch (error) {
            console.error("Error fetching data:", error);
            showError("Error fetching citations. Please try again.");
        }
    }

    function displayCitations(data) {
        loadingDiv.style.display = 'none';
        resultsDiv.innerHTML = ''; // Clear previous content

        if (data && data.data && data.data.length > 0) {
            data.data.forEach((citation, index) => {
                const title = citation.citingPaper.title || "No title available";
                const authors = citation.citingPaper.authors
                    ? citation.citingPaper.authors
                        .map(author => author.name)
                        .join(", ")
                    : "Unknown authors";
                const url = citation.citingPaper.url || "#";

                const citationDiv = document.createElement("div");
                citationDiv.classList.add("citation");
                citationDiv.innerHTML = `
                    <strong>${index + 1}. ${url !== "#" ? `<a href="${url}" target="_blank">${title}</a>` : title}</strong><br>
                    <em>Authors:</em> ${authors}
                `;
                resultsDiv.appendChild(citationDiv);
            });
        } else {
            resultsDiv.innerHTML = "<p class='no-citations'>No citations found for this paper.</p>";
        }
    }

    function showError(message) {
        loadingDiv.style.display = 'none';
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
});


function displayCitations(data) {
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'none'; // Hide loading

    resultsDiv.innerHTML = ''; // Clear previous content

    if (data && data.data && data.data.length > 0) {
        data.data.forEach((citation, index) => {
            const title = citation.citingPaper.title || "No title available";

            const citationCard = document.createElement("div");
            citationCard.classList.add("citation-card");

            citationCard.innerHTML = `
                <h2>Paper ${index + 1}</h2>
                <p><strong>Title:</strong> ${title}</p>
            `;

            resultsDiv.appendChild(citationCard);
        });
    } else {
        resultsDiv.innerHTML = "<p class='no-citations'>No citations found for this paper.</p>";
    }
}
