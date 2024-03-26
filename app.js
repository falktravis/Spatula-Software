require('dotenv').config();
const { Worker, workerData } = require('worker_threads');

//general set up
const fs = require('node:fs');
const path = require('node:path');
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
discordClient.login(process.env.DISCORD_BOT_TOKEN);

//Database connection
const { MongoClient, ServerApiVersion } = require('mongodb');
const { Console } = require('console');
const { log } = require('util');
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
let userDB;
let taskDB;
let days = 24 * 60 * 60 * 1000;
(async () => {
    try {
        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("\n\n\n         ██████  ██▓███   ▄▄▄     ▄▄▄█████▓ █    ██  ██▓    ▄▄▄           ██████  ▒█████    █████▒▄▄▄█████▓ █     █░ ▄▄▄       ██▀███  ▓█████ \n       ▒██    ▒ ▓██░  ██▒▒████▄   ▓  ██▒ ▓▒ ██  ▓██▒▓██▒   ▒████▄       ▒██    ▒ ▒██▒  ██▒▓██   ▒ ▓  ██▒ ▓▒▓█░ █ ░█░▒████▄    ▓██ ▒ ██▒▓█   ▀ \n       ░ ▓██▄   ▓██░ ██▓▒▒██  ▀█▄ ▒ ▓██░ ▒░▓██  ▒██░▒██░   ▒██  ▀█▄     ░ ▓██▄   ▒██░  ██▒▒████ ░ ▒ ▓██░ ▒░▒█░ █ ░█ ▒██  ▀█▄  ▓██ ░▄█ ▒▒███   \n         ▒   ██▒▒██▄█▓▒ ▒░██▄▄▄▄██░ ▓██▓ ░ ▓▓█  ░██░▒██░   ░██▄▄▄▄██      ▒   ██▒▒██   ██░░▓█▒  ░ ░ ▓██▓ ░ ░█░ █ ░█ ░██▄▄▄▄██ ▒██▀▀█▄  ▒▓█  ▄ \n       ▒██████▒▒▒██▒ ░  ░ ▓█   ▓██▒ ▒██▒ ░ ▒▒█████▓ ░██████▒▓█   ▓██▒   ▒██████▒▒░ ████▓▒░░▒█░      ▒██▒ ░ ░░██▒██▓  ▓█   ▓██▒░██▓ ▒██▒░▒████▒\n       ▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░ ▒▒   ▓▒█░ ▒ ░░   ░▒▓▒ ▒ ▒ ░ ▒░▓  ░▒▒   ▓▒█░   ▒ ▒▓▒ ▒ ░░ ▒░▒░▒░  ▒ ░      ▒ ░░   ░ ▓░▒ ▒   ▒▒   ▓▒█░░ ▒▓ ░▒▓░░░ ▒░ ░\n       ░ ░▒  ░ ░░▒ ░       ▒   ▒▒ ░   ░    ░░▒░ ░ ░ ░ ░ ▒  ░ ▒   ▒▒ ░   ░ ░\n\n\n");
        staticProxyDB = mongoClient.db('Spatula-Software').collection('staticProxies');
        burnerAccountDB = mongoClient.db('Spatula-Software').collection('burnerAccounts');
        userDB = mongoClient.db('Spatula-Software').collection('Users');
        taskDB = mongoClient.db('Spatula-Software').collection('Tasks');

        //integration testing accounts - {Start: 1709527992829}
        //regular accounts - {Start: 1709786152699}
    } catch(error){
        await mongoClient.close();
        console.log("Mongo Connection " + error);
    }
})();

//Platform Array
const platforms = [
    "Windows",
    "macOS",
    "Linux"
];

//command set up
discordClient.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		discordClient.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

//get log channel
let logChannel;
let warmingLogChannel;
discordClient.on('ready', async () => {
    try {
        logChannel = discordClient.channels.cache.get('1091532766522376243');
        if(logChannel == null){
            logChannel = await discordClient.channels.fetch('1091532766522376243');
        }
        
        warmingLogChannel = discordClient.channels.cache.get('1196915422042259466');
        if(warmingLogChannel == null){
            warmingLogChannel = await discordClient.channels.fetch('1196915422042259466');
        }

        RunDailyTasks();
    } catch (error) {
        console.log('Error fetching channel: ' + error)
    }
});

// Define a global error handler
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    logChannel.send('Uncaught error: ' + error);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logChannel.send('Uncaught rejection: ' + reason);
});

//worker login listening function
const facebookListener = async (message, task, user) => {
    try {
        if(message.action == 'rotateAccount'){
            //set lastActive to now, account is no longer in use
            await burnerAccountDB.updateOne({Username: message.username}, {$set: {LastActive: Date.now()}});
            if(message.cookies != null && message.cookies != []){
                await burnerAccountDB.updateOne({Username: message.username}, {$set: {Cookies: message.cookies}});
            }
        }else if(message.action == 'languageWrong'){
            await burnerAccountDB.updateOne({Username: message.username}, {$set: {LastActive: 10000000000000}});
        }else if(message.action == 'ban'){
    
            //decrease the proxy account num before deleting account
            const oldAccountObj = await burnerAccountDB.findOne({Username: message.username});
            await staticProxyDB.updateOne({Proxy: oldAccountObj.Proxy}, {$inc: {TotalFacebookBurnerAccounts: -1}});
    
            //Delete the burner account
            await burnerAccountDB.deleteOne({_id: oldAccountObj._id});
    
            //check account:task ratio
            let numAccs = await burnerAccountDB.countDocuments({LastActive: {$ne: 10000000000000}});
            let numTasks = (await taskDB.countDocuments({}))
            if(numAccs < numTasks * 1.5){
                logChannel.send("BURNER ACCOUNTS LOW Accounts: " + numAccs + " Tasks: " + numTasks + " @everyone");
            }else if(numAccs < numTasks){
                logChannel.send("BURNER ACCOUNTS OUT @everyone");
            }
        }
    
        if(message.action == 'ban' || message.action == 'rotateAccount' || message.action == 'languageWrong'){
    
            //get a new account to send back to the task
            const newAccountObj = await getFacebookAccount();
    
            if(newAccountObj != null){
                //update taskDB for new acc
                await taskDB.updateOne({UserId: user, Name: task}, {$set: {burnerAccount: newAccountObj.Username}});
        
                //send the data to the task
                users.get(user).facebook.get(task).postMessage({action: 'newAccount', Cookies: newAccountObj.Cookies, Proxy: newAccountObj.Proxy, Username: newAccountObj.Username, Password: newAccountObj.Password, Platform: newAccountObj.Platform});
            }
        }
        //**Restarting task script */
        /*else if(message.action == 'restart'){
            logChannel.send('Restarting task');
    
            //get task from db
            const taskObj = await taskDB.findOne({UserId: user, Name: task});
    
            //get burner account from db
            const burnerAccountObj = await burnerAccountDB.findOne({Username: taskObj.burnerAccount});
    
            //get the max price from link
            let maxPrice = (taskObj.Link).match(/[?&]maxPrice=(\d+)/);
            maxPrice = parseInt(maxPrice[1]);
    
            //get the user obj if necessary for messaging
            let userObj;
            if(taskObj.MessageType != 3){
                userObj = await userDB.findOne({UserId: taskObj.UserId});
            }
    
            //get user item and delete previous task
            const userItem = users.get(user);
            userItem.facebook.delete(task);
    
            //create a new worker and add it to the map
            userItem.facebook.set(taskObj.Name, new Worker('./facebook.js', { workerData:{
                name: taskObj.Name,
                link: taskObj.Link + "&sortBy=creation_time_descend&daysSinceListed=1",
                messageType: taskObj.MessageType,
                message: taskObj.Message,
                burnerUsername: burnerAccountObj.Username,
                burnerPassword: burnerAccountObj.Password,
                burnerProxy: burnerAccountObj.Proxy,
                messageProxy: taskObj.MessageType == 3 ? null : userObj.MessageAccount.Proxy,
                burnerCookies: burnerAccountObj.Cookies,
                messageCookies: taskObj.MessageType == 3 ? null : userObj.MessageAccount.Cookies,
                burnerPlatform: burnerAccountObj.Platform,
                messagePlatform: taskObj.MessageType == 3 ? null : userObj.MessageAccount.Platform,
                maxPrice: maxPrice,
                distance: taskObj.Distance,
                channel: taskObj.ChannelId,
            }}));
    
            userItem.facebook.get(taskObj.Name).on('message', message => facebookListener(message, taskObj.Name, taskObj.UserId)); 
    
            logChannel.send("Successfully Re-Started " + taskObj.Name);
        }*/
    } catch (error) {
        logChannel.send("Error handling task message: " + error);
    }
}

//run daily tasks at the same time every day
const RunDailyTasks = () => {
    scanDatabase();

    setTimeout(async () => {
        RunDailyTasks();
    }, 86400000) //24 hours
}

//scan database for non-paying users
const scanDatabase = async () => {
    try {
        usersToDelete = [];

        //check map against db
        for (const [key, value] of users) {
            const userObj = await userDB.findOne({ UserId: key });
            if (!userObj) {
                usersToDelete.push(key);
            }
        }

        //actually delete the users from map
        usersToDelete.forEach(async (userId) => {
            users.get(userId).facebook.forEach(async (task, key) => {
                await deleteTask(task, key, userId);
            })
                            
            //delete from db
            await taskDB.deleteMany({UserId: userId});

            users.delete(userId);
        })
    } catch (error) {
        console.log("Error scaning Database: \n\t" + error);
        warmingLogChannel.send("Error scaning Database: \n\t" + error);
    }
}

const getStaticFacebookMessageProxy = async () => {
    //get the proxy
    let staticProxyObj = await staticProxyDB.findOne({CurrentFacebookMessageTasks: {$lt: 2}}, {sort: { CurrentFacebookMessageTasks: 1}});
    if(staticProxyObj == null){
        staticProxyObj = await staticProxyDB.findOne({}, {sort: { CurrentFacebookMessageTasks: 1}});
    }

    //update CurrentFacebookMessageTasks in proxy db
    await staticProxyDB.updateOne({_id: staticProxyObj._id}, {$inc: { CurrentFacebookMessageTasks: 1 }});

    return staticProxyObj;
}

const getStaticFacebookBurnerProxy = async () => {
    //get the proxy
    let staticProxyObj = await staticProxyDB.findOne({TotalFacebookBurnerAccounts: {$lt: 3}, Fresh: true}, {sort: {TotalFacebookBurnerAccounts: 1}});
    if(staticProxyObj == null){
        staticProxyObj = await staticProxyDB.findOne({}, {sort: { TotalFacebookBurnerAccounts: 1}});
    }

    //update TotalFacebookBurnerTasks in proxy db
    await staticProxyDB.updateOne({_id: staticProxyObj._id}, {$inc: { TotalFacebookBurnerAccounts: 1 }, $set: {Fresh: false}});

    return staticProxyObj;
}

const getFacebookAccount = async () => {

    //burner account assignment
    let burnerAccountObj = await burnerAccountDB.findOne({LastActive: {$nin: [null, 10000000000000]}}, {sort: {LastActive: 1}});

    //if there is no un-active accounts, This should NEVER happen
    if(burnerAccountObj == null){
        console.log('SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!!');
        logChannel.send("SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!! @everyone");
        return null;
    }else{
        //change LastActive to null, signifing the account is being used
        await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$set: {LastActive: null}});//{$inc: {ActiveTasks: 1}}

        return burnerAccountObj;
    }
}

const handleUser = async (userId) => {
    //checks if user is already created
    if(!users.has(userId)){
        //checks if user has a sub
        let userDocument = await userDB.findOne({UserId: userId});
        if(userDocument != null){
            users.set(userId, {
                taskCount: 0,
                facebook: new Map(),
            })
        }
    }
}

const deleteTask = async (task, taskName, userId) => {
    const taskObj = await taskDB.findOne({UserId: userId, Name: taskName});
    try {
        let messageSuccess;

        let message = await Promise.race([
            new Promise(resolve => {
                task.on('message', message => {
                    messageSuccess = true;
                    resolve(message);
                });

                //Message the worker to close browsers
                task.postMessage({ action: 'closeBrowsers' });
            }),
            new Promise(resolve => {
                setTimeout(() => {
                    messageSuccess = false;
                    resolve();
                }, 30000); //30 seconds
            })
        ]);

        if(messageSuccess){
            //set cookies in db
            if(message.burnerCookies != null && message.burnerCookies != []){
                await burnerAccountDB.updateOne({Username: taskObj.burnerAccount}, {$set: {Cookies: message.burnerCookies}});
            }
            if(message.messageCookies != null && message.burnerCookies != []){
                await userDB.updateOne({UserId: userId}, {$set: {'MessageAccount.Cookies': message.messageCookies}});
            }
        }else{
            logChannel.send("Message failed @everyone");
        }
    } catch (error) {
        logChannel.send("Error Deleting Task Message: " + error);
    }

    try {
        //update account and proxy stats
        let burnerAccountObj = await burnerAccountDB.findOne({Username: taskObj.burnerAccount});
        await burnerAccountDB.updateOne({Username: burnerAccountObj.Username}, {$set: {LastActive: Date.now()}});

        //delete from server
        task.terminate();
    } catch (error) {
        logChannel.send("Error Deleting Task: " + error);
    }
}

const resetProxyTracking = async () => {
    await staticProxyDB.updateMany({}, {$set: {TotalFacebookBurnerAccounts: 0}});
    let accounts = await burnerAccountDB.find({});
    for await (const account of accounts){
        await staticProxyDB.updateOne({Proxy: account.Proxy}, {$inc: {TotalFacebookBurnerAccounts: 1}});
    }

    await burnerAccountDB.updateMany({}, {$set: {ProxyRatio: 0}});
    let proxies = await staticProxyDB.find({});
    for await (const proxy of proxies){
        await burnerAccountDB.updateMany({Proxy: proxy.Proxy}, {$set: {ProxyRatio: proxy.TotalFacebookBurnerAccounts}});
    }
}

//pre populate this with data from supabase 
let users = new Map();

//listen for commands
discordClient.on(Events.InteractionCreate, async interaction => {
    try {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply({ ephemeral: true });
        console.log('defer');
    
        const command = interaction.client.commands.get(interaction.commandName);
    
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while executing this command!');
        }
    
        await executeCommand(interaction);
    } catch (error) {
        await interaction.editReply('There was an error while executing this command!');
        console.log('Error handling command: ' + error);
    }

});


const executeCommand = async (interaction) => {
    let Channel;
    try {
        Channel = discordClient.channels.cache.get(interaction.channelId);
        if(Channel == null){
            console.log("Channel not in cache");
            Channel = await discordClient.channels.fetch(interaction.channelId);
        }
    } catch (error) {
        console.log("Error getting channel for command: " + error);
        logChannel.send("Error getting channel for command: " + error);
    }

    try {

        if(interaction.guild){
            if(interaction.commandName === "facebook-create-task"){
                await handleUser(interaction.user.id);

                //checks if user exists
                if(users.has(interaction.user.id)){
                    if(interaction.options.getString("link").includes("https://www.facebook.com/marketplace")){
                        if(interaction.options.getString("link").includes("maxPrice")){
                            if(!interaction.options.getString("link").includes("propertyrentals")){
                                //compare with db total task count
                                const userObj = await userDB.findOne({UserId: interaction.user.id});

                                if(users.get(interaction.user.id).taskCount < userObj.ConcurrentTasks){
                                    //get user
                                    const user = users.get(interaction.user.id);

                                    if(!user.facebook.has(interaction.options.getString("name"))){
                                        if(userObj.MessageAccount != null || interaction.options.getNumber("message-type") == 3){

                                            //get max price from link 
                                            let maxPrice = interaction.options.getString("link").match(/[?&]maxPrice=(\d+)/);
                                            maxPrice = parseInt(maxPrice[1]);

                                            //burner account assignment
                                            const burnerAccountObj = await getFacebookAccount();

                                            if(burnerAccountObj != null){
                                                //increase the worker count
                                                user.taskCount++;

                                                //set the task in db
                                                await taskDB.insertOne({UserId: interaction.user.id, ChannelId: interaction.channelId, Name: interaction.options.getString("name"), burnerAccount: burnerAccountObj.Username, Link: interaction.options.getString("link").replace(/^<|>$/g, ''), MessageType: interaction.options.getNumber("message-type"), Message: interaction.options.getString("message"), Distance: interaction.options.getNumber("distance")});

                                                //create a new worker and add it to the map
                                                user.facebook.set(interaction.options.getString("name"), new Worker('./facebook.js', { workerData:{
                                                    name: interaction.options.getString("name"),
                                                    link: interaction.options.getString("link").replace(/^<|>$/g, '') + "&sortBy=creation_time_descend&daysSinceListed=1",
                                                    messageType: interaction.options.getNumber("message-type"),
                                                    message: interaction.options.getString("message"),
                                                    burnerUsername: burnerAccountObj.Username,
                                                    burnerPassword: burnerAccountObj.Password,
                                                    burnerProxy: burnerAccountObj.Proxy,
                                                    messageProxy: interaction.options.getNumber("message-type") == 3 ? null : userObj.MessageAccount.Proxy,
                                                    burnerCookies: burnerAccountObj.Cookies,
                                                    messageCookies: interaction.options.getNumber("message-type") == 3 ? null : userObj.MessageAccount.Cookies,
                                                    burnerPlatform: burnerAccountObj.Platform,
                                                    messagePlatform: interaction.options.getNumber("message-type") == 3 ? null : userObj.MessageAccount.Platform,
                                                    maxPrice: maxPrice,
                                                    distance: interaction.options.getNumber("distance"),
                                                    channel: interaction.channelId,
                                                }}));

                                                user.facebook.get(interaction.options.getString("name")).on('message', message => facebookListener(message, interaction.options.getString("name"), interaction.user.id)); 

                                                Channel.send("Created " + interaction.options.getString("name"));
                                            }
                                        } else{
                                            Channel.send("You must provide a message account to use messaging, use the facebook-update-message-account command to add a message account to your profile.");
                                        }
                                    }else{
                                        Channel.send("A task with this name already exists, restart the task with a new name.");
                                    }
                                }else{
                                    Channel.send("You have reached your task limit for your plan, upgrade to make more.");
                                }
                            }else{
                                Channel.send("You may not use a link in the property rentals category. Open a ticket for an explanation.");
                            }
                        }else{
                            Channel.send("Your link must include a max price");
                        }
                    }else{
                        Channel.send("Invalid Link");
                    }
                }else{
                    Channel.send("You do not have an active plan");
                }
            }
            else if(interaction.commandName === "facebook-delete-task"){
                if(users.has(interaction.user.id)){
                    const user = users.get(interaction.user.id);

                    if(user.facebook.has(interaction.options.getString("task-name"))){
    
                        await deleteTask(user.facebook.get(interaction.options.getString("task-name")), interaction.options.getString("task-name"), interaction.user.id);

                        user.facebook.delete(interaction.options.getString("task-name"));
                        user.taskCount--;

                        //delete from db
                        await taskDB.deleteOne({UserId: interaction.user.id, Name: interaction.options.getString("task-name")}); 

                        Channel.send("Deleted " + interaction.options.getString("task-name"));
                    }else{
                        Channel.send("Task does not exist");
                    }
                }else{
                    Channel.send("Task does not exist");
                }
            }
            else if(interaction.commandName === "admin-facebook-delete-task" && interaction.user.id === '456168609639694376'){
                if(users.has(interaction.options.getString('user-id'))){
                    const user = users.get(interaction.options.getString('user-id'));

                    if(user.facebook.has(interaction.options.getString("task-name"))){
    
                        await deleteTask(user.facebook.get(interaction.options.getString("task-name")), interaction.options.getString("task-name"), interaction.options.getString('user-id'));

                        user.facebook.delete(interaction.options.getString("task-name"));
                        user.taskCount--;

                        //delete from db
                        await taskDB.deleteOne({UserId: interaction.options.getString('user-id'), Name: interaction.options.getString("task-name")});

                        Channel.send("Deleted " + interaction.options.getString("task-name"));
                    }else{
                        Channel.send("Task does not exist");
                    }
                }else{
                    Channel.send("Task does not exist");
                }
            }
            else if(interaction.commandName === "facebook-warm-account" && interaction.user.id === '456168609639694376'){
                //const accountObj = await burnerAccountDB.findOne({Username: interaction.options.getString("email-or-phone")});
                const accountObj = await burnerAccountDB.aggregate([{ $match: { LastActive: { $ne: null } } }, { $sample: { size: 1 } }]).next();
                //const accountObj = await burnerAccountDB.findOne({LastActive: 10000000000001});
                console.log(accountObj.Username);
    
                //create a new worker
                new Worker('./viewAccount.js', { workerData:{
                    username: accountObj.Username,
                    proxy: accountObj.Proxy,
                    cookies: accountObj.Cookies,
                    platform: accountObj.Platform,
                    channel: interaction.channelId
                }});
                
                //new Worker('./viewAccount.js');

                //await warmAccs();
            }
            else if(interaction.commandName === "change-language" && interaction.user.id === '456168609639694376'){
                //const newAccs = await burnerAccountDB.find({LastActive: 10000000000000}).limit(20).sort({_id: -1});
                const newAccs = await burnerAccountDB.find({LastActive: 10000000000000}).limit(15).toArray();
                //const newAccs = await burnerAccountDB.find({Username: 'ocybhfve@znemail.com'});

                const initialAccountSetUp = async (acc) => {
                    let warmer = new Worker('./viewAccount.js', { workerData:{
                        username: acc.Username,
                        password: acc.Password,
                        proxy: acc.Proxy,
                        cookies: acc.Cookies,
                        platform: acc.Platform,
                        channel: interaction.channelId,
                        changeLanguage: true
                    }});

                    warmer.on('message', async (message) => {
                        if(message.cookies != null && message.cookies != []){
                            await burnerAccountDB.updateOne({Username: acc.Username}, {$set: {Cookies: message.cookies}});
                            console.log('updating cookies for: ' + acc.Username);//!Testing and such
                        }else if(message.action == 'ban'){
                            console.log("BANBANBANBANBANBANBANBAN")
    
                            //decrease the proxy account num before deleting account
                            const oldAccountObj = await burnerAccountDB.findOne({Username: message.username});
                            await staticProxyDB.updateOne({Proxy: oldAccountObj.Proxy}, {$inc: {TotalFacebookBurnerAccounts: -1}});
                    
                            //Delete the burner account
                            await burnerAccountDB.deleteOne({_id: oldAccountObj._id});
                        }
                    }); 
                    
                    await new Promise(r => setTimeout(r, 60000));

                    await burnerAccountDB.updateOne({Username: acc.Username}, {$set: {LastActive: 1}});
                }

                for await(const acc of newAccs){
                    console.log(acc.Username);
                    await initialAccountSetUp(acc);
                }

                await Channel.send('finish');
            }
            else if(interaction.commandName === "reset-proxies" && interaction.user.id === '456168609639694376'){
                //await resetProxyTracking();

                //get all proxies
                let proxyArr = await staticProxyDB.find({TotalFacebookBurnerAccounts: 0, Fresh: false, Group: '182947'}).toArray();
                let proxyString = '';
                let resetNum = (proxyArr.length < interaction.options.getNumber("182947-limit") ? proxyArr.length : interaction.options.getNumber("182947-limit"));
                await Channel.send("**182947**: " + resetNum);
                for(let i = 0; i < resetNum; i++){
                    proxyString += proxyArr[i].Proxy + ' ';
                    if((i % 30 == 0 && i != 0) || i == resetNum - 1){
                        await Channel.send(proxyString + '\n');
                        proxyString = '';
                    }

                    //delete garbage
                    await staticProxyDB.deleteOne({Proxy: proxyArr[i].Proxy});
                }
                
                proxyArr = await staticProxyDB.find({TotalFacebookBurnerAccounts: 0, Fresh: false, Group: '184098'}).toArray();
                proxyString = '';
                resetNum = (proxyArr.length < interaction.options.getNumber("184098-limit") ? proxyArr.length : interaction.options.getNumber("184098-limit"));
                await Channel.send("**184098**: " + resetNum);
                for(let i = 0; i < resetNum; i++){
                    proxyString += proxyArr[i].Proxy + ' ';
                    if((i % 30 == 0 && i != 0) || i == resetNum - 1){
                        await Channel.send(proxyString + '\n');
                        proxyString = '';
                    }

                    //delete garbage
                    await staticProxyDB.deleteOne({Proxy: proxyArr[i].Proxy});
                }

                await Channel.send("finish");
            }
            else if(interaction.commandName === "list"){
                const taskArray = await taskDB.find({UserId: interaction.user.id}).toArray();

                if(taskArray != null){
                    let messagingTypes = ["Auto Messaging", "Manual Messaging", "No Messaging"];

                    for (let i = 0; i < taskArray.length; i++){
                        await Channel.send('- name: ' + taskArray[i].Name +  ' link: <' + taskArray[i].Link +  '> message-type: ' + messagingTypes[taskArray[i].MessageType - 1] +  ' distance: ' + taskArray[i].Distance + '\n');
                    }
                }else{
                    await Channel.send("No Active Tasks");
                }
            }else if(interaction.commandName === 'facebook-update-message-account'){
                const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)]; 

                let cookies = JSON.parse(interaction.options.getString("cookies"));
                for(let i = 0; i < cookies.length; i++){
                    if(cookies[i].sameSite == null){
                        cookies[i].sameSite = 'no_restriction';
                    }
                }

                await userDB.updateOne({UserId: interaction.user.id}, {$set: {MessageAccount: {Cookies : cookies, Platform : randomPlatform}}});

                const userObj = await userDB.findOne({UserId: interaction.user.id});
                if(userObj.MessageAccount.Proxy == null){
                    const proxy = await getStaticFacebookMessageProxy();
                    await userDB.updateOne({UserId: interaction.user.id}, {$set: {'MessageAccount.Proxy' : proxy.Proxy}});
                }
                
                Channel.send('Updated!');
            }else if(interaction.commandName === 'add-facebook-accounts' && interaction.user.id === '456168609639694376'){
                const fs = require('fs');
                const fileContents = fs.readFileSync(interaction.options.getString("path"), 'utf-8');

                const accountArray = fileContents.split('\n');

                //** Reset Cookies for null insertion
                /* 
                let accs = await burnerAccountDB.find({Cookies: null}).toArray();

                const accountArray = fileContents.split('\n');

                // Regular expression patterns
                const arrayRegex = /\[(.*?)\]/g;
                const emailPasswordRegex = /;([^:;]+):([^:;]+);;/;

                for(let i = 0; i < accountArray.length; i++){
                    //collect account user and password string
                    const emailPasswordMatch = accountArray[i].match(emailPasswordRegex);
                    const email = emailPasswordMatch[1];

                    accs.forEach(async (acc) => {
                        if(acc.Username == email){
                            //collect the cookie array
                            const cookiesMatch = accountArray[i].match(arrayRegex);
                            const cookieArray = JSON.parse(cookiesMatch[0]);

                            console.log(email);

                            await burnerAccountDB.updateOne({Username: email}, {$set: {Cookies: cookieArray}});
                        }
                    })
                }
                */
                
                //** Hq-accounts mongodb

                // Regular expression patterns
                const arrayRegex = /\[(.*?)\]/g;

                for(let i = 0; i < accountArray.length; i++){

                    //collect the cookie array
                    const cookiesMatch = accountArray[i].match(arrayRegex);
                    const cookieArray = JSON.parse(cookiesMatch[0]);

                    //collect account user and password string
                    const emailPasswordMatch = accountArray[i].split(';');
                    const email = emailPasswordMatch[0];
                    const password = emailPasswordMatch[1];

                    //get random platform
                    const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)]; 

                    //console.log({Username: email, Password: password, Cookies: cookieArray, LastActive: 1, Platform: randomPlatform, NextWarming: Date.now() + randomMillisecondsDay, LastActive: Date.now(), Platform: randomPlatform, Start: Date.now()});
                    if(await burnerAccountDB.findOne({Username: email}) == null){
                        //get a static proxy
                        const proxyObj = await getStaticFacebookBurnerProxy();
                        if(i < 38){//begin now
                            await burnerAccountDB.insertOne({Username: email, Password: password, Cookies: cookieArray, Proxy: proxyObj.Proxy, LastActive: 10000000000000, Platform: randomPlatform, ProxyRatio: proxyObj.TotalFacebookBurnerAccounts + 1, Start: Date.now() - (2 * days), NextWarming: Date.now()});
                        }else{//warming period
                            await burnerAccountDB.insertOne({Username: email, Password: password, Cookies: cookieArray, Proxy: proxyObj.Proxy, LastActive: 10000000000000, Platform: randomPlatform, ProxyRatio: proxyObj.TotalFacebookBurnerAccounts + 1, Start: Date.now(), NextWarming: Date.now()});
                        }
                    }

                    //Reset Cookies
                    /*if(await burnerAccountDB.findOne({Username: email}) != null){
                        if(((await burnerAccountDB.findOne({Username: email})).Cookies).length == 0){
                            console.log("array problem")
                            await burnerAccountDB.updateOne({Username: email}, {$set: {Cookies: cookieArray}});
                        }
                    }*/
                    console.log(email);
                }

                /**
                 * 100 Accounts
                 * 50 with no warming period
                 * 30 with a 1 month warming period
                 * 20 with a 2 month warming period
                 * 
                 * 
                 * Please initiate all these....
                 * 150 accs....
                 */
                /*for(let i = 0; i < accountArray.length; i++){
                    const accountInfo = accountArray[i].split('|');

                    //collect the cookie array
                    const decodedCookieString = Buffer.from(accountInfo[accountInfo.length - 1], 'base64').toString('utf-8');
                    const cookieArray = JSON.parse(decodedCookieString);

                    //collect account user and password string
                    const email = accountInfo[0];
                    const password = accountInfo[1];

                    //get random platform
                    const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)]; 

                    //get a static proxy
                    const proxyObj = await getStaticFacebookBurnerProxy();
 
                    //get warming date
        
                    const randomMillisecondsDay = Math.floor(Math.random() * (2 * days) + 60 * 1000);
                    const randomWeeks = Math.floor(Math.random() * 2 + 7);
                    const randomMillisecondsWeek = randomWeeks * 7 * days;

                    //console.log({Username: email, Password: password, Cookies: cookieArray, LastActive: 1, Platform: randomPlatform, NextWarming: Date.now() + randomMillisecondsDay, WarmingPeriodEnd: Date.now() + randomMillisecondsWeek});
                    await burnerAccountDB.insertOne({Username: email, Password: password, Cookies: cookieArray, Proxy: proxyObj.Proxy, LastActive: Date.now(), Platform: randomPlatform, NextWarming: Date.now() + randomMillisecondsDay, ProxyRatio: proxyObj.TotalFacebookBurnerAccounts + 1, Start: Date.now()});//

                    console.log(email);
                }*/
        
                //await resetProxyTracking();
                Channel.send('finish');
            }else if(interaction.commandName === 'add-burner-proxies' && interaction.user.id === '456168609639694376'){
        
                //get the list of new proxies
                let proxyList = interaction.options.getString("proxy-list");
                proxyList = proxyList.split(" ");
                console.log(proxyList);
                
                //insert the new proxies
                await proxyList.forEach(async (proxy) => {
                    if(await staticProxyDB.findOne({Proxy: proxy}) == null){
                        await staticProxyDB.insertOne({Proxy: proxy, CurrentFacebookMessageTasks: 0, TotalFacebookBurnerAccounts: 0, Fresh: true, Group: interaction.options.getString("proxy-group")});
                        console.log(proxy);
                    }else{
                        console.log("PROXY ALREADY PRESENT");
                    }
                })
        
                Channel.send('finish');
            }
            else if(interaction.commandName === 'all-workers' && interaction.user.id === '456168609639694376'){
                let list = ''; 

                for (const [userID, user] of users){
                    list += '\n' + userID;
                    for (const [taskKey, task] of user.facebook){
    
                        list += `\n\t-${taskKey}`;
                    }
                }

                //send the completed message string
                if(list != ''){
                    Channel.send(list);
                }else{
                    Channel.send('No Workers');
                }
            }
            else if(interaction.commandName === 'delete-all-tasks' && interaction.user.id === '456168609639694376'){
                for await(const userObj of users){
                    console.log(userObj);
                    if(userObj[1].facebook != null){
                        for (const task of userObj[1].facebook){
                            console.log('delete task');
                            await deleteTask(task[1], task[0], userObj[0]);
                        }
                    }
                }
                users = new Map();

                Channel.send('Finished');
            }
            else if(interaction.commandName === 'start-all-tasks' && interaction.user.id === '456168609639694376'){
                //reset burner accounts
                await burnerAccountDB.updateMany({LastActive: null}, {$set: {LastActive: Date.now()}});
                
                const taskArray = taskDB.find();

                for await (const taskObj of taskArray){
                    //handle and get the user
                    await handleUser(taskObj.UserId);
                    const user = users.get(taskObj.UserId);
                    if(user != null){

                        //burner account assignment
                        const burnerAccountObj = await getFacebookAccount();
                        if(burnerAccountObj != null){
                            //increase the worker count
                            user.taskCount++;

                            //update task for new burnerAccount
                            await taskDB.updateOne({_id: taskObj._id}, {$set: {burnerAccount: burnerAccountObj.Username}});

                            //get the max price from link
                            let maxPrice = (taskObj.Link).match(/[?&]maxPrice=(\d+)/);
                            maxPrice = parseInt(maxPrice[1]);

                            //get the user obj if necessary for messaging
                            let userObj;
                            if(taskObj.MessageType != 3){
                                userObj = await userDB.findOne({UserId: taskObj.UserId});
                            }

                            //create a new worker and add it to the map
                            user.facebook.set(taskObj.Name, new Worker('./facebook.js', { workerData:{
                                name: taskObj.Name,
                                link: taskObj.Link + "&sortBy=creation_time_descend&daysSinceListed=1",
                                messageType: taskObj.MessageType,
                                message: taskObj.Message,
                                burnerUsername: burnerAccountObj.Username,
                                burnerPassword: burnerAccountObj.Password,
                                burnerProxy: burnerAccountObj.Proxy,
                                messageProxy: taskObj.MessageType == 3 ? null : userObj.MessageAccount.Proxy,
                                burnerCookies: burnerAccountObj.Cookies,
                                messageCookies: taskObj.MessageType == 3 ? null : userObj.MessageAccount.Cookies,
                                burnerPlatform: burnerAccountObj.Platform,
                                messagePlatform: taskObj.MessageType == 3 ? null : userObj.MessageAccount.Platform,
                                maxPrice: maxPrice,
                                distance: taskObj.Distance,
                                channel: taskObj.ChannelId,
                            }}));

                            user.facebook.get(taskObj.Name).on('message', message => facebookListener(message, taskObj.Name, taskObj.UserId)); 

                            Channel.send("Created " + taskObj.Name);
                        }

                        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 10000 + 55000)));
                    }else{
                        await taskDB.deleteOne({_id: taskObj._id});
                    }
                }

                Channel.send('Finished');
            }
        }else{
            interaction.user.send('Commands are not allowed in direct messages.');
        }
    } catch (error) {
        console.log("Command Error: \n\t" + error);
        logChannel.send("Command Error: \n\t" + error);
        Channel.send("Command Error: \n\t" + error);
    }
}