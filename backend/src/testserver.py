import requests

print(requests.get("http://127.0.0.1:8000/").json())

params1 = {
    "kind":"text",
    "file_name":"scraped_results.txt",
    "url":"https://www.texasblockchain.org/",

}

params2 = {
    "URL":"https://www.texasblockchain.org/",

}

params3 = {
    "dataset": "summary",
    "file_name":"scraped_results.txt",
    "org_name":"Texas Blockchain"
}
params4 = {
    "dataset": "events",
    "file_name":"test.png",
    "org_name":"Texas Blockchain"
}
params5 = {
    "kind":"image",
    "file_name":"test.png"
}

#print(requests.post("http://127.0.0.1:8000/push_file", json = params1).json())

#print(requests.post("http://127.0.0.1:8000/get_dataset", json = params3).json())

#print(requests.post("http://127.0.0.1:8000/push_file", json = params5).json())

#print(requests.post("http://127.0.0.1:8000/get_dataset", json = params4).json())

