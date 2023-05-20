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
let mainAccountDB;
let staticProxyDB;
let burnerAccountDB;
let userDB;
let residentialProxyDB;
(async () => {
    try {
        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("\n\n\n         ██████  ██▓███   ▄▄▄     ▄▄▄█████▓ █    ██  ██▓    ▄▄▄           ██████  ▒█████    █████▒▄▄▄█████▓ █     █░ ▄▄▄       ██▀███  ▓█████ \n       ▒██    ▒ ▓██░  ██▒▒████▄   ▓  ██▒ ▓▒ ██  ▓██▒▓██▒   ▒████▄       ▒██    ▒ ▒██▒  ██▒▓██   ▒ ▓  ██▒ ▓▒▓█░ █ ░█░▒████▄    ▓██ ▒ ██▒▓█   ▀ \n       ░ ▓██▄   ▓██░ ██▓▒▒██  ▀█▄ ▒ ▓██░ ▒░▓██  ▒██░▒██░   ▒██  ▀█▄     ░ ▓██▄   ▒██░  ██▒▒████ ░ ▒ ▓██░ ▒░▒█░ █ ░█ ▒██  ▀█▄  ▓██ ░▄█ ▒▒███   \n         ▒   ██▒▒██▄█▓▒ ▒░██▄▄▄▄██░ ▓██▓ ░ ▓▓█  ░██░▒██░   ░██▄▄▄▄██      ▒   ██▒▒██   ██░░▓█▒  ░ ░ ▓██▓ ░ ░█░ █ ░█ ░██▄▄▄▄██ ▒██▀▀█▄  ▒▓█  ▄ \n       ▒██████▒▒▒██▒ ░  ░ ▓█   ▓██▒ ▒██▒ ░ ▒▒█████▓ ░██████▒▓█   ▓██▒   ▒██████▒▒░ ████▓▒░░▒█░      ▒██▒ ░ ░░██▒██▓  ▓█   ▓██▒░██▓ ▒██▒░▒████▒\n       ▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░ ▒▒   ▓▒█░ ▒ ░░   ░▒▓▒ ▒ ▒ ░ ▒░▓  ░▒▒   ▓▒█░   ▒ ▒▓▒ ▒ ░░ ▒░▒░▒░  ▒ ░      ▒ ░░   ░ ▓░▒ ▒   ▒▒   ▓▒█░░ ▒▓ ░▒▓░░░ ▒░ ░\n       ░ ░▒  ░ ░░▒ ░       ▒   ▒▒ ░   ░    ░░▒░ ░ ░ ░ ░ ▒  ░ ▒   ▒▒ ░   ░ ░\n\n\n");
        
        mainAccountDB = mongoClient.db('Spatula-Software').collection('mainAccounts');
        staticProxyDB = mongoClient.db('Spatula-Software').collection('staticProxies');
        residentialProxyDB = mongoClient.db('Spatula-Software').collection('residentialProxies');
        burnerAccountDB = mongoClient.db('Spatula-Software').collection('burnerAccounts');
        userDB = mongoClient.db('Spatula-Software').collection('Users');
    } catch(error){
        await mongoClient.close();
        console.log("Mongo Connection " + error);
    }
})();

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
const facebookLoginListener = (message, child, parent, user, username, burnerProxy, messageProxy) => {
        //push command into the queue
        queue.push({
            message: message,
            child: child,
            parent: parent,
            user: user,
            username: username,
            burnerProxy: burnerProxy,
            messageProxy, messageProxy
        });

        //run the queue handler if it is not already going
        if(queue.length == 1){
            handleQueue();
        }
}

const ebayProxyListener = (message, ) => {

}

const executeMessage = async (data) => {
    if(data.message.action == 'facebookSuccess'){
        users.get(data.user).facebook.get(data.parent).children.get(data.child).removeListener('message', facebookLoginListener);
        console.log("listener gone");
    }else if(data.message.action == 'loginFailure'){
        let parent = users.get(data.user).facebook.get(data.parent)
        parent.children.get(data.child).terminate();
        parent.children.delete(data.child);

        //delete burnerAccount document
        parent.burnerLogins.forEach((e) => {
            if(e.username == data.username){
                e.workerNum--;
                return;
            }
        });

        //reduce CurrentTasks
        await staticProxyDB.updateOne({Proxy: data.messageProxy}, {$inc: {CurrentFacebookMessageTasks: -1}});
        await staticProxyDB.updateOne({Proxy: data.burnerProxy}, {$inc: {CurrentFacebookBurnerTasks: -1}});

        users.get(data.user).workerCount--;
    }else if(data.message.action == 'proxyFailure'){
        let proxy = await residentialProxyDB.findOne({}); //get a new proxy from db
        await residentialProxyDB.deleteOne({_id: proxy._id}); //delete the document
        proxy = proxy.Proxy;
        if(data.message.isBurner){
            await burnerAccountDB.updateOne({Username: data.message.username}, {LoginProxy: proxy});
        }else{
            await mainAccountDB.updateOne({Username: data.message.username}, {LoginProxy: proxy});
        }

        //send the proxy back to the worker
        users.get(data.user).facebook.get(data.parent).children.get(data.child).postMessage(proxy);
    }
}

const getStaticFacebookMessageProxy = async () => {
    //get the proxy
    let staticProxyObj = await staticProxyDB.findOne({CurrentFacebookMessageTasks: {$lt: 2}}, {sort: { CurrentFacebookMessageTasks: 1}});
    if(staticProxyObj == null){
        staticProxyObj = await staticProxyDB.findOne({}, {sort: { CurrentFacebookMessageTasks: 1}});
    }
    return staticProxyObj;
}

const getStaticFacebookBurnerProxy = async () => {
    //get the proxy
    let staticProxyObj = await staticProxyDB.findOne({CurrentFacebookBurnerTasks: {$lt: 3}}, {sort: { CurrentFacebookBurnerTasks: 1}});
    if(staticProxyObj == null){
        staticProxyObj = await staticProxyDB.findOne({}, {sort: { CurrentFacebookBurnerTasks: 1}});
    }
    return staticProxyObj;
}

const getEbayProxy = async () => {
    //get a proxy
    let proxyObj = await staticProxyDB.findOne({CurrentEbayTasks: {$lt: 3}}, {sort: { CurrentEbayTasks: 1}});
    if(proxyObj == null){
        proxyObj = await staticProxyDB.findOne({}, {sort: { CurrentEbayTasks: 1}});
    }

    //update CurrentEbayTasks in proxy db
    await staticProxyDB.updateOne({_id: proxyObj._id}, {$inc: { CurrentEbayTasks: 1 }});

    return proxyObj;
}

const handleUser = async (interaction) => {
    //checks if user is already created
    if(!users.has(interaction.user.id)){
        //checks if user has a sub
        let userDocument = await userDB.findOne({UserId: interaction.user.id});
        if(userDocument != null){
            users.set(interaction.user.id, {
                workerCount: 0,
                facebook: new Map(),
                ebay: new Map()
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

    if(interaction.guild){
        if(interaction.commandName === "facebook-create-parent"){
            await handleUser(interaction);
    
            if(users.has(interaction.user.id)){
                if(interaction.options.getString("burner-logins").includes(":")){
                    let burnerLogins = interaction.options.getString("burner-logins").split(", ").map((e) => {
                        let login = e.split(':');
                        return{
                            username: login[0],
                            password: login[1],
                            workerNum: 0 //Number of users currently using the login
                        }
                    });
                    console.log(burnerLogins);
        
                    //main account database stuff
                    let messageAccountObj;
                    let messageStaticProxy;
                    if(interaction.options.getString("username") != null){
                        messageAccountObj = await mainAccountDB.findOne({Username: interaction.options.getString("username")});
                        if(messageAccountObj == null){                    
                            //get a residential proxy
                            let loginProxyObj = await residentialProxyDB.findOne({});
                            await residentialProxyDB.deleteOne({_id: loginProxyObj._id});
    
                            //create a new main account obj
                            await mainAccountDB.insertOne({Username: interaction.options.getString("username"), LoginProxy: loginProxyObj.Proxy, StaticProxies: [], Cookies: null, LastAccessed: null});
                            messageAccountObj = await mainAccountDB.findOne({Username: interaction.options.getString("username")});
                        }
                        if(messageAccountObj.LastAccessed != null){
                            await mainAccountDB.updateOne({_id: messageAccountObj._id}, {$set: {LastAccessed: null}});
                        }
    
                        //static proxy assignment algorithm
                        if(messageAccountObj.StaticProxies.length != 0){
                            //Check each previously used proxy for number of current tasks
                            messageAccountObj.StaticProxies.forEach(async (element) => {
                                messageStaticProxy = await staticProxyDB.findOne({Proxy: element, CurrentFacebookMessageTasks: {$lt: 2}});
                                if(messageStaticProxy != null){
                                    return;
                                }
                            });
                        }
                        //If there is no previous proxy with a low current useage get the proxy with the lowest useage
                        if(messageStaticProxy == null){
                            messageStaticProxy = await getStaticFacebookMessageProxy();
    
                            //update CurrentFacebookMessageTasks in proxy db
                            await staticProxyDB.updateOne({_id: messageStaticProxy._id}, {$inc: { CurrentFacebookMessageTasks: 1 }});
    
                            //add the new proxy to burner account proxy log
                            if(!messageAccountObj.StaticProxies.includes(messageStaticProxy.Proxy)){
                                //take off the last element if its already 3 items long
                                if(messageAccountObj.StaticProxies.length < 3){
                                    await mainAccountDB.updateOne({_id: messageAccountObj._id}, {$push: {StaticProxies: {$each: [messageStaticProxy.Proxy], $position: 0 }}});
                                }else{
                                    await mainAccountDB.updateOne({_id: messageAccountObj._id}, {$push: {StaticProxies: {$each: [messageStaticProxy.Proxy], $position: 0 }}});
                                    await mainAccountDB.updateOne({_id: messageAccountObj._id}, {$pop: {StaticProxies: 1}});
                                }
                            }
                        }
                    }
    
                    if(!users.get(interaction.user.id).facebook.has(interaction.options.getString("name"))){
                        users.get(interaction.user.id).facebook.set(interaction.options.getString("name"), {
                            username: interaction.options.getString("username"),
                            password: interaction.options.getString("password"),
                            burnerLogins: burnerLogins,
                            message: interaction.options.getString("message"),
                            loginProxy: (messageAccountObj != null ? messageAccountObj.LoginProxy : null),
                            staticProxy: (messageStaticProxy != null ? messageStaticProxy.Proxy : null),
                            messageCookies: (messageAccountObj != null ? messageAccountObj.Cookies : null),
                            children: new Map()
                        });
                        discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
                    }else{
                        discordClient.channels.cache.get(interaction.channelId).send("This name is already used");
                    }
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("Invalid burner-logins syntax");
                }
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("Your account does not currently have a subscription");
            }
        }
        else if(interaction.commandName === "facebook-create-child"){
            //checks if parent exists
            if(users.get(interaction.user.id).facebook.has(interaction.options.getString("parent-name"))){
                //checks if user exists
                if(users.has(interaction.user.id)){
                    if (interaction.options.getString("link").includes("https://www.facebook.com/marketplace")){
                        if(users.get(interaction.user.id).workerCount < 5){
                            //get parent
                            let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name"))
                            if(!parent.children.has(interaction.options.getString("name"))){
                                if(parent.username != null || interaction.options.getNumber("message-type") == 3){
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
                                        users.get(interaction.user.id).workerCount++;
        
                                        //Burner account info
                                        let burnerUsername;
                                        let burnerPassword;
                                        for(let i = 0; i < parent.burnerLogins.length - 1 && burnerUsername == null; i++){
        
                                            //Checks that the current item is not the last
                                            if(i == 0){
                                                if(parent.burnerLogins[i].workerNum < parent.burnerLogins[i + 1].workerNum){
                                                    parent.burnerLogins[i].workerNum++;
                                                    burnerUsername = parent.burnerLogins[i].username;
                                                    burnerPassword = parent.burnerLogins[i].password;
                                                }
                                            }else{ //The last item is compared to the previous item instead of the next one
                                                if(parent.burnerLogins[i].workerNum < parent.burnerLogins[i - 1].workerNum){
                                                    parent.burnerLogins[i].workerNum++;
                                                    burnerUsername = parent.burnerLogins[i].username;
                                                    burnerPassword = parent.burnerLogins[i].password;
                                                }
                                            }
                                        }
        
                                        //Runs when all workerNum are the same
                                        if(burnerUsername == null){
                                            parent.burnerLogins[0].workerNum++;
                                            burnerUsername = parent.burnerLogins[0].username;
                                            burnerPassword = parent.burnerLogins[0].password;
        
                                            if(parent.burnerLogins[0].workerNum > 1){
                                                discordClient.channels.cache.get(interaction.channelId).send("Warning: More active tasks than burner accounts");
                                            }
                                        }
        
                                        console.log(burnerUsername);
        
                                        //burner cookies assignment algorithm
                                        let burnerAccountObj = await burnerAccountDB.findOne({Username: burnerUsername});
                                        if(burnerAccountObj == null){
                                            //get a residential proxy
                                            let loginProxyObj = await residentialProxyDB.findOne({});
                                            await residentialProxyDB.deleteOne({_id: loginProxyObj._id});
        
                                            //create a new burner account obj
                                            await burnerAccountDB.insertOne({Username: burnerUsername, LoginProxy: loginProxyObj.Proxy, StaticProxies: [], Cookies: null, LastAccessed: null});
                                            burnerAccountObj = await burnerAccountDB.findOne({Username: burnerUsername});
                                            console.log(burnerAccountObj);
                                        }else if(burnerAccountObj.LastAccessed != null){
                                            await burnerAccountDB.updateOne({Username: burnerUsername}, {$set: {LastAccessed: null}});
                                        }
        
                                        //static proxy assignment algorithm
                                        let burnerStaticProxy;
                                        if(burnerAccountObj.StaticProxies.length != 0){
                                            //Check each previously used proxy for number of current tasks
                                            burnerAccountObj.StaticProxies.forEach(async (element) => {
                                                burnerStaticProxy = await staticProxyDB.findOne({Proxy: element, CurrentFacebookBurnerTasks: {$lt: 3}});
                                                if(burnerStaticProxy != null){
                                                    return;
                                                }
                                            });
                                        }
                                        //If there is no previous proxy with a low current useage get the proxy with the lowest useage
                                        if(burnerStaticProxy == null){
                                            burnerStaticProxy = await getStaticFacebookBurnerProxy();
    
                                            //update CurrentFacebookBurnerTasks in proxy db
                                            await staticProxyDB.updateOne({_id: burnerStaticProxy._id}, {$inc: { CurrentFacebookBurnerTasks: 1 }});
        
                                            //add the new proxy to burner account proxy log
                                            if(!burnerAccountObj.StaticProxies.includes(burnerStaticProxy.Proxy)){
                                                //take off the last element if its already 3 items long
                                                if(burnerAccountObj.StaticProxies.length < 3){
                                                    await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$push: {StaticProxies: {$each: [burnerStaticProxy.Proxy], $position: 0 }}});
                                                }else{
                                                    await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$push: {StaticProxies: {$each: [burnerStaticProxy.Proxy], $position: 0 }}});
                                                    await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$pop: {StaticProxies: 1}});
                                                }
                                            }
                                        }
        
                                        //get parent element from map and set new worker as a child
                                        parent.children.set(interaction.options.getString("name"), new Worker('./facebook.js', { workerData:{
                                            name: interaction.options.getString("name"),
                                            link: interaction.options.getString("link") + "&sortBy=creation_time_descend", //&availability=in%20stock
                                            messageUsername: parent.username,
                                            messagePassword: parent.password,
                                            burnerUsername: burnerUsername,
                                            burnerPassword: burnerPassword,
                                            messageType: interaction.options.getNumber("message-type"),
                                            message: parent.message,
                                            burnerLoginProxy: burnerAccountObj.LoginProxy,
                                            burnerStaticProxy: burnerStaticProxy.Proxy,
                                            messageLoginProxy: parent.loginProxy,
                                            messageStaticProxy: parent.staticProxy,
                                            burnerCookies: burnerAccountObj.Cookies,
                                            messageCookies: parent.messageCookies,
                                            start: start * 60,
                                            end: end * 60,
                                            distance: interaction.options.getNumber("distance"),
                                            channel: interaction.channelId,
                                        }}));
        
                                        //Set message listener for updating cookies and login error handling, only if a login is necessary
                                        if(burnerAccountObj.Cookies == null || (parent.messageCookies == null && interaction.options.getNumber("message-type") != 3)){
                                            console.log("listener created");
                                            parent.children.get(interaction.options.getString("name")).on('message', message => facebookLoginListener(message, interaction.options.getString("name"), interaction.options.getString("parent-name"), interaction.user.id, burnerUsername, burnerStaticProxy.Proxy, parent.staticProxy));
                                        }
        
                                        discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
                                    }else{
                                        discordClient.channels.cache.get(interaction.channelId).send("Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours");
                                    }
                                } else{
                                    discordClient.channels.cache.get(interaction.channelId).send("You must provide a message account in you parent task to use messaging");
                                }
                            }else{
                                discordClient.channels.cache.get(interaction.channelId).send("A child with this name already exists");
                            }
                        }else{
                            discordClient.channels.cache.get(interaction.channelId).send("You have reached the worker limit, delete one to create another.");
                        }
                    }else{
                        discordClient.channels.cache.get(interaction.channelId).send("Invalid Link");
                    }
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("You do not have an active plan");
                }
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("Parent does not exist");
            }
        }
        else if(interaction.commandName === "facebook-delete-child"){
            if(users.has(interaction.user.id)){
                if(users.get(interaction.user.id).facebook.has(interaction.options.getString("parent-name"))){
                    let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name"));
                    if(parent.children.has(interaction.options.getString("child-name"))){
                        let child = parent.children.get(interaction.options.getString("child-name"));
    
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
    
                            //track last access date for cleaning
                            await burnerAccountDB.updateOne({Username: message.username}, {$set: {LastAccessed: new Date()}});
    
                            //reduce active task count by one
                            await staticProxyDB.updateOne({Proxy: message.proxy}, { $inc: { CurrentFacebookBurnerTasks: -1 } });
    
                            //Make the login open for use in the parent
                            parent.burnerLogins.forEach((e) => {
                                if(e.username == message.username){
                                    e.workerNum--;
                                    return;
                                }
                            })
    
                            //actually delete the thing
                            child.terminate();
                            parent.children.delete(interaction.options.getString("child-name"));
                            users.get(interaction.user.id).workerCount--;
                            discordClient.channels.cache.get(interaction.channelId).send("Deleted " + interaction.options.getString("child-name"));
                        }
                    }else{
                        discordClient.channels.cache.get(interaction.channelId).send("Child does not exist");
                    }
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("Parent does not exist");
                }
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("Parent does not exist");
            }
        }
        else if(interaction.commandName === "facebook-delete-parent"){
            if(users.has(interaction.user.id)){
                if(users.get(interaction.user.id).facebook.has(interaction.options.getString("name"))){
                    let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("name"));

                    //decrease the worker count for the main account static proxy
                    await staticProxyDB.updateOne({Proxy: parent.staticProxy}, { $inc: { CurrentFacebookMessageTasks: -1 } });
    
                    let mainInfoIsSet = false;
    
                    parent.children.forEach(async(child) => {
                        //Message the worker to close browsers
                        child.postMessage({ action: 'closeBrowsers' });
    
                        let message = await new Promise(resolve => {
                            child.on('message', message => {
                              resolve(message);
                            });
                        });
    
                        //On completion worker messages back to terminate
                        if(message.action == 'terminate'){
                            console.log('terminate');
    
                            //reduce active task count by one
                            await staticProxyDB.updateOne({Proxy: message.proxy}, { $inc: { CurrentFacebookBurnerTasks: -1 } });
    
                            //set cookies in db
                            if(message.burnerCookies != null){
                                await burnerAccountDB.updateOne({Username: message.username}, {$set: {Cookies: message.burnerCookies}});
                            }
    
                            //track last access date for cleaning
                            await burnerAccountDB.updateOne({Username: message.username}, {$set: {LastAccessed: new Date()}});
    
                            if(mainInfoIsSet == false){
                                //track last access date for cleaning
                                await mainAccountDB.updateOne({Username: parent.username}, {$set: {LastAccessed: new Date()}});
    
                                //Store main account cookies
                                if(message.messageCookies != null){
                                    await mainAccountDB.updateOne({Username: parent.username}, {$set: {Cookies: message.messageCookies}});
                                    mainInfoIsSet = true;
                                }
                            }
    
                            //delete the son of a bitch
                            child.terminate();
                            users.get(interaction.user.id).workerCount--;
                        }
                    });
    
                    users.get(interaction.user.id).facebook.delete(interaction.options.getString("name"));
                    discordClient.channels.cache.get(interaction.channelId).send("Deleted " + interaction.options.getString("name"));
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("Parent does not exist");
                }
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("Parent does not exist");
            }
        }
        else if(interaction.commandName === "ebay-create"){
            await handleUser(interaction);
    
            if(!users.get(interaction.user.id).ebay.has(interaction.options.getString("name"))){
                if(interaction.options.getString("link").includes("https://www.ebay.com")){
                    if(users.get(interaction.user.id).workerCount < 5){
                        //get a proxy
                        const proxyObj = await getEbayProxy();
                    
                        //increase the worker count
                        users.get(interaction.user.id).workerCount++;
    
                        //fiddle with the link
                        let link = interaction.options.getString("link");
                        link = link.substring(0, link.indexOf("&")) + '&_sop=10' + link.substring(link.indexOf('&'));
    
                        users.get(interaction.user.id).ebay.set(interaction.options.getString("name"), new Worker('./ebay.js', { workerData:{
                            name: interaction.options.getString("name"),
                            link: link,
                            proxy: proxyObj.Proxy,
                            channel: interaction.channelId,
                        }}));
                        discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
    
                    }else{
                        discordClient.channels.cache.get(interaction.channelId).send("You have reached the worker limit, delete one to create another.");
                    }
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("Invalid Link");
                }
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("An interval with this name already exists");
            }
        }
        else if(interaction.commandName === "ebay-delete"){
            if(users.has(interaction.user.id)){
                if(users.get(interaction.user.id).ebay.has(interaction.options.getString("name"))){
                    let taskWorker = users.get(interaction.user.id).ebay.get(interaction.options.getString("name"));
    
                    taskWorker.postMessage({ action: 'closeBrowsers' });
    
                    let message = await new Promise(resolve => {
                        taskWorker.on('message', message => {
                            resolve(message);
                        });
                    });
    
                    //On completion worker messages back to terminate
                    if(message.action == 'terminate'){
                        console.log('terminate');
    
                        //reduce active task count by one
                        await staticProxyDB.updateOne({Proxy: message.proxy}, { $inc: { CurrentEbayTasks: -1 } });
    
                        //delete the son of a bitch
                        taskWorker.terminate();
                        users.get(interaction.user.id).ebay.delete(interaction.options.getString("name"));
                        users.get(interaction.user.id).workerCount--;
                        discordClient.channels.cache.get(interaction.channelId).send("Deleted " + interaction.options.getString("name"));
                    }
                }else{
                    discordClient.channels.cache.get(interaction.channelId).send("Worker does not exist");
                }
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("You do not have any workers");
            }
        }
        else if(interaction.commandName === "list"){
            let user = users.get(interaction.user.id);
            if(user != null){
                let list = ''; 
                //check to see if facebook has workers
                list += "\n\tFacebook:";
                user.facebook.forEach((parent, parentKey) => {
                    list += `\n\t\t-${parentKey}`;
                    parent.children.forEach((child, childKey) => {
                        list += `\n\t\t\t+${childKey}`;
                    })
                })
        
                list += "\n\tEbay:";
                user.ebay.forEach((worker, workerKey) => {
                    list += `\n\t\t${workerKey}`;
                })
        
                discordClient.channels.cache.get(interaction.channelId).send(list);
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("User does not exist");
            }
        }
        else if(interaction.commandName === 'update-burner-proxies' && interaction.user.id === '456168609639694376'){
            //reset static proxy lists on both account dbs
            await mainAccountDB.updateMany({}, {$set: {StaticProxies: []}});
            await burnerAccountDB.updateMany({}, {$set: {StaticProxies: []}});
    
            //get the list of new proxies
            let proxyList = interaction.options.getString("proxy-list");
            proxyList = proxyList.split(" ");
            console.log(proxyList);
            
            //delete all previous proxies and insert the new ones
            await staticProxyDB.deleteMany({});
            proxyList.forEach(async (proxy) => {
                await staticProxyDB.insertOne({Proxy: proxy, CurrentFacebookMessageTasks: 0, CurrentFacebookBurnerTasks: 0, CurrentEbayTasks: 0})
            })
    
            //rotate through every current worker and send a message that contains the new proxy, then update the database StaticProxies list
            users.forEach(async (user) => {
                //for each Facebook parent
                for(const parent of user.facebook){
                    const updateFacebookParentTask = async (parent) => {
                        let isFirst = true;
                        const messageStaticProxyObj = await getStaticFacebookMessageProxy();
        
                        //for each Facebook child in parent
                        for(const child of parent[1].children){
                            const updateFacebookChildTask = async (child) => {
                                //get a new proxy from the db
                                console.log('start');
                                const burnerStaticProxyObj = await getStaticFacebookBurnerProxy();
                
                                //update CurrentFacebookBurnerTasks in proxy db
                                await staticProxyDB.updateOne({_id: burnerStaticProxyObj._id}, {$inc: { CurrentFacebookBurnerTasks: 1 }});
                
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
                                await burnerAccountDB.updateOne({Username: message.burnerUsername}, {$push: {StaticProxies: burnerStaticProxyObj.Proxy}});
                
                                //only use the static proxy if messaging is enabled
                                if(message.messageUsername != null && isFirst){
                                    await staticProxyDB.updateOne({_id: messageStaticProxyObj._id}, {$inc: { CurrentFacebookMessageTasks: 1 }});
                                    await mainAccountDB.updateOne({Username: message.messageUsername}, {$push: {StaticProxies: messageStaticProxyObj.Proxy}});
                                    isFirst = false;
                                }
                                console.log('end');
                            }
                            await updateFacebookChildTask(child);
                        }
                    }
                    await updateFacebookParentTask(parent);
                }

                //for each ebay task
                for(const task of user.ebay){
                    const updateEbayTask = async () => {
                        const proxyObj = await getEbayProxy();
            
                        //Message the worker with new proxy
                        task[1].postMessage({ action: 'newProxy', proxy: proxyObj.Proxy });
                    }
                    await updateEbayTask();
                }
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
        else if(interaction.commandName === 'clean-database' && interaction.user.id === '456168609639694376'){
            let cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
    
            burnerAccountDB.deleteMany({LastAccessed: { $lte: cutoffDate }});
            mainAccountDB.deleteMany({LastAccessed: { $lte: cutoffDate }});
        }        
        else if(interaction.commandName === 'all-workers' && interaction.user.id === '456168609639694376'){
            let list = ''; 
            users.forEach((user, userID) => {
                //check to see if facebook has workers
                list += '\n' + userID + "\n\tFacebook:";
                user.facebook.forEach((parent, parentKey) => {
                    list += `\n\t\t-${parentKey}`;
                    parent.children.forEach((child, childKey) => {
                        list += `\n\t\t\t+${childKey}`;
                    })
                })
        
                //add ebay workers
                list += "\n\tEbay:";
                user.ebay.forEach((worker, workerKey) => {
                    list += `\n\t\t${workerKey}`;
                })
            })

            //send the completed message string
            discordClient.channels.cache.get(interaction.channelId).send(list);
        }
    }else{
        interaction.user.send('Commands are not allowed in direct messages.');
    }
}