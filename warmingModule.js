require('dotenv').config();
const { Worker } = require('worker_threads');

//general set up
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
discordClient.login(process.env.DISCORD_BOT_TOKEN);

//Database connection
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://SpatulaSoftware:jpTANtS4n59oqlam@spatula-software.tyas5mn.mongodb.net/?retryWrites=true&w=majority";
const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
let staticProxyDB;
let burnerAccountDB;
let days = 24 * 60 * 60 * 1000;
(async () => {
    try {
        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("\n\n\n         ██████  ██▓███   ▄▄▄     ▄▄▄█████▓ █    ██  ██▓    ▄▄▄           ██████  ▒█████    █████▒▄▄▄█████▓ █     █░ ▄▄▄       ██▀███  ▓█████ \n       ▒██    ▒ ▓██░  ██▒▒████▄   ▓  ██▒ ▓▒ ██  ▓██▒▓██▒   ▒████▄       ▒██    ▒ ▒██▒  ██▒▓██   ▒ ▓  ██▒ ▓▒▓█░ █ ░█░▒████▄    ▓██ ▒ ██▒▓█   ▀ \n       ░ ▓██▄   ▓██░ ██▓▒▒██  ▀█▄ ▒ ▓██░ ▒░▓██  ▒██░▒██░   ▒██  ▀█▄     ░ ▓██▄   ▒██░  ██▒▒████ ░ ▒ ▓██░ ▒░▒█░ █ ░█ ▒██  ▀█▄  ▓██ ░▄█ ▒▒███   \n         ▒   ██▒▒██▄█▓▒ ▒░██▄▄▄▄██░ ▓██▓ ░ ▓▓█  ░██░▒██░   ░██▄▄▄▄██      ▒   ██▒▒██   ██░░▓█▒  ░ ░ ▓██▓ ░ ░█░ █ ░█ ░██▄▄▄▄██ ▒██▀▀█▄  ▒▓█  ▄ \n       ▒██████▒▒▒██▒ ░  ░ ▓█   ▓██▒ ▒██▒ ░ ▒▒█████▓ ░██████▒▓█   ▓██▒   ▒██████▒▒░ ████▓▒░░▒█░      ▒██▒ ░ ░░██▒██▓  ▓█   ▓██▒░██▓ ▒██▒░▒████▒\n       ▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░ ▒▒   ▓▒█░ ▒ ░░   ░▒▓▒ ▒ ▒ ░ ▒░▓  ░▒▒   ▓▒█░   ▒ ▒▓▒ ▒ ░░ ▒░▒░▒░  ▒ ░      ▒ ░░   ░ ▓░▒ ▒   ▒▒   ▓▒█░░ ▒▓ ░▒▓░░░ ▒░ ░\n       ░ ░▒  ░ ░░▒ ░       ▒   ▒▒ ░   ░    ░░▒░ ░ ░ ░ ░ ▒  ░ ▒   ▒▒ ░   ░ ░\n\n\n");
        staticProxyDB = mongoClient.db('Spatula-Software').collection('staticProxies');
        burnerAccountDB = mongoClient.db('Spatula-Software').collection('burnerAccounts');
        
        //start daily tasks
        RunDailyTasks();
    } catch(error){
        await mongoClient.close();
        console.log("Mongo Connection " + error);
    }
})();

//get log channel
let warmingLogChannel;
discordClient.on('ready', async () => {
    try {
        warmingLogChannel = discordClient.channels.cache.get('1196915422042259466');
        if(warmingLogChannel == null){
            warmingLogChannel = await discordClient.channels.fetch('1196915422042259466');
        }
    } catch (error) {
        console.log('Error fetching channel: ' + error)
    }
});

// Define a global error handler
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    warmingLogChannel.send('Uncaught error: ' + error);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    warmingLogChannel.send('Uncaught rejection: ' + reason);
});

//start warming accs for the day
const warmAccs = async() => {
    try {
        //!remove last active requirement for {NextWarming: {$lte: Date.now()}, LastActive: null}  -   We don't want to warm active accs
        const warmingAccounts = await burnerAccountDB.find({LastActive: 10000000000000}).toArray();
        for(let i = 0; i < warmingAccounts.length; i++){
            await warmingLogChannel.send('new warmer: ' + warmingAccounts[i].Username);
            let randomMilliseconds;

            if(warmingAccounts[i].LastActive == 10000000000000){//language not changed
                let warmer = new Worker('./initialAccountSetUp.js', { workerData:{
                    username: warmingAccounts[i].Username,
                    password: warmingAccounts[i].Password,
                    proxy: warmingAccounts[i].Proxy,
                    cookies: warmingAccounts[i].Cookies,
                    platform: warmingAccounts[i].Platform,
                    changeLanguage: (warmingAccounts[i].Start < Date.now() - (2 * days))
                }});

                if(warmingAccounts[i].Start < Date.now() - (2 * days)){
                    await warmingLogChannel.send('Language Change Attempt: ' + warmingAccounts[i].Username);
                }

                warmer.on('message', async (message) => {
                    if(message.cookies != null && message.cookies != []){
                        await burnerAccountDB.updateOne({Username: warmingAccounts[i].Username}, {$set: {Cookies: message.cookies}});
                        await warmingLogChannel.send('updating cookies for: ' + warmingAccounts[i].Username);//!Testing and such
                    }else if(message.action == 'ban'){

                        //decrease the proxy account num before deleting account
                        const oldAccountObj = await burnerAccountDB.findOne({Username: message.username});
                        await staticProxyDB.updateOne({Proxy: oldAccountObj.Proxy}, {$inc: {TotalFacebookBurnerAccounts: -1}});
                
                        //Delete the burner account
                        await burnerAccountDB.deleteOne({_id: oldAccountObj._id});
                    }else if(message.languageChange == true){
                        await burnerAccountDB.updateOne({Username: warmingAccounts[i].Username}, {$set: {LastActive: Date.now()}});
                        await warmingLogChannel.send('Language Change Success: ' + warmingAccounts[i].Username);//!Testing and such
                    }
                }); 

                // Random number of milliseconds between 3 and 4 days
                randomMilliseconds = Math.floor(Math.random() * (1 * days) + 2 * days);
            }/*else{
                let warmer = new Worker('./warmAccount.js', { workerData:{
                    username: warmingAccounts[i].Username,
                    password: warmingAccounts[i].Password,
                    proxy: warmingAccounts[i].Proxy,
                    cookies: warmingAccounts[i].Cookies,
                    platform: warmingAccounts[i].Platform,
                }});

                warmer.on('message', async (message) => {
                    if(message.cookies != null && message.cookies != []){
                        await burnerAccountDB.updateOne({Username: warmingAccounts[i].Username}, {$set: {Cookies: message.cookies}});
                        await warmingLogChannel.send('updating cookies for: ' + warmingAccounts[i].Username);//!Testing and such
                    }else if(message.action == 'ban'){

                        //decrease the proxy account num before deleting account
                        const oldAccountObj = await burnerAccountDB.findOne({Username: message.username});
                        await staticProxyDB.updateOne({Proxy: oldAccountObj.Proxy}, {$inc: {TotalFacebookBurnerAccounts: -1}});
                
                        //Delete the burner account
                        await burnerAccountDB.deleteOne({_id: oldAccountObj._id});
                    }
                }); 

                // Random number of milliseconds between 5 and 7 days
                randomMilliseconds = Math.floor(Math.random() * (2 * days) + 5 * days);
            }*/

            await burnerAccountDB.updateOne({_id: warmingAccounts[i]._id}, {$set: {NextWarming: Date.now() + randomMilliseconds}});

            //wait for a calculated interval
            const randomInterval = Math.random() * ((86000000/warmingAccounts.length) * 0.35) + ((86000000/warmingAccounts.length) * 0.65);
            await new Promise(r => setTimeout(r, randomInterval));
        }
        await warmingLogChannel.send("Warming Script Finish");
    } catch (error) {
        await warmingLogChannel.send("Error Warming Account: " + error);
        console.log("Error Warming Account: " + error);
    }
}

//run daily tasks at the same time every day
const RunDailyTasks = () => {
    warmAccs();

    setTimeout(async () => {
        await warmingLogChannel.send("Run Daily Warming");
        RunDailyTasks();
    }, 86400000) //24 hours
}