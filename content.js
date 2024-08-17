// Global variables
let dailyProfit = 0;

async function searchCard(cardName) {
    try {
        const pagePrice = await detectPagePrice();
        console.log(`Page price detected for ${cardName}: ${pagePrice}`);

        console.log("Sending message to background script");
        const response = await sendMessage({
            action: "getPrices",
            cardName: cardName,
            pagePrice: pagePrice
        });
        console.log("Full response object:", JSON.stringify(response, null, 2));

        if (response && response.success) {
            console.log("Successful response, data:", JSON.stringify(response.data, null, 2));
            showOverlay(response.data);
        } else {
            console.error('Error fetching prices:', response ? response.error : 'No response');
            showOverlay({
                error: true,
                analysis: `Error fetching price data: ${response ? response.error : 'Unknown error'}`,
                details: response ? response.details : 'No details available'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showOverlay({
            error: true,
            analysis: 'An error occurred while fetching price data.',
            details: error.message
        });
    }
}

// Function to detect the price on the current page
async function detectPagePrice() {
    console.log("Detecting page price...");

    const priceRegex = new RegExp('\\$\\d+(\\.\\d{2})?');

    // Try to find price in meta tags first
    const metaTags = document.getElementsByTagName('meta');
    for (let i = 0; i < metaTags.length; i++) {
        if (metaTags[i].getAttribute('property') === 'product:price:amount') {
            const price = parseFloat(metaTags[i].getAttribute('content'));
            console.log(`Detected price from meta tag: ${price}`);
            return price;
        }
    }

    // Search for price in the page content
    const pageText = document.body.innerText;
    const match = pageText.match(priceRegex);
    if (match) {
        const price = parseFloat(match[0].replace('$', ''));
        console.log(`Detected price from page content: ${price}`);
        return price;
    }

    console.log("No price detected on the page");
    return 0;
}

function showOverlay(data) {
    console.log("showOverlay called with data:", JSON.stringify(data, null, 2));

    // Remove any existing overlay
    const existingOverlay = document.getElementById('pokemon-price-overlay');
    if (existingOverlay) {
        document.body.removeChild(existingOverlay);
    }

    // Create the overlay
    const overlay = document.createElement('div');
    overlay.id = 'pokemon-price-overlay';

    // Style the overlay
    Object.assign(overlay.style, {
        position: 'fixed',
        left: '20px',
        bottom: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        zIndex: '10001',
        maxWidth: '300px',
        maxHeight: '80vh',
        overflowY: 'auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#333',
        transition: 'all 0.3s ease',
        opacity: '0',
        transform: 'translateY(20px)',
    });

    let content = '';
    if (data.error) {
        content = `
            <div style="color: red; font-weight: bold;">Error: ${data.error}</div>
            <div>${data.details || ''}</div>
        `;
    } else {
        content = `
            <div id="card-name" style="font-size: 16px; font-weight: 600; margin-bottom: 15px;">${data.card_name || 'Unknown Card'}</div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">Page Price:</span>
                <input type="number" id="page-price" value="${data.page_price || 0}" step="0.01" min="0">
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">eBay Median:</span>
                <span id="ebay-median">$${data.median_price?.toFixed(2) || 'N/A'}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">eBay Average:</span>
                <span>$${data.average_price?.toFixed(2) || 'N/A'}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">eBay Range:</span>
                <span>$${data.lowest_price?.toFixed(2) || 'N/A'} - $${data.highest_price?.toFixed(2) || 'N/A'}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">Estimated eBay Fees:</span>
                <input type="number" id="ebay-fees" value="${data.estimated_ebay_fees || 0}" step="0.01" min="0">
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">Shipping Cost:</span>
                <input type="number" id="shipping-cost" value="0.55" step="0.01" min="0">
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">Potential Profit:</span>
                <span id="potential-profit">$${(data.average_price - data.page_price - data.estimated_ebay_fees - 0.55).toFixed(2)}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">ROI:</span>
                <span id="roi">${((data.average_price - data.page_price - data.estimated_ebay_fees - 0.55) / data.page_price * 100).toFixed(2)}%</span>
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">Number of Listings:</span>
                <span>${data.num_listings || 'N/A'}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">Estimated Sales/Day:</span>
                <span>${data.sales_velocity?.toFixed(2) || 'N/A'}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 500; color: #555;">Market Saturation:</span>
                <span>${data.num_listings > 50 ? 'High' : data.num_listings > 20 ? 'Moderate' : 'Low'}</span>
            </div>
            <button id="recalculate-btn" style="margin-top: 10px;">Recalculate</button>
            <div style="margin-top: 20px;">
                <button id="record-purchase-btn">Record Purchase</button>
                <div id="profit-summary" style="margin-top: 10px;">Daily Profit: $${dailyProfit.toFixed(2)}</div>
            </div>
        `;
    }

    overlay.innerHTML = content;
    console.log("Overlay HTML created");

    // Add event listeners
    const recalculateBtn = overlay.querySelector('#recalculate-btn');
    if (recalculateBtn) {
        recalculateBtn.addEventListener('click', recalculateValues);
        console.log("Recalculate button listener added");
    } else {
        console.error("Recalculate button not found");
    }

    const recordPurchaseBtn = overlay.querySelector('#record-purchase-btn');
    if (recordPurchaseBtn) {
        recordPurchaseBtn.addEventListener('click', recordPurchase);
        console.log("Record Purchase button listener added");
    } else {
        console.error("Record Purchase button not found");
    }

    const inputs = overlay.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', recalculateValues);
    });
    console.log("Input listeners added");

    // Add a close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    Object.assign(closeButton.style, {
        position: 'absolute',
        right: '12px',
        top: '12px',
        border: 'none',
        background: 'none',
        fontSize: '24px',
        lineHeight: '1',
        color: '#999',
        cursor: 'pointer',
        padding: '0',
        transition: 'color 0.3s ease',
    });
    closeButton.onmouseover = () => closeButton.style.color = '#333';
    closeButton.onmouseout = () => closeButton.style.color = '#999';
    closeButton.onclick = () => document.body.removeChild(overlay);
    overlay.appendChild(closeButton);

    document.body.appendChild(overlay);
    console.log("Overlay appended to body");

    // Initial calculation
    recalculateValues();

    // Load profit data
    loadProfitData();

    // Add subtle animation
    setTimeout(() => {
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
    }, 10);
}

// Function to recalculate values
function recalculateValues() {
    const pagePriceElement = document.getElementById('page-price');
    const ebayMedianElement = document.getElementById('ebay-median');
    const ebayFeesElement = document.getElementById('ebay-fees');
    const shippingCostElement = document.getElementById('shipping-cost');
    const potentialProfitElement = document.getElementById('potential-profit');
    const roiElement = document.getElementById('roi');

    // Check if all elements exist before proceeding
    if (!pagePriceElement || !ebayMedianElement || !ebayFeesElement ||
        !shippingCostElement || !potentialProfitElement || !roiElement) {
        console.error('One or more elements not found in the DOM');
        return;
    }

    const pagePrice = parseFloat(pagePriceElement.value) || 0;
    const ebayMedian = parseFloat(ebayMedianElement.textContent.replace('$', '')) || 0;
    const ebayFees = parseFloat(ebayFeesElement.value) || 0;
    const shippingCost = parseFloat(shippingCostElement.value) || 0;

    const potentialProfit = ebayMedian - ebayFees - shippingCost - pagePrice;
    potentialProfitElement.textContent = `$${potentialProfit.toFixed(2)}`;

    let roi;
    if (pagePrice === 0) {
        roi = potentialProfit > 0 ? "∞" : "N/A";
    } else {
        roi = ((potentialProfit / pagePrice) * 100).toFixed(2) + "%";
    }
    roiElement.textContent = roi;
}

// Function to record a purchase and update daily profit
function recordPurchase() {
    const potentialProfitElement = document.getElementById('potential-profit');
    const profit = parseFloat(potentialProfitElement.textContent.replace('$', '')) || 0;

    dailyProfit += profit;
    updateProfitSummary();
    saveProfitData();
}

// Function to update the profit summary display
function updateProfitSummary() {
    const summaryElement = document.getElementById('profit-summary');
    if (summaryElement) {
        summaryElement.textContent = `Daily Profit: $${dailyProfit.toFixed(2)}`;
    }
}

// Function to save profit data to local storage
function saveProfitData() {
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    chrome.storage.local.get(['profitData'], function(result) {
        let profitData = result.profitData || {};
        profitData[today] = (profitData[today] || 0) + dailyProfit;
        chrome.storage.local.set({profitData: profitData}, function() {
            console.log('Profit data saved');
        });
    });
}

// Function to load profit data from local storage
function loadProfitData() {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(['profitData'], function(result) {
        let profitData = result.profitData || {};
        dailyProfit = profitData[today] || 0;
        updateProfitSummary();
    });
}

// Function to send a message to the background script
function sendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                console.log("Raw response in content script:", response);
                resolve(response);
            }
        });
    });
}

// Event listener for Alt+click text selection
document.addEventListener('click', (e) => {
    if (e.altKey) {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            searchCard(selectedText);
        }
    }
});

// Notification to user about how to use the extension
console.log("Pokemon Card Price Checker is active. Hold Alt and click on card name to check prices.");

// Load profit data when the script loads to initialize the daily profit
loadProfitData();