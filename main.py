import os
import re
import logging
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from ebaysdk.finding import Connection as Finding
from ebaysdk.exception import ConnectionError
import xml.etree.ElementTree as ET

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# eBay API configuration
try:
    ebay_api = Finding(appid=os.environ['EBAY_APP_ID'],
                       devid=os.environ['EBAY_DEV_ID'],
                       certid=os.environ['EBAY_CERT_ID'],
                       token=os.environ['EBAY_TOKEN'],
                       config_file=None)
except KeyError as e:
    logger.error(f"Missing eBay API credential: {str(e)}")
    raise

@app.route('/')
def home():
    return "Pokemon Card Price Checker API is running!"

def format_price(price):
    return f"${price:.2f}" if price is not None else "N/A"

def calculate_roi(buy_price, sell_price):
    logger.debug(f"Calculating ROI: buy_price={buy_price}, sell_price={sell_price}")
    if buy_price == 0:
        return "N/A" if sell_price == 0 else "∞"
    return f"{((sell_price - buy_price) / buy_price) * 100:.2f}%"

def sanitize_keywords(keywords):
    return re.sub(r'[^\w\s]', '', keywords).strip()

def calculate_ebay_fees(price):
    fee_percentage = 0.1255  # eBay fee percentage (12.55% as of 2023)
    return price * fee_percentage
def search_ebay_items(keywords):
    try:
        sanitized_keywords = sanitize_keywords(keywords)
        logger.info(f"Searching eBay for: {sanitized_keywords}")

        response = ebay_api.execute('findItemsAdvanced', {
            'keywords': sanitized_keywords,
            'categoryId': '183454',  # Pokemon Card category
            'itemFilter': [
                {'name': 'Condition', 'value': 'Used'},
            ],
            'sortOrder': 'EndTimeSoonest',
            'paginationInput': {
                'entriesPerPage': '100'
            }
        })

        logger.debug(f"Full eBay API response: {response.content}")

        try:
            root = ET.fromstring(response.content)
        except ET.ParseError as e:
            logger.error(f"Failed to parse XML: {e}")
            return {'error': 'XML Parsing error', 'details': str(e)}

        logger.debug(f"Parsed eBay data: {ET.tostring(root)}")

        ns = {'ns': 'http://www.ebay.com/marketplace/search/v1/services'}
        ack = root.find('.//ns:ack', namespaces=ns)

        if ack is None:
            logger.error("No 'ack' element found in the response")
            return {'error': 'eBay API error', 'details': 'No acknowledgement in response'}
        else:
            logger.debug(f"Ack value: {ack.text}")

        if ack.text != 'Success':
            error_message = "Unknown error"
            error_node = root.find('.//ns:errorMessage/ns:error/ns:message', namespaces=ns)
            if error_node is not None:
                error_message = error_node.text
            logger.error(f"eBay API error: {error_message}")
            return {'error': 'eBay API error', 'details': error_message}

        items = root.findall('.//ns:item', namespaces=ns)

        if not items:
            logger.warning(f"No items found for keywords: {sanitized_keywords}")
            return {'error': 'No results', 'details': 'No items found matching the search criteria'}

        prices = []
        recent_sales = []
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)

        for item in items:
            price_elem = item.find('.//ns:sellingStatus/ns:currentPrice', namespaces=ns)
            if price_elem is not None and price_elem.text is not None:
                price = float(price_elem.text)
                prices.append(price)

                end_time_elem = item.find('.//ns:listingInfo/ns:endTime', namespaces=ns)
                if end_time_elem is not None and end_time_elem.text is not None:
                    end_time = datetime.strptime(end_time_elem.text, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
                    if end_time > week_ago:
                        title_elem = item.find('.//ns:title', namespaces=ns)
                        title = title_elem.text if title_elem is not None else "Unknown"
                        recent_sales.append({
                            'price': price,
                            'date': end_time.strftime("%Y-%m-%d %H:%M:%S"),
                            'title': title
                        })

        if not prices:
            logger.warning(f"No valid prices found for keywords: {sanitized_keywords}")
            return {'error': 'No valid data', 'details': 'No valid price data found'}

        return {
            'average_price': sum(prices) / len(prices),
            'median_price': sorted(prices)[len(prices) // 2],
            'lowest_price': min(prices),
            'highest_price': max(prices),
            'num_listings': len(prices),
            'estimated_ebay_fees': calculate_ebay_fees(sum(prices) / len(prices)),
            'sales_velocity': len(recent_sales) / 7,  # sales per day
            'recent_sales': sorted(recent_sales, key=lambda x: x['date'], reverse=True)[:5]
        }

    except ConnectionError as e:
        logger.error(f"eBay API Connection Error: {str(e)}")
        return {'error': 'eBay API Connection error', 'details': str(e)}
    except Exception as e:
        logger.error(f"Unexpected error in search_ebay_items: {str(e)}")
        return {'error': 'Unexpected error', 'details': str(e)}

def analyze_results(data, page_price):
    logger.info(f"Analyzing results: data={data}, page_price={page_price}")

    ebay_avg = data['average_price']
    ebay_fees = data['estimated_ebay_fees']
    shipping_cost = 0.55  # Assume $0.55 for a standard envelope
    profit = ebay_avg - ebay_fees - shipping_cost - page_price
    roi = calculate_roi(page_price, ebay_avg)

    logger.debug(f"Calculated values: ebay_avg={ebay_avg}, ebay_fees={ebay_fees}, profit={profit}, roi={roi}")

    recent_sales = data.get('recent_sales', [])
    recent_sales_str = "\n    ".join([f"${sale['price']:.2f} on {sale['date']}" for sale in recent_sales[:5]])
    if not recent_sales_str:
        recent_sales_str = "No recent sales data available"

    analysis = f"""
Card: {data.get('card_name', 'Unknown')}

Current Market:
  Page Price: {format_price(page_price)}
  eBay Average: {format_price(ebay_avg)}
  eBay Median: {format_price(data.get('median_price'))}
  eBay Range: {format_price(data.get('lowest_price'))} - {format_price(data.get('highest_price'))}

Profit Analysis:
  Estimated eBay Fees: {format_price(ebay_fees)}
  Estimated Shipping: {format_price(shipping_cost)}
  Potential Profit: {format_price(profit)}
  ROI: {roi}

Market Insights:
  Number of Listings: {data.get('num_listings', 'N/A')}
  Estimated Sales/Day: {data.get('sales_velocity', 'N/A'):.2f}
  Market Saturation: {'High' if data.get('num_listings', 0) > 50 else 'Moderate' if data.get('num_listings', 0) > 20 else 'Low'}

Recent Sales:
    {recent_sales_str}
"""
    logger.debug(f"Generated analysis: {analysis}")
    return analysis
@app.route('/search')
def search():
    card_name = request.args.get('card_name', '')
    raw_page_price = request.args.get('page_price')

    try:
        page_price = float(raw_page_price) if raw_page_price else 0
    except ValueError:
        return jsonify({'error': 'Invalid page price'}), 400

    data = search_ebay_items(card_name)

    if 'error' in data:
        return jsonify({
            'success': False,
            'error': data['error'],
            'details': data['details']
        }), 200  # Changed from 400 to 200

    data['card_name'] = card_name
    data['page_price'] = page_price
    analysis = analyze_results(data, page_price)

    return jsonify({
        'success': True,
        'data': data,
        'analysis': analysis
    })
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))