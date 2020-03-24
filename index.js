var Discord = require("discord.js")
var auth = require("./auth.json")
var imgProc = require("./ImageProcessing")
var client = new Discord.Client();
var prefix = "r!"

client.on("ready", ()=>{
    console.log("Logged In")
    
})
client.on("message", (msg) =>{
    const message = msg.content;
    if(message.startsWith(prefix)){
        const msgSplit = message.split();
        const command = msgSplit[0].substring(prefix.length)
        const args = msgSplit.splice(1);
        switch (command){
            case "displayImage":
                imgProc.overlayText("./EmptyXPBar.png", msg.author.username, 200, 200, "./newBar.png").then(()=>{
                    msg.reply("Image:", {files: ["./newBar.png"]})
                })
        }
    }
})
client.login(auth.token)