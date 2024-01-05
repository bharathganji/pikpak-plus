import json
import client as pik


if __name__ == "__main__":

    import sys
    if len(sys.argv) >1:
        cred_filename= sys.argv[1]
    else:
        cred_filename="client.json"
    print(" read credit information from file ", cred_filename)
    print("="*30)
    client, conf=pik.client_from_credit(cred_filename, proxy=None)
    if not client:
        user=input("输入用户名: ")
        passwd=input("输入密码: ")
        proxy=input("HTTP代理: ")
        #credfilename=input("保存的文件名: ")
        client, conf=pik.client_from_password(user, passwd, cred_filename, proxy)
    if not client:
        print("登录无效")
        exit()
    #client=pik.create_client(cred_filename, config.user, config.passwd, proxy=None)
    print(json.dumps(client.get_user_info(), indent=4))
    print("=" * 30, end="\n\n")

    subdir=''
    while True:
        files=client.file_list(parent_id=subdir)
        for ff in files['files']:
            print("-", ff['name'])
            print("  -id:", ff['id'])
            print("  -parent:", ff['parent_id'])
            print("  -kind:", ff['kind'])
            print("  -size:", ff['size'])
            print("  -mime:", ff['mime_type'])
            #print(json.dumps(ff, indent=4))
        print("=" * 30, end="\n\n")
        subdir=input("input subdir id (Enter to quit):")
        if not subdir:
            break


    fileid=input("input file id to get download url:")
    if not fileid: # no file id input
        exit()

    files=client.get_download_url(fileid)
    print("link: ", files['web_content_link'])
    print("filename: ", files['name'])
    print("size: ", files['size'])
    print("="*30)
    with open("down.bash", "w") as f:
        f.write("#!/bin/bash\n")
        f.write("# download by weget\n")
        f.write(f"\nwget -O \"{files['name']}\" \"{files['web_content_link']}\"")
        f.write("\n")
    print(f"usage: . down.bash\n")

