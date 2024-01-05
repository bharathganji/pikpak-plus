# 一个 shell 命令处理程序
import json

_curdir='' # 当前目录
_parent='' # 上级目录
_files=[]  # 当前目录下的文件

def helpme(client, param):
    return  """commands: help, ls, cd, fetch, del
help: show help message
ls [dir index]: list file. 
   [dir index]是数字，表示当前目录的子目录。不输入表示当头目录
cd [dir index]: into directory.
fetch url: offline download
tasks: list offline task
trash [file index]: throw file or folder into trash
del [file index]: delete file or folder forever
download [file index]: get url for download file
"""

def listdir(client, param, parentdir):
    global _files
    files=client.file_list(parent_id=str(parentdir))
    ffs=[]
    for ff in files['files']:
        #print("  -id:", ff['id'])
        #print("  -parent:", ff['parent_id'])
        #print("  -kind:", ff['kind'])
        #print("  -mime:", ff['mime_type'])
        pp={"id": ff['id'], 'parent': ff['parent_id'],
            'kind': ff['kind'], 'mime': ff['mime_type']}
        if ff['kind']=="drive#folder":
            pp["name"]= ff['name']+"/"
        else:
            pp["name"]= ff['name']
        #print("-", ff['name'])
        #print("  -size:", ff['size'])
        ff['size']=int(ff['size'])
        if ff['size']<1024:
            pp['size']=f"{ff['size']}"
            ffs.append(pp)
            continue
        if ff['size']<1024*1024:
            pp['size']=f"{round(ff['size']/1024,2)}K"
            ffs.append(pp)
            continue
        if ff['size']<1024*1024*1024:
            pp['size']=f"{round(ff['size']/1024/1024,2)}M"
            ffs.append(pp)
            continue
        pp['size']=f"{round(ff['size']/1024/1024/1024,2)}G"
        ffs.append(pp)
        #print(json.dumps(ff, indent=4))
    i=0
    for pp in ffs:
        print(f"{i}: ", pp['name'], f"{pp['size']}")
        i+=1
    #print("=" * 30, end="\n\n")
    _files=ffs
    # return ffs
    return files

def changedir(client, param):
    global _curdir, _parent
    print("Current dir: ", _curdir)
    print("Parent dir: ", _parent)
    if not param: # 空， do nothing
        return 1
    if param=='..': # parent
        _curdir=_parent
        _parent=''
        return 0
    try:
        ii=int(param)
        _curdir=_files[ii]['id']
        _parent=_files[ii]['parent']
        print("Current dir: ", _files[ii]['name'])
    except Exception as e:
        print("No such directory", e, param, _files)

    return 0

def cleardir():
    global _curdir, _parent
      # Clear the values of _curdir and _parent
    _curdir = ''
    _parent = ''
    return 0

# 我是谁？
def myself(client, param):
    info=client.get_user_info()
    print(info['username'])
    return 0

# 添加一个远程下载任务
def offline_task(client, file_url,user_dir):
    #a=client.offline_download(file_url, parent_id)
    # param 中是下载的URL
    try:
        # print("Downloading: ", file_url)
        print("to: ", user_dir)
        a=client.offline_download(file_url,user_dir)
        print(a)
        return a
    except Exception as e:
        print("Error: ", e)
        return e
    #b=client.offline_list() # list offline tasks
    return 0

# 添加一个远程下载任务
def list_task(client, param):
    b=client.offline_list() # list offline tasks
    i=0
    for task in b['tasks']:
        print(i,':', task['name'])
        print(" -- ", str(task['progress']) + "%") 
        print(" -- ", task['message'])
        i+=1
    #print(b)
    return b

# 删除一个文件，或文件夹
def trash(client, param):
    if not param: # 空， do nothing
        return 1
    try:
        ii=int(param.strip())
        id=_files[ii]['id']
        
        a=client.delete_to_trash([id])
        #a=client.delete_forever([id])
        print(a)
    except Exception as e:
        print("Error: ", e)
    return 0


# 删除一个文件，或文件夹
def remove(client, param):
    if not param: # 空， do nothing
        return 1
    try:
        ii=int(param.strip())
        id=_files[ii]['id']
        #a=client.delete_to_trash([id])
        a=client.delete_forever([id])
        print(a)
    except Exception as e:
        print("Error: ", e)
    return 0

# 获取文件下载链接
def download(client, param, id):
    if not param: # 空， do nothing
        return 1
    try:
        # ii=int(param.strip())
        # id=_files[ii]['id']
        #a=client.delete_to_trash([id])
        print(id)
        files=client.get_download_url(str(id))
        # with open("down.bash", "w") as f:
        #     f.write("#!/bin/bash\n")
        #     f.write("# download by weget\n")
        #     f.write(f"\nwget -O \"{files['name']}\" \"{files['web_content_link']}\"")
        #     f.write("\n")
        # print(f"usage: . down.bash\n")
        print("link: ", files['web_content_link'])
    except Exception as e:
        print("Error: ", e)
    return files

def create_folder(client, user_dir):
    if not user_dir: # 空， do nothing
        return 1
    print("user_dir: ", user_dir)
    try:
        res = client.create_folder(user_dir)
        print(res['file'])
    except Exception as e:
        print("Error: ", e)
        return e
        
    return res['file']

cmds={
    "help": helpme,
    "ls": listdir,
    "cd": changedir,
    "me": myself,
    "fetch": offline_task,
    "tasks": list_task,
    "trash": trash,
    "del": remove,
    "download": download,
    "cleardir": cleardir,
    "create_folder": create_folder
}
