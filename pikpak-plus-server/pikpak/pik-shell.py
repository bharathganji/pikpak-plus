import json
import client as pik
import shell_cmds as cmd

def run_pik_shell():
    result = {}

    import sys
    if len(sys.argv) > 1:
        cred_filename = sys.argv[1]
    else:
        cred_filename = "client.json"
    print(" read credit information from file ", cred_filename)
    print("=" * 30)
    client, conf = pik.client_from_credit(cred_filename, proxy=None)
    if not client:
        user = ""
        passwd = ""
        proxy = ""
        client, conf = pik.client_from_password(user, passwd, cred_filename, proxy)
    if not client:
        print("登录无效")
        exit()
    print(json.dumps(client.get_user_info(), indent=4))
    print("=" * 30, end="\n\n")
    curdir = ''  # current directory
    res = cmd.cmds["help"](client, "param")

    result["message"] = "pik-shell.py executed successfully"
    result["result"] = res
    print(result,"--------")
    return json.dumps(result)

if __name__ == "__main__":
    print(run_pik_shell())
