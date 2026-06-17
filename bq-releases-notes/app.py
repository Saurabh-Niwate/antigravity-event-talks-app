import os
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityFeedReader/1.0'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        # Atom feed namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        releases = []
        for entry in root.findall('atom:entry', ns):
            id_val = entry.find('atom:id', ns)
            title_val = entry.find('atom:title', ns)
            updated_val = entry.find('atom:updated', ns)
            content_val = entry.find('atom:content', ns)
            
            releases.append({
                'id': id_val.text if id_val is not None else "",
                'title': title_val.text if title_val is not None else "",
                'updated': updated_val.text if updated_val is not None else "",
                'content': content_val.text if content_val is not None else ""
            })
            
        return jsonify({
            'status': 'success',
            'count': len(releases),
            'releases': releases
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f"Failed to fetch or parse feed: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Flask app is run locally on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
