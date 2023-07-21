require('dotenv').config();
const { Worker } = require('worker_threads');

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
let residentialProxyDB;
(async () => {
    try {
        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("\n\n\n         ██████  ██▓███   ▄▄▄     ▄▄▄█████▓ █    ██  ██▓    ▄▄▄           ██████  ▒█████    █████▒▄▄▄█████▓ █     █░ ▄▄▄       ██▀███  ▓█████ \n       ▒██    ▒ ▓██░  ██▒▒████▄   ▓  ██▒ ▓▒ ██  ▓██▒▓██▒   ▒████▄       ▒██    ▒ ▒██▒  ██▒▓██   ▒ ▓  ██▒ ▓▒▓█░ █ ░█░▒████▄    ▓██ ▒ ██▒▓█   ▀ \n       ░ ▓██▄   ▓██░ ██▓▒▒██  ▀█▄ ▒ ▓██░ ▒░▓██  ▒██░▒██░   ▒██  ▀█▄     ░ ▓██▄   ▒██░  ██▒▒████ ░ ▒ ▓██░ ▒░▒█░ █ ░█ ▒██  ▀█▄  ▓██ ░▄█ ▒▒███   \n         ▒   ██▒▒██▄█▓▒ ▒░██▄▄▄▄██░ ▓██▓ ░ ▓▓█  ░██░▒██░   ░██▄▄▄▄██      ▒   ██▒▒██   ██░░▓█▒  ░ ░ ▓██▓ ░ ░█░ █ ░█ ░██▄▄▄▄██ ▒██▀▀█▄  ▒▓█  ▄ \n       ▒██████▒▒▒██▒ ░  ░ ▓█   ▓██▒ ▒██▒ ░ ▒▒█████▓ ░██████▒▓█   ▓██▒   ▒██████▒▒░ ████▓▒░░▒█░      ▒██▒ ░ ░░██▒██▓  ▓█   ▓██▒░██▓ ▒██▒░▒████▒\n       ▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░ ▒▒   ▓▒█░ ▒ ░░   ░▒▓▒ ▒ ▒ ░ ▒░▓  ░▒▒   ▓▒█░   ▒ ▒▓▒ ▒ ░░ ▒░▒░▒░  ▒ ░      ▒ ░░   ░ ▓░▒ ▒   ▒▒   ▓▒█░░ ▒▓ ░▒▓░░░ ▒░ ░\n       ░ ░▒  ░ ░░▒ ░       ▒   ▒▒ ░   ░    ░░▒░ ░ ░ ░ ░ ▒  ░ ▒   ▒▒ ░   ░ ░\n\n\n");
        staticProxyDB = mongoClient.db('Spatula-Software').collection('staticProxies');
        residentialProxyDB = mongoClient.db('Spatula-Software').collection('residentialProxies');
        burnerAccountDB = mongoClient.db('Spatula-Software').collection('burnerAccounts');
        userDB = mongoClient.db('Spatula-Software').collection('Users');

        /*const accountList = await burnerAccountDB.find({}).toArray();
        for(const account of accountList){
            const platform = platforms[Math.floor(Math.random() * platforms.length)];
            console.log(platform);
            await burnerAccountDB.updateOne({_id: account._id}, {$set: {Platform: platform}});
        }*/

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

//worker login listening function
const facebookListener = async (message, task, user, username) => {
    if(message.action == 'success'){
        users.get(user).facebook.get(task).removeListener('message', facebookListener);
        console.log("listener gone");
    }else if(message.action == 'failure'){
        users.get(user).facebook.get(task).terminate();
        users.get(user).facebook.delete(task);

        //Free the burner account for use
        await burnerAccountDB.updateOne({Username: username}, {$inc: {ActiveTasks: 1}});

        //decrease worker count
        users.get(user).workerCount--;
    }else if(message.action == 'ban'){
        users.get(user).facebook.get(task).terminate();
        users.get(user).facebook.delete(task);

        //Free the burner account for use
        await burnerAccountDB.deleteOne({Username: username});

        //decrease worker count
        users.get(user).workerCount--;
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

const scanDatabase = async () => {

    setTimeout(async () => {
        usersToDelete = [];

        //check map against db
        for (const [key, value] of users) {
            const userObj = await userDB.findOne({ UserId: key });
            if (!userObj) {
                usersToDelete.push(key);
            }
        }
        
        //actually delete the users from map
        usersToDelete.forEach((userId) => {
            users.delete(userId);
        })

        scanDatabase();
    }, 86400000) //24 hours
}

//pre populate this with data from supabase 
const users = new Map();

//Queue stuff so that commands won't fuck each other
//let queue = [];

//listen for commands
discordClient.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        console.log('Received a button click:', interaction.customId);
    }

	if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply('There was an error while executing this command!');
	}

    executeCommand(interaction);

    /*//push command into the queue
    queue.push(interaction);

    //run the queue handler if it is not already going
    if(queue.length == 1){
        handleQueue();
    }*/
});

/*const handleQueue = async () => {
    //run the command
    if(queue[0].message != null){
        await executeMessage(queue[0]);
    }else{
        await executeCommand(queue[0]);
    }

    //delete the executed command from queue
    queue.shift();

    //check the queue for more commands and run it back if necessary
    if(queue.length > 0){
        handleQueue();
    }
}*/

const executeCommand = async (interaction) => {
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
                            if(maxPrice.toString() <= 100000){
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
                                                users.get(interaction.user.id).taskCount++;

                                                //burner account assignment
                                                let burnerAccountObj = await burnerAccountDB.findOne({ActiveTasks: 0});

                                                //if there is no un-active accounts 
                                                if(burnerAccountObj == null){
                                                    burnerAccountObj = await burnerAccountDB.findOne({}, {sort: {ActiveTasks: 1}});
                                                    console.log('SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!!');
                                                    discordClient.channels.cache.get('1091532766522376243').send("SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!! @everyone");
                                                }

                                                await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$inc: {ActiveTasks: 1}});

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

                                                discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
                                            }else{
                                                discordClient.channels.cache.get(interaction.channelId).send("Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours");
                                            }
                                        } else{
                                            discordClient.channels.cache.get(interaction.channelId).send("You must provide a message account to use messaging, use the facebook-update-message-account command to add a message account to your profile.");
                                        }
                                    }else{
                                        discordClient.channels.cache.get(interaction.channelId).send("A task with this name already exists, restart the task with a new name.");
                                    }
                                }else{
                                    discordClient.channels.cache.get(interaction.channelId).send("You have reached your task limit for your plan, upgrade to make more.");
                                }
                            }else{
                                discordClient.channels.cache.get(interaction.channelId).send("Max price is to high, make your max price more realistic.");
                            }
                        }else{
                            discordClient.channels.cache.get(interaction.channelId).send("Your link must include a max price");
                        }
                    }else{
                        discordClient.channels.cache.get(interaction.channelId).send("Invalid Link");
                    }
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("You do not have an active plan");
                }
            }
            else if(interaction.commandName === "facebook-delete-task"){
                if(users.has(interaction.user.id)){
                    const user = users.get(interaction.user.id);

                    if(user.facebook.has(interaction.options.getString("task-name"))){
                        let child = user.facebook.get(interaction.options.getString("task-name"));
    
                        //Message the worker to close browsers
                        await child.postMessage({ action: 'closeBrowsers' });
    
                        let message = await new Promise(resolve => {
                            child.on('message', message => {
                                resolve(message);
                            });
                        });
    
                        //On completion worker messages back to terminate
                        if(message.action == 'terminate'){
                            console.log('terminate');
    
                            //set cookies in db
                            await burnerAccountDB.updateOne({Username: message.username}, {$set: {Cookies: message.burnerCookies}, $inc: {ActiveTasks: -1}});
                            if(message.messageCookies != null){
                                await userDB.updateOne({UserId: interaction.user.id}, {$set: {'MessageAccount.Cookies': message.messageCookies}});
                            }
    
                            //!reduce active task count by one
                            //await staticProxyDB.updateOne({Proxy: message.proxy}, { $inc: { CurrentFacebookBurnerTasks: -1 } });
    
                            //actually delete the thing
                            child.terminate();
                            user.facebook.delete(interaction.options.getString("task-name"));
                            user.taskCount--;
                            discordClient.channels.cache.get(interaction.channelId).send("Deleted " + interaction.options.getString("task-name"));
                        }
                    }else{
                        discordClient.channels.cache.get(interaction.channelId).send("Task does not exist");
                    }
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("Task does not exist");
                }
            }
            else if(interaction.commandName === "create-facebook-user" && interaction.user.id === '456168609639694376'){
                //!get a random resi proxy
                /*let loginProxyObj = await residentialProxyDB.findOne({});
                await residentialProxyDB.deleteOne({_id: loginProxyObj._id});*/
    
                //create a new worker
                const loginWorker = new Worker('./createUser.js', { workerData:{
                    username: interaction.options.getString("email"),
                    proxy: null, //!loginProxyObj.Proxy
                    firstName: interaction.options.getString("first-name"),
                    lastName: interaction.options.getString("last-name"),
                    channel: interaction.channelId,
                }});

                loginWorker.on('message', async (message) => {
                    console.log("update cookies");
                    //await burnerAccountDB.updateOne({Username: interaction.options.getString("email")}, {$set: {Cookies: message.cookies}});
                    //await burnerAccountDB.insertOne({Username: interaction.options.getString("email"), LoginProxy: loginProxyObj.Proxy, StaticProxy: , Cookies: message.cookies, LastAccessed: null, UserAgent: randomUserAgent});
                });
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
                let user = users.get(interaction.user.id);
                if(user != null){
                    let list = ''; 
                    //check to see if facebook has workers
                    list += "\n\tFacebook:";
                    user.facebook.forEach((task, taskKey) => {
                        list += `\n\t\t-${taskKey}`;
                    })

                    //**Ebay stuff removed
            
                    discordClient.channels.cache.get(interaction.channelId).send(list);
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("User does not exist");
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
        
                discordClient.channels.cache.get(interaction.channelId).send('Updated!');
            }else if(interaction.commandName === 'add-facebook-accounts' && interaction.user.id === '456168609639694376'){
                const fs = require('fs');
                const fileContents = fs.readFileSync(interaction.options.getString("path"), 'utf-8');

                const arrayRegex = /\[(.*?)\]/g;
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
                }
                

                /*const accountArray = fileContents.split('\n');

                // Regular expression patterns
                const arrayRegex = /\[(.*?)\]/g;
                const browserVersionRegex = /Chrome\/([\d.]{9})/;
                const emailPasswordRegex = /;([^:;]+):([^:;]+);;/;

                for(let i = 0; i < accountArray.length; i++){

                    //collect the cookie array
                    const cookiesMatch = accountArray[i].match(arrayRegex);
                    console.log(cookiesMatch);
                    const cookieArray = JSON.parse(cookiesMatch[0]);

                    //collect user agent
                    const userAgentMatch = accountArray[i].match(browserVersionRegex);
                    console.log(userAgentMatch);
                    const userAgent = userAgentMatch[1];

                    //collect account user and password string
                    const emailPasswordMatch = accountArray[i].match(emailPasswordRegex);
                    console.log(emailPasswordMatch);
                    const email = emailPasswordMatch[1];
                    const password = emailPasswordMatch[2];

                    //get a static proxy
                    const proxyObj = await getStaticFacebookBurnerProxy();

                    await burnerAccountDB.insertOne({Username: email, Password: password, Cookies: cookieArray, Proxy: proxyObj.Proxy, UserAgent: userAgent, ActiveTasks: 0});
                }*/
        
                discordClient.channels.cache.get(interaction.channelId).send('finish');
            }else if(interaction.commandName === 'add-burner-proxies' && interaction.user.id === '456168609639694376'){
        
                //get the list of new proxies
                let proxyList = interaction.options.getString("proxy-list");
                proxyList = proxyList.split(" ");
                console.log(proxyList);
                
                //insert the new proxies
                proxyList.forEach(async (proxy) => {
                    await staticProxyDB.insertOne({Proxy: proxy, CurrentFacebookMessageTasks: 0, CurrentFacebookBurnerTasks: 0, TotalFacebookBurnerAccounts: 0})
                })
        
                discordClient.channels.cache.get(interaction.channelId).send('finish');
            }
            else if(interaction.commandName === 'add-main-proxies' && interaction.user.id === '456168609639694376'){
                let proxyList = interaction.options.getString("proxy-list");
                proxyList = proxyList.split(" ");
                console.log(proxyList);
                proxyList.forEach(async (password) => {
                    await residentialProxyDB.insertOne({Proxy: password.substring(password.indexOf("session-") + 8, password.indexOf(":proxy"))});
                })
                discordClient.channels.cache.get(interaction.channelId).send('finish');
            } 
            else if(interaction.commandName === 'all-workers' && interaction.user.id === '456168609639694376'){
                let list = ''; 
                users.forEach((user, userID) => {
                    //check to see if facebook has workers
                    list += '\n' + userID + "\n\tFacebook:";
                    user.facebook.forEach((task, taskKey) => {
                        list += `\n\t\t-${taskKey}`;
                    })
            
                    //**Ebay stuff removed
                })
    
                //send the completed message string
                if(list != ''){
                    discordClient.channels.cache.get(interaction.channelId).send(list);
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send('No Workers');
                }
            }
        }else{
            interaction.user.send('Commands are not allowed in direct messages.');
        }
    } catch (error) {
        console.log("Command Error: \n\t" + error);
        discordClient.channels.cache.get('1091532766522376243').send("Command Error: \n\t" + error);
        discordClient.channels.cache.get(interaction.channelId).send("Command Error: \n\t" + error);
    }
}