import time
from ebaysdk.finding import Connection as Finding
from ebaysdk.exception import ConnectionError
import statistics
from urllib.parse import quote_plus
from datetime import datetime, timedelta

def clean_search_term(term):
    # Remove unwanted characters but keep spaces and necessary characters
    term = term.replace("(", "").replace(")", "").replace("'", "").replace('"', "")
    return term

def search_ebay_items(keywords, condition='Used', sort_order='EndTimeSoonest', category_id='183454'):
    api = Finding(config_file="ebay.yaml", siteid="EBAY-US")

    # Clean the keywords before using them in search terms
    cleaned_keywords = clean_search_term(keywords)

    # List of search terms to try, from most specific to least
    search_terms = [
        cleaned_keywords,
        "Charizard VMAX Secret Champion's Path",
        "Charizard VMAX Champion's Path",
        "Charizard VMAX Secret",
        "Charizard VMAX",
    ]

    for search_term in search_terms:
        print(f"Searching for: {search_term}")

        api_request = {
            'keywords': search_term,
            'itemFilter': [
                {'name': 'Condition', 'value': condition},
            ],
            'sortOrder': sort_order,
            'paginationInput': {
                'entriesPerPage': 100
            },
            'categoryId': category_id  # Pokemon Card category
        }

        try:
            print(f"Executing eBay API request for: {search_term}")
            response = api.execute('findItemsAdvanced', api_request)

            print(f"API Response: {response.dict()}")

            items = response.reply.searchResult.item if hasattr(response.reply.searchResult, 'item') else []

            if items:
                result = process_items(items, search_term)
                result['original_search_term'] = keywords
                return result
            else:
                print(f"No items found for '{search_term}'")

        except ConnectionError as e:
            print(f"eBay API Connection Error: {str(e)}")
            break
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            break

    print(f"No results found for any variation of '{keywords}'")
    return {
        'lowest_price': None,
        'highest_price': None,
        'average_price': None,
        'median_price': None,
        'average_total_price': None,
        'estimated_ebay_fees': None,
        'estimated_profit': None,
        'num_listings': 0,
        'sales_velocity': 0,
        'search_term_used': keywords,
        'original_search_term': keywords,
        'recent_sales': []
    }

def process_items(items, search_term):
    prices = []
    shipping_prices = []
    recent_sales = []
    now = datetime.now()

    for item in items:
        price = float(item.sellingStatus.currentPrice.value)
        shipping = float(item.shippingInfo.shippingServiceCost.value) if hasattr(item.shippingInfo, 'shippingServiceCost') else 0
        total_price = price + shipping
        prices.append(price)
        shipping_prices.append(shipping)

        end_time = item.listingInfo.endTime
        if isinstance(end_time, str):
            end_time = datetime.strptime(end_time, "%Y-%m-%dT%H:%M:%S.%fZ")

        if now - end_time <= timedelta(days=7):
            recent_sales.append({
                'price': total_price,
                'date': end_time.strftime("%Y-%m-%d %H:%M:%S"),
                'title': item.title
            })

    if prices:
        avg_price = statistics.mean(prices)
        median_price = statistics.median(prices)
        avg_shipping = statistics.mean(shipping_prices)
        avg_total_price = avg_price + avg_shipping
        estimated_fees = calculate_ebay_fees(avg_total_price)
        return {
            'lowest_price': min(prices),
            'highest_price': max(prices),
            'average_price': avg_price,
            'median_price': median_price,
            'average_total_price': avg_total_price,
            'estimated_ebay_fees': estimated_fees,
            'estimated_profit': avg_total_price - estimated_fees,
            'num_listings': len(prices),
            'sales_velocity': len(prices) / 7,
            'search_term_used': search_term,
            'recent_sales': recent_sales[:5]
        }
    else:
        return {
            'lowest_price': None,
            'highest_price': None,
            'average_price': None,
            'median_price': None,
            'average_total_price': None,
            'estimated_ebay_fees': None,
            'estimated_profit': None,
            'num_listings': 0,
            'sales_velocity': 0,
            'search_term_used': search_term,
            'recent_sales': []
        }

def calculate_ebay_fees(price):
    fee_percentage = 0.1255
    fixed_fee = 0.30
    return price * fee_percentage + fixed_fee
