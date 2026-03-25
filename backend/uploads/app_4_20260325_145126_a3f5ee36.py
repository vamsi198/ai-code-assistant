# app.py
from flask import Flask, request, render_template, jsonify
import joblib
import re, ipaddress, requests, whois
from urllib.parse import urlparse
from datetime import datetime

app = Flask(__name__)

# Load trained models
models = {
    "log_reg": joblib.load("log_reg.pkl"),
    "random_forest": joblib.load("random_forest.pkl"),
    "svm": joblib.load("svm.pkl"),
    "gradient_boosting": joblib.load("gradient_boosting.pkl"),
    "xgboost": joblib.load("xgboost.pkl")
}

# -------- Feature Extraction Functions ----------
def getDomain(url):
    domain = urlparse(url).netloc
    if re.match(r"^www.", domain):
        domain = domain.replace("www.", "")
    return domain

def havingIP(url):
    try:
        ipaddress.ip_address(url)
        return 1
    except:
        return 0

def haveAtSign(url):
    return 1 if "@" in url else 0

def getLength(url):
    return 0 if len(url) < 54 else 1

def getDepth(url):
    s = urlparse(url).path.split('/')
    return sum(1 for j in s if len(j) != 0)

def redirection(url):
    pos = url.rfind('//')
    return 1 if pos > 6 else 0

def httpDomain(url):
    return 1 if 'https' in urlparse(url).netloc else 0

shortening_services = r"bit\.ly|goo\.gl|tinyurl|t\.co|ow\.ly|is\.gd|buff\.ly|adf\.ly"

def tinyURL(url):
    return 1 if re.search(shortening_services, url) else 0

def prefixSuffix(url):
    return 1 if '-' in urlparse(url).netloc else 0

def domainAge(domain_name):
    try:
        creation_date = domain_name.creation_date
        expiration_date = domain_name.expiration_date
        if isinstance(creation_date, str):
            creation_date = datetime.strptime(creation_date, '%Y-%m-%d')
        if isinstance(expiration_date, str):
            expiration_date = datetime.strptime(expiration_date, '%Y-%m-%d')
        if not creation_date or not expiration_date:
            return 1
        ageofdomain = abs((expiration_date - creation_date).days)
        return 1 if (ageofdomain / 30) < 6 else 0
    except:
        return 1

def domainEnd(domain_name):
    try:
        expiration_date = domain_name.expiration_date
        if isinstance(expiration_date, str):
            expiration_date = datetime.strptime(expiration_date, '%Y-%m-%d')
        if not expiration_date:
            return 1
        today = datetime.now()
        end = abs((expiration_date - today).days)
        return 0 if (end / 30) < 6 else 1
    except:
        return 1

def iframe(response):
    if response == "":
        return 1
    return 0 if re.findall(r"[<iframe>|<frameBorder>]", response.text) else 1

def mouseOver(response):
    if response == "":
        return 1
    return 1 if re.findall("<script>.+onmouseover.+</script>", response.text) else 0

def rightClick(response):
    if response == "":
        return 1
    return 0 if re.findall(r"event.button ?== ?2", response.text) else 1

def forwarding(response):
    if response == "":
        return 1
    return 0 if len(response.history) <= 2 else 1

def featureExtraction(url):
    features = []
    features.append(havingIP(url))          # 1
    features.append(haveAtSign(url))        # 2
    features.append(getLength(url))         # 3
    features.append(getDepth(url))          # 4
    features.append(redirection(url))       # 5
    features.append(httpDomain(url))        # 6
    features.append(tinyURL(url))           # 7
    features.append(prefixSuffix(url))      # 8

    dns = 0
    try:
        domain_name = whois.whois(urlparse(url).netloc)
    except:
        dns = 1
        domain_name = None

    features.append(dns)                               # 9 DNS_Record
    features.append(1)                                 # 10 Web_Traffic (dummy)
    features.append(1 if dns == 1 else domainAge(domain_name))  # 11 Domain_Age
    features.append(1 if dns == 1 else domainEnd(domain_name))  # 12 Domain_End

    try:
        response = requests.get(url, timeout=2)
    except:
        response = ""

    features.append(iframe(response))       # 13 iFrame
    features.append(mouseOver(response))    # 14 Mouse_Over
    features.append(rightClick(response))   # 15 Right_Click
    features.append(forwarding(response))   # 16 Web_Forwards

    return [features]


# -------- Flask Routes ----------
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    url = request.form["url"]
    features = featureExtraction(url)

    results = {}
    for name, model in models.items():
        pred = model.predict(features)[0]
        results[name] = "Malicious" if pred == 1 else "Legitimate"

    return jsonify({"url": url, "results": results})

if __name__ == "__main__":
    app.run(debug=True)
