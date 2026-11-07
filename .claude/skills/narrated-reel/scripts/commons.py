"""Find football photos on Wikimedia Commons and read their licences; only needs Python's standard library.
  commons.py search "Zidane 2006 final"
  commons.py get photos/ "File name.jpg" ...     download 1920 px wide and add licence, author, source to licences.json"""
import json,sys,os,time,urllib.error,urllib.parse,urllib.request
API='https://commons.wikimedia.org/w/api.php'; UA={'User-Agent':'FootballStories101/1.0 (https://github.com/immigrationlabsg/football-stories-101)'}
def fetch(url):
    for wait in (0,5,15,30,60):      # Commons answers 429 when asked too quickly; wait and try again
        time.sleep(wait)
        try: return urllib.request.urlopen(urllib.request.Request(url,headers=UA)).read()
        except urllib.error.HTTPError as e:
            if e.code not in (429,503): raise
    raise SystemExit('Commons kept answering "too many requests": wait a few minutes and run this again')
def q(**k):
    k.update(format='json',action='query'); return json.loads(fetch(API+'?'+urllib.parse.urlencode(k)))
def row(p):
    i=p['imageinfo'][0]; m=i['extmetadata']; g=lambda n:m.get(n,{}).get('value','')
    return dict(file=p['title'][5:],licence=g('LicenseShortName'),author=g('Artist'),restrictions=g('Restrictions'),url=i['descriptionurl'],thumb=i.get('thumburl',i['url']),size=[i['width'],i['height']])
if sys.argv[1]=='search':
    r=q(generator='search',gsrnamespace=6,gsrlimit=25,gsrsearch=sys.argv[2],prop='imageinfo',iiprop='url|extmetadata|size',iiurlwidth=1920)
    for p in r.get('query',{}).get('pages',{}).values():
        if 'imageinfo' in p: i=row(p); print(i['file'],'|',i['licence'],'|',i['size'])
else:
    d=sys.argv[2]; os.makedirs(d,exist_ok=True); L=json.load(open('licences.json')) if os.path.exists('licences.json') else {}
    for t in sys.argv[3:]:
        p=next(iter(q(titles='File:'+t,prop='imageinfo',iiprop='url|extmetadata|size',iiurlwidth=1920)['query']['pages'].values())); i=row(p)
        L[t]={k:i[k] for k in ('licence','author','restrictions','url')}
        data=fetch(i['thumb']); open(os.path.join(d,t.replace(' ','_')),'wb').write(data)
        json.dump(L,open('licences.json','w'),indent=1)
        print(t,'|',i['licence'],'|',i['author'][:60]); time.sleep(6)
