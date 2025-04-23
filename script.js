// Configuration
const CONFIG = {
    GEMINI_API_KEY: "AIzaSyDkPjKP6JUE-R1AqsfxzBXwNGs5a0sJZ9w",
};


const dom = {
    form: document.getElementById('volunteerForm'),
    submitBtn: document.getElementById('submitBtn'),
    submitText: document.getElementById('submitText'),
    submitSpinner: document.getElementById('submitSpinner'),
    resultsSection: document.getElementById('resultsSection'),
    opportunitiesList: document.getElementById('opportunitiesList'),
    userNameBadge: document.getElementById('userNameBadge'),
    downloadPdfBtn: document.getElementById('downloadPdfBtn'),
};

// State
const state = {
    currentOpportunities: null,
    userData: null
};

async function generateOpportunities(data) {
    const prompt = `
    Suggest 3-5 real volunteer opportunities for a person with:
    - Name: ${data.name || 'Not specified'}
    - Location: ${data.location || 'Any location'}
    - Skills: ${data.skills || 'Not specified'}
    - Interests: ${data.interests || 'Not specified'}
    
    Please provide the opportunities in this exact JSON format:
    [
        {
            "title": "Opportunity Name",
            "organization": "Organization Name",
            "location": "Location",
            "description": "Detailed description of the opportunity",
            "skills": "Required skills",
            "contact": "Contact information"
        },
        ...
    ]
    
    Make sure the opportunities match the user's skills and interests when provided.
    Include real organizations and contact information when possible.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        const result = await response.json();
        
        if (!result.candidates || !result.candidates[0].content.parts[0].text) {
            throw new Error("Invalid response from API");
        }
        
        const responseText = result.candidates[0].content.parts[0].text;
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("Could not parse opportunities from response");
        }
        
        const jsonString = responseText.slice(jsonStart, jsonEnd);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate opportunities. Please try again.");
    }
}

// Display opportunities in the UI
function displayOpportunities(opportunities, userName) {
    dom.resultsSection.classList.remove('hidden');
    dom.userNameBadge.textContent = userName || 'You';
    dom.opportunitiesList.innerHTML = '';
    
    if (!opportunities || opportunities.length === 0) {
        dom.opportunitiesList.innerHTML = `
            <div class="opportunity-card">
                <p class="text-gray-400 text-center">No opportunities found matching your criteria.</p>
            </div>
        `;
        return;
    }
    
    opportunities.forEach(opp => {
        const oppElement = document.createElement('div');
        oppElement.className = 'opportunity-card';
        oppElement.innerHTML = `
            <h3 class="opportunity-title">${opp.title || 'Opportunity'}</h3>
            <div class="opportunity-meta">
                <span class="meta-badge" style="background-color: rgba(29, 78, 216, 0.2); color: #93c5fd;">${opp.organization || 'Organization'}</span>
                <span class="meta-badge" style="background-color: rgba(55, 65, 81, 0.8); color: #d1d5db;">${opp.location || 'Location'}</span>
            </div>
            <p class="opportunity-description">${opp.description || 'Description not available'}</p>
            <div class="opportunity-skills">
                <span class="meta-badge" style="background-color: rgba(5, 150, 105, 0.2); color: #6ee7b7;">Skills: ${opp.skills || 'Various'}</span>
                <span class="meta-badge" style="background-color: rgba(124, 58, 237, 0.2); color: #c4b5fd;">Contact: ${opp.contact || 'Not provided'}</span>
            </div>
        `;
        dom.opportunitiesList.appendChild(oppElement);
    });
}

// Generate PDF using jsPDF
function generatePDF(opportunities, userName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont('helvetica');
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text(`Volunteer Opportunities for ${userName || 'You'}`, 15, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    let y = 35;
    opportunities.forEach((opp, index) => {
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text(`${index + 1}. ${opp.title || 'Opportunity'}`, 15, y);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Organization: ${opp.organization || 'N/A'} | Location: ${opp.location || 'N/A'}`, 15, y + 7);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(opp.description || 'No description available', 15, y + 17, { maxWidth: 180 });
        
        doc.text(`Skills needed: ${opp.skills || 'Various'}`, 15, y + 30);
        doc.text(`Contact: ${opp.contact || 'Not provided'}`, 15, y + 37);
        
        y += 50;
        if (y > 250 && index < opportunities.length - 1) {
            doc.addPage();
            y = 20;
        }
    });
    
    return doc;
}

// Event Listeners
function setupEventListeners() {
    // Form submission
    dom.form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Show loading state
            dom.submitBtn.disabled = true;
            dom.submitSpinner.classList.remove('hidden');
            dom.submitText.textContent = 'Finding Opportunities...';
            dom.resultsSection.classList.add('hidden');
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                location: document.getElementById('location').value,
                skills: document.getElementById('skills').value,
                interests: document.getElementById('interests').value
            };
            
            // Generate opportunities
            const opportunities = await generateOpportunities(formData);
            
            // Display results
            displayOpportunities(opportunities, formData.name);
            
            // Store data for PDF
            state.currentOpportunities = opportunities;
            state.userData = formData;
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error generating opportunities');
        } finally {
            // Reset button
            dom.submitBtn.disabled = false;
            dom.submitSpinner.classList.add('hidden');
            dom.submitText.textContent = 'Find Opportunities';
        }
    });
    
    // Download PDF button
    dom.downloadPdfBtn.addEventListener('click', function() {
        if (!state.currentOpportunities || !state.userData) {
            alert('No opportunities to download');
            return;
        }
        
        const pdf = generatePDF(state.currentOpportunities, state.userData.name);
        pdf.save(`volunteer_opportunities_${state.userData.name || ''}.pdf`);
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});
