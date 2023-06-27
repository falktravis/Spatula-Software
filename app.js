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
    } catch(error){
        await mongoClient.close();
        console.log("Mongo Connection " + error);
    }
})();

//UserAgent Array
const userAgents = [
    "94.0.4606.81",
    "93.0.4577.63",
    "92.0.4515.159",
    "91.0.4472.124",
    "90.0.4430.93",
    "89.0.4389.82",
    "88.0.4324.150",
    "87.0.4280.88",
    "86.0.4240.111",
    "85.0.4183.102",
    "84.0.4147.89",
    "83.0.4103.116",
    "81.0.4044.138",
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

//pre populate this with data from supabase 
const users = new Map();

//Queue stuff so that commands won't fuck each other
let queue = [];

//listen for commands
discordClient.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply('There was an error while executing this command!');
	}

    //push command into the queue
    queue.push(interaction);

    //run the queue handler if it is not already going
    if(queue.length == 1){
        handleQueue();
    }
});

const handleQueue = async () => {
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
}

const executeCommand = async (interaction) => {
    try {
        if(interaction.guild){
            if(interaction.commandName === "facebook-create-task"){
                await handleUser(interaction.user.id);

                //checks if user exists
                if(users.has(interaction.user.id)){
                    if(interaction.options.getString("link").includes("https://www.facebook.com/marketplace")){
                        //compare with db total task count
                        const userObj = await userDB.findOne({UserId: interaction.user.id});

                        if(users.get(interaction.user.id).taskCount < userObj.ConcurrentTasks){
                            //get user
                            const user = users.get(interaction.user.id);

                            if(!user.facebook.has(interaction.options.getString("name"))){
                                if(userObj.messageAccount != null || interaction.options.getNumber("message-type") == 3){
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
                                        let burnerAccountObj = await burnerAccountDB.findOne({activeTasks: 0});

                                        //if there is no un-active accounts 
                                        if(burnerAccountObj == null){
                                            burnerAccountObj = await burnerAccountDB.findOne({}, {sort: {activeTasks: 1}});
                                            discordClient.channels.cache.get('1091532766522376243').send("SOUND THE FUCKING ALARMS!!!! WE ARE OUT OF BURNER ACCOUNTS!!! @everyone");
                                        }
        
                                        //create a new worker and add it to the map
                                        user.facebook.set(interaction.options.getString("name"), new Worker('./facebook.js', { workerData:{
                                            name: interaction.options.getString("name"),
                                            link: interaction.options.getString("link") + "&sortBy=creation_time_descend", //&availability=in%20stock
                                            messageType: interaction.options.getNumber("message-type"),
                                            message: interaction.options.getString("message"),
                                            burnerProxy: burnerAccountObj.StaticProxy,
                                            messageProxy: userObj.MessageAccount.Proxy,
                                            burnerCookies: burnerAccountObj.Cookies,
                                            messageCookies: userObj.messageAccount.Cookies,
                                            userAgent: burnerAccountObj.UserAgent,
                                            start: start * 60,
                                            end: end * 60,
                                            distance: interaction.options.getNumber("distance"),
                                            channel: interaction.channelId,
                                        }}));
        
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
                            if(message.burnerCookies != null){
                                await burnerAccountDB.updateOne({Username: message.username}, {$set: {Cookies: message.burnerCookies}});
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
                    proxy: accountObj.StaticProxy,
                    cookies: accountObj.Cookies,
                    userAgent: accountObj.UserAgent,
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
            }
            else if(interaction.commandName === 'update-burner-proxies' && interaction.user.id === '456168609639694376'){//! not gonna fuck with this yet...
                //reset static proxy lists on both account dbs
                await mainAccountDB.updateMany({}, {$set: {StaticProxy: null}});
                await burnerAccountDB.updateMany({}, {$set: {StaticProxy: null}});
        
                //get the list of new proxies
                let proxyList = interaction.options.getString("proxy-list");
                proxyList = proxyList.split(" ");
                console.log(proxyList);
                
                //delete all previous proxies and insert the new ones
                await staticProxyDB.deleteMany({});
                proxyList.forEach(async (proxy) => {
                    await staticProxyDB.insertOne({Proxy: proxy, CurrentFacebookMessageTasks: 0, CurrentFacebookBurnerTasks: 0, TotalFacebookBurnerAccounts: 0})
                });

                //rotate through every current task and send a message that contains the new proxy, then update the database StaticProxies list
                for(const task of users.get(interaction.user.id).facebook){
                    const updateFacebookParentTask = async (parent) => {
                        let isFirst = true;
                        const messageStaticProxyObj = await getStaticFacebookMessageProxy();
        
                        //for each Facebook child in parent
                        for(const child of parent[1].children){
                            const updateFacebookChildTask = async (child) => {
                                //get a new proxy from the db
                                console.log('start');
                                const burnerStaticProxyObj = await getStaticFacebookBurnerProxy();
                
                                //Message the worker with new proxy
                                child[1].postMessage({ action: 'newProxies', messageProxy: messageStaticProxyObj.Proxy, burnerProxy: burnerStaticProxyObj.Proxy });
                
                                //wait for the worker to message back with its identifying details
                                let message = await new Promise(resolve => {
                                    child[1].on('message', message => {
                                        if(message.action === 'usernames'){
                                            resolve(message);
                                        } 
                                    });
                                });
                
                                //assign proxys to accounts in dbsurnerUsername});
                                await burnerAccountDB.updateOne({Username: message.burnerUsername}, {$set: {StaticProxy: burnerStaticProxyObj.Proxy}});
                
                                //only use the static proxy if messaging is enabled
                                if(message.messageUsername != null && isFirst){
                                    await staticProxyDB.updateOne({_id: messageStaticProxyObj._id}, {$inc: { CurrentFacebookMessageTasks: 1 }});
                                    await mainAccountDB.updateOne({Username: message.messageUsername}, {$set: {StaticProxy: messageStaticProxyObj.Proxy}});
                                    isFirst = false;
                                }
                                console.log('end');
                            }
                            await updateFacebookChildTask(child);
                        }
                    }
                    await updateFacebookParentTask(parent);
                }

                //**Ebay stuff removed
        
                discordClient.channels.cache.get(interaction.channelId).send('finish');
            }else if(interaction.commandName === 'facebook-update-message-account'){
                console.log(JSON.parse(interaction.options.getString("cookies")));
                await userDB.updateOne({UserId: interaction.user.id}, {$set: {'MessageAccount.Cookies' : JSON.parse(interaction.options.getString("cookies"))}});

                const userObj = await userDB.findOne({UserId: interaction.user.id});
                if(userObj.MessageAccount.Proxy == null){
                    const proxy = await getStaticFacebookMessageProxy();
                    await userDB.updateOne({UserId: interaction.user.id}, {$set: {'MessageAccount.Proxy' : proxy.Proxy}});
                }
        
                discordClient.channels.cache.get(interaction.channelId).send('Updated!');
            }else if(interaction.commandName === 'add-facebook-accounts' && interaction.user.id === '456168609639694376'){
                const fs = require('fs');
                const fileContents = fs.readFileSync(interaction.options.getString("path"), 'utf-8');
                const accountArray = fileContents.split('\n');

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

                    //const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                    await burnerAccountDB.insertOne({Username: email, Password: password, Cookies: cookieArray, Proxy: proxyObj.Proxy, UserAgent: userAgent, ActiveTasks: 0});
                }
        
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
        //discordClient.channels.cache.get('1091532766522376243').send("Command Error: \n\t" + error);
        discordClient.channels.cache.get(interaction.channelId).send("Command Error: \n\t" + error);
    }
}