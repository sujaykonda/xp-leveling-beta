var Discord = require("discord.js")
var auth = require("./auth.json")
var client = new Discord.Client();
client.on("ready", ()=>{
    console.log("Logged In")
})
client.login(auth.token)