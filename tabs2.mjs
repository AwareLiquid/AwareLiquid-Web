const CDP = "http://127.0.0.1:9222"
const list = await (await fetch(CDP + "/json/list")).json()
console.log(JSON.stringify(list.filter(t => t.type === "page").map(t => t.url.slice(0, 80))))
