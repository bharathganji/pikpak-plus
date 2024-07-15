# create a client to pikpak
# 使用 pikpakapi, 需要 pip install requests
from .pikpakapi import PikPakApi
import json

# return client, config
def client_from_credit(credfile, proxy=None):
    #conf={}
    # credfile="client.json"
    try:
        with open(credfile, "r+") as f:
            print("=== read token from client.json ====")
            conf=json.load(f)
    except:
        return None, {}
        #conf={}
    client = PikPakApi(
        username=conf['user'],
        password=conf['password'],
    )
    # login, or refresh access
    if conf['access']: # 有 access token
        client.refresh_token=conf['refresh']
        client.access_token=conf['access']
        try:
            # result=client.offline_list()            
            # print(result) # 看看access token 是否有效
            print("Access token valid")
            client.refresh_access_token()
            print(__name__, "-"*20)
            return client, conf
        except Exception as e:
            print("Access token error: ", e)
            print(__name__, "----------------------------")
    if conf['refresh']: # 有 refresh token
        client.refresh_token=conf['refresh']
        try:
            client.refresh_access_token()
        except Exception as e:
            print("Refresh token error: ", e)
            print(__name__, "-------------------------")
            client.login()
    else:
        client.login()
    conf['access']=client.access_token
    conf['refresh']=client.refresh_token
    # write to config credfile="client.json"
    with open(credfile, "w+") as f:
        json.dump(conf, f)
    return client, conf

def client_from_password(username, password, credfile='', proxy=None):
    conf={}
    conf['user']=username
    conf['password']=password
    conf['proxy']=proxy
    conf['access']=None # 每个api调用需要
    conf['refresh']=None # 用来得到新的 access token
    client = PikPakApi(
        username=conf['user'],
        password=conf['password'],
    )
    # login, or refresh access
    client.login()
    conf['access']=client.access_token
    conf['refresh']=client.refresh_token
    # write to config credfile="client.json"
    if credfile:
        with open(credfile, "w+") as f:
            json.dump(conf, f)
    return client, conf

# create client from credfile, or by username, password
# the result config will save to credfile for next time
def create_client(credfile, username, password, proxy=None):
    try:
        with open(credfile, "r+") as f:
            print("=== read token from client.json ====")
            conf=json.load(f)
    except:
        conf={}
        #pass
    if not conf: # no config read
        conf['user']=username
        conf['password']=password
        conf['proxy']=proxy
        conf['access']=None # 每个api调用需要
        conf['refresh']=None # 用来得到新的 access token
    client = PikPakApi(
        username=conf['user'],
        password=conf['password'],
    )
    # login, or refresh access
    if conf['access']: # 有 access token
        client.refresh_token=conf['refresh']
        client.access_token=conf['access']
        try:
            # print(result) # 看看access token 是否有效
            return client
        except Exception as e:
            print("Access token error: ", e)
            print(__name__, "----------------------------")
    if conf['refresh']: # 有 refresh token
        client.refresh_token=conf['refresh']
        try:
            client.refresh_access_token()
        except Exception as e:
            print("Refresh token error: ", e)
            print(__name__, "-------------------------")
            client.login()
    else:
        client.login()
    conf['access']=client.access_token
    conf['refresh']=client.refresh_token
    # write to config credfile="client.json"
    with open(credfile, "w+") as f:
        json.dump(conf, f)
    return client