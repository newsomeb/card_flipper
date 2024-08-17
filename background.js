chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPrices") {
        const { cardName, pagePrice } = request;
        const url = `https://my-pokemon-price-checker-7497ec7be8ee.herokuapp.com/search?card_name=${encodeURIComponent(cardName)}&page_price=${pagePrice}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log("Parsed data:", data);
                sendResponse(data);
            })
            .catch(error => {
                console.error("Error fetching or parsing data", error);
                sendResponse({
                    success: false,
                    error: "Network or parsing error",
                    details: error.message
                });
            });

        return true; // Indicates that the response will be sent asynchronously
    }
});