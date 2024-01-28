import pandas as pd
import requests, json, os

apikey = os.getenv("JACKETT_API_KEY", "") #enter api key here
domain = os.getenv("JACKET_DOMAIN", "") #enter domain name here like http://jackett.example.com or http://120.120.120.120:9117

def indexerList():
    r = requests.get(domain+"/api/v2.0/indexers/?apikey="+apikey)
    j = r.json()
    configuredIndexersList = []

    # Iterate through the response data
    for indexer in j:
        if indexer['configured']:
            indexer_id = indexer['id']
            indexer_name = indexer['name']
            indexer_categories = [{'code': category['ID'], 'value': category['Name']} for category in indexer['caps']]
            indexer_List = {'code': indexer_id, 'value': indexer_name}
            # Append the formatted data to the list
            configuredIndexersList.append({'indexer': indexer_List, 'categories': indexer_categories})

    return configuredIndexersList


def searchQuery(searchTerm,categoryList,indexerList):
    print(searchTerm)
    print(categoryList)
    print(indexerList)
    categoryList=",".join(categoryList)
    indexerList=",".join(indexerList)
    if(categoryList=="" and indexerList==""):
        r = requests.get(
            domain + "/api/v2.0/indexers/all/results?apikey=" + apikey + "&Query=" + searchTerm)
    elif(categoryList==""):
        r = requests.get(
            domain + "/api/v2.0/indexers/all/results?apikey=" + apikey + "&Query=" + searchTerm + "&Tracker[]=" + indexerList)
    elif(indexerList==""):
        r = requests.get(
            domain + "/api/v2.0/indexers/all/results?apikey=" + apikey + "&Query=" + searchTerm + "&Category[]=" + categoryList)
    else:
        r = requests.get(
            domain + "/api/v2.0/indexers/all/results?apikey=" + apikey + "&Query=" + searchTerm + "&Category[]=" + categoryList + "&Tracker[]="
            + indexerList)

    j=json.loads(r.text)
    resultsdf=pd.json_normalize(j['Results'])
    if resultsdf.empty:
        return("Empty","No results found")

    resultsdf.drop(['FirstSeen','BlackholeLink','TrackerId','Guid','Category','Grabs','Description','RageID','TVDBId','Imdb','TMDb','Author','BookTitle','Poster','MinimumRatio','MinimumSeedTime','DownloadVolumeFactor','UploadVolumeFactor','Gain','Album','Artist','DoubanId','Label','Genres','Languages','TVMazeId','Track','TraktId','TrackerType','Subs','Publisher'],axis=1,inplace=True)

    #pd.set_option("display.max_rows", None, "display.max_columns", None)
    for idx in resultsdf.index:
        torrenturl=resultsdf._get_value(idx,'Link')
        infohash = resultsdf._get_value(idx, 'InfoHash')
        magneturi = resultsdf._get_value(idx,'MagnetUri')
        if magneturi is not None:
            resultsdf._set_value(idx,'Link',magneturi)
        elif torrenturl is not None:
            if infohash is not None:
                resultsdf._set_value(idx,'Link',"magnet:?xt=urn:btih:"+infohash.lower())
        torrenturl = resultsdf._get_value(idx, 'Link')
        resultsdf._set_value(idx,'Link',torrenturl)
    resultsdf.drop(['MagnetUri','InfoHash'],axis=1,inplace=True)

    return resultsdf