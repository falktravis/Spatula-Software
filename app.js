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
(async () => {
    try {
        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("\n\n\n         ██████  ██▓███   ▄▄▄     ▄▄▄█████▓ █    ██  ██▓    ▄▄▄           ██████  ▒█████    █████▒▄▄▄█████▓ █     █░ ▄▄▄       ██▀███  ▓█████ \n       ▒██    ▒ ▓██░  ██▒▒████▄   ▓  ██▒ ▓▒ ██  ▓██▒▓██▒   ▒████▄       ▒██    ▒ ▒██▒  ██▒▓██   ▒ ▓  ██▒ ▓▒▓█░ █ ░█░▒████▄    ▓██ ▒ ██▒▓█   ▀ \n       ░ ▓██▄   ▓██░ ██▓▒▒██  ▀█▄ ▒ ▓██░ ▒░▓██  ▒██░▒██░   ▒██  ▀█▄     ░ ▓██▄   ▒██░  ██▒▒████ ░ ▒ ▓██░ ▒░▒█░ █ ░█ ▒██  ▀█▄  ▓██ ░▄█ ▒▒███   \n         ▒   ██▒▒██▄█▓▒ ▒░██▄▄▄▄██░ ▓██▓ ░ ▓▓█  ░██░▒██░   ░██▄▄▄▄██      ▒   ██▒▒██   ██░░▓█▒  ░ ░ ▓██▓ ░ ░█░ █ ░█ ░██▄▄▄▄██ ▒██▀▀█▄  ▒▓█  ▄ \n       ▒██████▒▒▒██▒ ░  ░ ▓█   ▓██▒ ▒██▒ ░ ▒▒█████▓ ░██████▒▓█   ▓██▒   ▒██████▒▒░ ████▓▒░░▒█░      ▒██▒ ░ ░░██▒██▓  ▓█   ▓██▒░██▓ ▒██▒░▒████▒\n       ▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░ ▒▒   ▓▒█░ ▒ ░░   ░▒▓▒ ▒ ▒ ░ ▒░▓  ░▒▒   ▓▒█░   ▒ ▒▓▒ ▒ ░░ ▒░▒░▒░  ▒ ░      ▒ ░░   ░ ▓░▒ ▒   ▒▒   ▓▒█░░ ▒▓ ░▒▓░░░ ▒░ ░\n       ░ ░▒  ░ ░░▒ ░       ▒   ▒▒ ░   ░    ░░▒░ ░ ░ ░ ░ ▒  ░ ▒   ▒▒ ░   ░ ░\n\n\n");
        staticProxyDB = mongoClient.db('Spatula-Software').collection('staticProxies');
        burnerAccountDB = mongoClient.db('Spatula-Software').collection('burnerAccounts');
        userDB = mongoClient.db('Spatula-Software').collection('Users');
        taskDB = mongoClient.db('Spatula-Software').collection('Tasks');

        //start database scan
        scanDatabase();
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
discordClient.on('ready', async () => {
    try {
        logChannel = discordClient.channels.cache.get('1091532766522376243');
        if(logChannel == null){
            logChannel = await discordClient.channels.fetch('1091532766522376243');
        }
    } catch (error) {
        errorMessage('Error fetching channel', error);
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
const facebookListener = async (message, task, user, username) => {
    if(message.action == 'failure'){

        //Increase active task count
        await burnerAccountDB.updateOne({Username: username}, {$inc: {ActiveTasks: 1}});
    }else if(message.action == 'ban'){

        //decrease the proxy account num before deleting account
        const oldAccountObj = await burnerAccountDB.findOne({Username: username});
        await staticProxyDB.updateOne({Proxy: oldAccountObj.Proxy}, {$inc: {TotalFacebookBurnerAccounts: -1}});

        //Delete the burner account
        await burnerAccountDB.deleteOne({_id: oldAccountObj._id});
    }

    if(message.action == 'failure' || message.action == 'ban'){

        //get a new account to send back to the task
        const newAccountObj = await getFacebookAccount();

        //send the data to the task
        users.get(user).facebook.get(task).postMessage({action: 'newAccount', Cookies: newAccountObj.Cookies, Proxy: newAccountObj.Proxy, Username: newAccountObj.Username, Platform: newAccountObj.Platform});
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
    let staticProxyObj = await staticProxyDB.findOne({TotalFacebookBurnerAccounts: {$lt: 3}}, {sort: {TotalFacebookBurnerAccounts: 1}});
    if(staticProxyObj == null){
        staticProxyObj = await staticProxyDB.findOne({}, {sort: { TotalFacebookBurnerAccounts: 1}});
    }

    //update CurrentFacebookBurnerTasks in proxy db
    await staticProxyDB.updateOne({_id: staticProxyObj._id}, {$inc: { TotalFacebookBurnerAccounts: 1 }});

    return staticProxyObj;
}

const getFacebookAccount = async () => {

    //burner account assignment
    let burnerAccountObj = await burnerAccountDB.findOne({ActiveTasks: 0});

    //if there is no un-active accounts 
    if(burnerAccountObj == null){
        burnerAccountObj = await burnerAccountDB.findOne({}, {sort: {ActiveTasks: 1}});
        console.log('SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!!');
        logChannel.send("SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!! @everyone");
    }

    //increase number of active tasks on the burner account
    await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$inc: {ActiveTasks: 1}});

    return burnerAccountObj;
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
    let messageSuccess;

    //Message the worker to close browsers
    await task.postMessage({ action: 'closeBrowsers' });

    let message = await Promise.race([
        new Promise(resolve => {
            task.on('message', message => {
                messageSuccess = true;
                resolve(message);
            });
        }),
        new Promise(resolve => {
            setTimeout(() => {
                messageSuccess = false;
                resolve();
            }, 90000); //90 seconds
        })
    ]);

    const taskObj = await taskDB.findOne({UserId: userId, Name: taskName});

    if(messageSuccess){
        //set cookies in db
        await burnerAccountDB.updateOne({Username: taskObj.burnerAccount}, {$set: {Cookies: message.burnerCookies}});
        if(message.messageCookies != null){
            await userDB.updateOne({UserId: userId}, {$set: {'MessageAccount.Cookies': message.messageCookies}});
        }
    }else{
        //console.log("Message failed");//!delete for production
        logChannel.send("Message failed @everyone");
    }

    //update account and proxy stats
    let burnerAccountObj = await burnerAccountDB.findOne({Username: taskObj.burnerAccount});
    await burnerAccountDB.updateOne({Username: burnerAccountObj.Username}, {$inc: {ActiveTasks: -1}});
    await staticProxyDB.updateOne({Proxy: burnerAccountObj.Proxy}, { $inc: { CurrentFacebookBurnerTasks: -1 } });

    //delete from server
    task.terminate();
}

const scanDatabase = async () => {

    setTimeout(async () => {
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
            logChannel.send("Error scaning Database: \n\t" + error);
        }

        scanDatabase();
    }, 86400000) //24 hours
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
    let Channel
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
                            let maxPrice = interaction.options.getString("link").match(/[?&]maxPrice=(\d+)/);
                            maxPrice = parseInt(maxPrice[1]);
                            if(maxPrice.toString() <= 500000){
                                //compare with db total task count
                                const userObj = await userDB.findOne({UserId: interaction.user.id});

                                if(users.get(interaction.user.id).taskCount < userObj.ConcurrentTasks){
                                    //get user
                                    const user = users.get(interaction.user.id);

                                    if(!user.facebook.has(interaction.options.getString("name"))){
                                        if(userObj.MessageAccount != null || interaction.options.getNumber("message-type") == 3){
                                            let start = interaction.options.getNumber("start");
                                            let end = interaction.options.getNumber("end");
                                    
                                            //time difference
                                            let timeDiff;
                                            if(start < end){
                                                timeDiff = end - start;
                                            }else{
                                                timeDiff = (24 - start) + end;
                                            }
                                        
                                            //both times are between 1 and 25, the difference is less than or equal to 14
                                            if(start <= 24 && start >= 1 && end <= 24 && end >= 1 && end !== start && timeDiff <= 16){
                                                //increase the worker count
                                                user.taskCount++;

                                                //burner account assignment
                                                const burnerAccountObj = await getFacebookAccount();

                                                //set the task in db
                                                await taskDB.insertOne({UserId: interaction.user.id, ChannelId: interaction.channelId, Name: interaction.options.getString("name"), burnerAccount: burnerAccountObj.Username, Link: interaction.options.getString("link"), MessageType: interaction.options.getNumber("message-type"), Message: interaction.options.getString("message"), Distance: interaction.options.getNumber("distance"), Start: start, End: end});

                                                //create a new worker and add it to the map
                                                user.facebook.set(interaction.options.getString("name"), new Worker('./facebook.js', { workerData:{
                                                    name: interaction.options.getString("name"),
                                                    link: interaction.options.getString("link") + "&sortBy=creation_time_descend&daysSinceListed=1",
                                                    messageType: interaction.options.getNumber("message-type"),
                                                    message: interaction.options.getString("message"),
                                                    burnerUsername: burnerAccountObj.Username,
                                                    burnerProxy: burnerAccountObj.Proxy,
                                                    messageProxy: interaction.options.getNumber("message-type") == 3 ? null : userObj.MessageAccount.Proxy,
                                                    burnerCookies: burnerAccountObj.Cookies,
                                                    messageCookies: interaction.options.getNumber("message-type") == 3 ? null : userObj.MessageAccount.Cookies,
                                                    burnerPlatform: burnerAccountObj.Platform,
                                                    messagePlatform: interaction.options.getNumber("message-type") == 3 ? null : userObj.MessageAccount.Platform,
                                                    maxPrice: maxPrice,
                                                    start: start * 60,
                                                    end: end * 60,
                                                    distance: interaction.options.getNumber("distance"),
                                                    channel: interaction.channelId,
                                                }}));

                                                user.facebook.get(interaction.options.getString("name")).on('message', message => facebookListener(message, interaction.options.getString("name"), interaction.user.id, burnerAccountObj.Username)); 

                                                Channel.send("Created " + interaction.options.getString("name"));
                                            }else{
                                                Channel.send("Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours");
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
                                Channel.send("Max price is to high, make your max price more realistic.");
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
                        await taskDB.deleteOne({UserId: interaction.user.id, Name: interaction.options.getString("task-name")});

                        Channel.send("Deleted " + interaction.options.getString("task-name"));
                    }else{
                        Channel.send("Task does not exist");
                    }
                }else{
                    Channel.send("Task does not exist");
                }
            }
            else if(interaction.commandName === "facebook-warm-account" && interaction.user.id === '456168609639694376'){
                const accountObj = await burnerAccountDB.findOne({Username: interaction.options.getString("email-or-phone")});
    
                //create a new worker
                const warmAccountWorker = new Worker('./warmAccount.js', { workerData:{
                    username: interaction.options.getString("email-or-phone"),
                    proxy: accountObj.Proxy,
                    cookies: accountObj.Cookies,
                    platform: accountObj.Platform,
                    channel: interaction.channelId,
                }});
            }
            else if(interaction.commandName === "list"){
                const taskArray = await taskDB.find({UserId: interaction.user.id});

                if(taskArray != null){
                    let list = '';

                    await taskArray.forEach((task) => {
                        let messagingTypes = ["Auto Messaging", "Manual Messaging", "No Messaging"];
                        let distances = ['1', '2', '5', '10', '20', '40', '60', '80', '100', '250', '500'];

                        list += '- name: ' + task.Name +  ' link: <' + task.Link +  '> message-type: ' + messagingTypes[task.MessageType - 1] +  ' distance: ' + distances[task.Distance - 1] +  ' start: ' + task.Start +  ' end: ' + task.End + '\n';
                    })

                    Channel.send(list);
                }else{
                    Channel.send("No Active Tasks");
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

                /*const arrayRegex = /\[(.*?)\]/g;
                const cookieArray = fileContents.match(arrayRegex);

                for(let i = 0; i < cookieArray.length; i++){

                    const cookie = JSON.parse(cookieArray[i]);

                    const targetCookie = cookie.find(cookie => cookie.name === 'o');
                    let username = targetCookie.value;
                    username = username.split(":");
                    username = username[0];
                    console.log(username);

                    const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)]; 
                    const proxyObj = await getStaticFacebookBurnerProxy();
                    
                    await burnerAccountDB.insertOne({Username: username, Cookies: cookie, Proxy: proxyObj.Proxy, Platform: randomPlatform, ActiveTasks: 0});
                }*/
                
                //**reset proxy tracking
                /*await staticProxyDB.updateMany({}, {$set: {TotalFacebookBurnerAccounts: 0}});
                let accounts = await burnerAccountDB.find({});
                for await (const account of accounts){
                    await staticProxyDB.updateOne({Proxy: account.Proxy}, {$inc: {TotalFacebookBurnerAccounts: 1}});
                }*/
                
                const accountArray = fileContents.split('\n');

                // Regular expression patterns
                const arrayRegex = /\[(.*?)\]/g;
                const emailPasswordRegex = /;([^:;]+):([^:;]+);;/;

                for(let i = 0; i < accountArray.length; i++){

                    //collect the cookie array
                    const cookiesMatch = accountArray[i].match(arrayRegex);
                    const cookieArray = JSON.parse(cookiesMatch[0]);

                    //collect account user and password string
                    const emailPasswordMatch = accountArray[i].match(emailPasswordRegex);
                    const email = emailPasswordMatch[1];
                    const password = emailPasswordMatch[2];

                    //get random platform
                    const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)]; 

                    //get a static proxy
                    const proxyObj = await getStaticFacebookBurnerProxy();

                    //console.log({Username: email, Password: password, Cookies: cookieArray, ActiveTasks: 0, Platform: randomPlatform});
                    await burnerAccountDB.insertOne({Username: email, Password: password, Cookies: cookieArray, Proxy: proxyObj.Proxy, ActiveTasks: 0, Platform: randomPlatform});
                }
        
                Channel.send('finish');
            }else if(interaction.commandName === 'add-burner-proxies' && interaction.user.id === '456168609639694376'){
        
                //get the list of new proxies
                let proxyList = interaction.options.getString("proxy-list");
                proxyList = proxyList.split(" ");
                console.log(proxyList);
                
                //insert the new proxies
                proxyList.forEach(async (proxy) => {
                    await staticProxyDB.insertOne({Proxy: proxy, CurrentFacebookMessageTasks: 0, CurrentFacebookBurnerTasks: 0, TotalFacebookBurnerAccounts: 0})
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
                        for await(const task of userObj[1].facebook){
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
                await burnerAccountDB.updateMany({}, {$set: {ActiveTasks: 0}});

                const taskArray = taskDB.find();

                for await (const document of taskArray){
                    //handle and get the user
                    await handleUser(document.UserId);
                    const user = users.get(document.UserId);
                    if(user != null){
                        //increase the worker count
                        user.taskCount++;

                        //burner account assignment
                        let burnerAccountObj = await burnerAccountDB.findOne({ActiveTasks: 0});

                        //if there is no un-active accounts 
                        if(burnerAccountObj == null){
                            burnerAccountObj = await burnerAccountDB.findOne({}, {sort: {ActiveTasks: 1}});
                            console.log('SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!!');
                            logChannel.send("SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!! @everyone");
                        }

                        //increase number of active tasks on the burner account
                        await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$inc: {ActiveTasks: 1}});

                        //!Fix the fucking staticAccountDB
                        //await staticProxyDB.updateOne({Proxy: burnerAccountObj.Proxy}, {$inc: {TotalFacebookBurnerAccounts: 1}});

                        //!Add burnerUsername to the task db
                        //await taskDB.updateOne({UserId: document.UserId, Name: document.Name}, {$set: {burnerAccount: burnerAccountObj.Username}});

                        //get the max price from link
                        let maxPrice = (document.Link).match(/[?&]maxPrice=(\d+)/);
                        maxPrice = parseInt(maxPrice[1]);

                        //get the user obj if necessary for messaging
                        let userObj;
                        if(document.MessageType != 3){
                            userObj = await userDB.findOne({UserId: document.UserId});
                        }

                        //create a new worker and add it to the map
                        user.facebook.set(document.Name, new Worker('./facebook.js', { workerData:{
                            name: document.Name,
                            link: document.Link + "&sortBy=creation_time_descend&daysSinceListed=1",
                            messageType: document.MessageType,
                            message: document.Message,
                            burnerUsername: burnerAccountObj.Username,
                            burnerProxy: burnerAccountObj.Proxy,
                            messageProxy: document.MessageType == 3 ? null : userObj.MessageAccount.Proxy,
                            burnerCookies: burnerAccountObj.Cookies,
                            messageCookies: document.MessageType == 3 ? null : userObj.MessageAccount.Cookies,
                            burnerPlatform: burnerAccountObj.Platform,
                            messagePlatform: document.MessageType == 3 ? null : userObj.MessageAccount.Platform,
                            maxPrice: maxPrice,
                            start: document.Start * 60,
                            end: document.End * 60,
                            distance: document.Distance,
                            channel: document.ChannelId,
                        }}));

                        user.facebook.get(document.Name).on('message', message => facebookListener(message, document.Name, document.UserId, burnerAccountObj.Username)); 

                        Channel.send("Created " + document.Name);

                        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 20000 + 20000)));
                    }else{
                        await taskDB.deleteOne({_id: document._id});
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