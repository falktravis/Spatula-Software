/**
 *              TODO: Get some data about how many workers are running and resources being used
 *              TODO: Proxies
 *                  -Test and reduce data passed through proxies, mainly images
 *                  -Data center for now, need some extensive testing (this is what beta testing is for)
 *              TODO: Add commands for changing message and login info
 * 
 *              modern-random-ua
 *
 *                          TODO: Get that Shmoney
 * 
 * Keep in mind that storing a large number of worker threads in memory can be resource-intensive, so you may want to consider using a database or some other storage solution if you have a very large number of worker threads.
 */

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
let burnerProxyDB;
let burnerAccountDB;
(async () => {
    try {
        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        mainAccountDB = mongoClient.db('Spatula-Software').collection('mainAccounts');
        burnerProxyDB = mongoClient.db('Spatula-Software').collection('burnerProxies');
        burnerAccountDB = mongoClient.db('Spatula-Software').collection('burnerAccounts');
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
const workerLoginListener = (message, child, parent, user, username, proxy) => {
    if(message.action == 'failure'){
        users.get(user).facebook.get(parent).children.get(child).terminate();
        users.get(user).facebook.get(parent).children.delete(child);

        //delete burnerAccount document
        burnerAccountDB.deleteOne({Username: username});
        //reduce CurrentTasks
        burnerProxyDB.updateOne({Proxy: proxy}, {$inc: {CurrentTasks: -1}});

        users.get(user).workerCount--;
    }else if(message.action == 'success'){
        users.get(user).facebook.get(parent).children.get(child).removeListener('message', workerLoginListener);
    }
}

//pre populate this with data from supabase 
const users = new Map();

//Queue stuff so that commands won't fuck each other
let commandQueue = [];

//listen for commands
discordClient.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

    console.log(interaction);
    commandQueue.push(interaction);
    if(commandQueue.length == 0){
        //run a function that will run the first element in the queue, .shift() the array, and continue to run elements until the queue is empty.
    }
    
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply('There was an error while executing this command!');
	}

    if(interaction.commandName === "facebook-create-parent"){
        //checks if user is already created
        if(!users.has(interaction.user.id)){
            users.set(interaction.user.id, {
                workerCount: 0,
                facebook: new Map(),
                ebay: new Map()
            })
        }

        if(interaction.options.getString("burner-logins").includes(":")){
            let burnerLogins = interaction.options.getString("burner-logins").split(", ").map((e) => {
                let login = e.split(':');
                return{
                    username: login[0],
                    password: login[1],
                    workerNum: 0 //Number of users currently using the login
                }
            });

            //main proxy assignment algorithm
            let messageAccountObj;
            messageAccountObj = await mainAccountDB.findOne({Username: interaction.options.getString("username")});
            if(messageAccountObj == null){
                messageAccountObj = await mainAccountDB.findOne({Username: null});
                console.log(messageAccountObj);
                await mainAccountDB.updateOne({_id: messageAccountObj._id}, {$set: {Username: interaction.options.getString("username")}});
            }

            if(!users.get(interaction.user.id).facebook.has(interaction.options.getString("name"))){
                users.get(interaction.user.id).facebook.set(interaction.options.getString("name"), {
                    username: interaction.options.getString("username"),
                    password: interaction.options.getString("password"),
                    burnerLogins: burnerLogins,
                    message: interaction.options.getString("message"),
                    messageProxy: messageAccountObj.Proxy,
                    messageCookies: messageAccountObj.Cookies,
                    children: new Map()
                });
                discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("This name is already used");
            }
        }else{
            discordClient.channels.cache.get(interaction.channelId).send("Invalid burner-logins syntax");
        }
    }
    else if(interaction.commandName === "facebook-create-child"){
        //checks if user exists
        if(users.has(interaction.user.id)){
            //checks if parent exists
            if(users.get(interaction.user.id).facebook.has(interaction.options.getString("parent-name"))){
                if (interaction.options.getString("link").includes("https://www.facebook.com/marketplace")){
                    if(users.get(interaction.user.id).workerCount < 5){
                        //get parent
                        let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name"))
                        if(!parent.children.has(interaction.options.getString("name"))){
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

                                //If there is only one item in the array
                                if(parent.burnerLogins.length == 1){
                                    parent.burnerLogins[0].workerNum++;
                                    burnerUsername = parent.burnerLogins[0].username;
                                    burnerPassword = parent.burnerLogins[0].password;
                                }else{
                                    while(burnerUsername == null){
                                        //Run this loop until a clean login is found
                                        for(let i = 0; i < parent.burnerLogins.length && burnerUsername == null; i++){

                                            //Checks that the current item is not the last
                                            if(i != parent.burnerLogins.length - 1){
                                                if(parent.burnerLogins[i].workerNum <= parent.burnerLogins[i + 1].workerNum){
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

                                        if(burnerUsername == null){
                                            discordClient.channels.cache.get(interaction.channelId).send("Warning: More active tasks than burner accounts");
                                        }
                                    }
                                }

                                console.log(burnerUsername);

                                //burner cookies assignment algorithm
                                let burnerAccountObj = await burnerAccountDB.findOne({Username: burnerUsername});
                                if(burnerAccountObj == null){
                                    burnerAccountObj = await burnerAccountDB.insertOne({Username: burnerUsername, Cookies: null, PreviousProxies: []});
                                }

                                //burner proxy assignment algorithm
                                let burnerProxy;
                                if(burnerAccountObj.PreviousProxies.length != 0){
                                    //Check each previously used proxy for number of current tasks
                                    burnerAccountObj.PreviousProxies.forEach(async (element) => {
                                        burnerProxy = await burnerProxyDB.findOne({Proxy: element, CurrentTasks: {$lt: 3}});
                                        if(burnerProxy != null){
                                            return;
                                        }
                                    });
                                }
                                //If there is no previous proxy with a low current useage get the proxy with the lowest useage
                                if(burnerProxy == null){
                                    burnerProxy = await burnerProxyDB.findOne({CurrentTasks: {$lt: 3}}, {sort: { CurrentTasks: 1}});
                                    if(burnerProxy == null){
                                        burnerProxy = await burnerProxyDB.findOne({}, {sort: { CurrentTasks: 1}});
                                    }

                                    //add the new proxy to burner account proxy log
                                    if(!burnerAccountObj.PreviousProxies.includes(burnerProxy.Proxy)){
                                        //take off the last element if its already 3 items long
                                        if(burnerAccountObj.PreviousProxies.length < 3){
                                            await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$push: {PreviousProxies: {$each: [burnerProxy.Proxy], $position: 0 }}});
                                        }else{
                                            await burnerAccountDB.updateOne({_id: burnerAccountObj._id}, {$push: {PreviousProxies: {$each: [burnerProxy.Proxy], $position: 0 }}, $slice: { PreviousProxies: 3 }});
                                        }
                                    }
                                }
                                await burnerProxyDB.updateOne({_id: burnerProxy._id}, {$inc: { CurrentTasks: 1 }});
                                burnerProxy = burnerProxy.Proxy;
                                

                                //get parent element from map and set new worker as a child
                                parent.children.set(interaction.options.getString("name"), new Worker('./facebook.js', { workerData:{
                                    name: interaction.options.getString("name"),
                                    link: interaction.options.getString("link") + "&sortBy=creation_time_descend", //&daysSinceListed=0
                                    mainUsername: parent.username,
                                    mainPassword: parent.password,
                                    burnerUsername: burnerUsername,
                                    burnerPassword: burnerPassword,
                                    autoMessage: interaction.options.getBoolean("auto-message"),
                                    message: parent.message,
                                    searchProxy: burnerProxy,
                                    messageProxy: parent.messageProxy,
                                    burnerCookies: burnerAccountObj.Cookies,
                                    messageCookies: parent.messageCookies,
                                    start: start * 60,
                                    end: end * 60,
                                    distance: interaction.options.getNumber("distance"),
                                    channel: interaction.channelId,
                                }}));

                                //Set message listener for updating cookies and login error handling
                                parent.children.get(interaction.options.getString("name")).on('message', message => workerLoginListener(message, interaction.options.getString("name"), interaction.options.getString("parent-name"), interaction.user.id, burnerUsername, burnerProxy));

                                discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
                            }else{
                                discordClient.channels.cache.get(interaction.channelId).send("Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours");
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
                discordClient.channels.cache.get(interaction.channelId).send("Parent does not exist");
            }
        }else{
            discordClient.channels.cache.get(interaction.channelId).send("You do not have an active plan");
        }
    }
    else if(interaction.commandName === "facebook-delete-child"){
        if(users.has(interaction.user.id)){
            if(users.get(interaction.user.id).facebook.has(interaction.options.getString("parent-name"))){
                let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name"));
                if(parent.children.has(interaction.options.getString("child-name"))){
                    let child = parent.children.get(interaction.options.getString("child-name"));

                    //Message the worker to close browsers
                    child.postMessage({ action: 'closeBrowsers' });

                    //On completion worker messages back to terminate
                    child.on('message', (message) => {
                        if(message.action == 'terminate'){
                            console.log('terminate');

                            //set cookies in db
                            burnerAccountDB.updateOne({Username: message.username}, {$set: {Cookies: message.burnerCookies}});

                            //reduce active task count by one
                            burnerProxyDB.updateOne({Proxy: message.proxy}, { $inc: { CurrentTasks: -1 } });

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
                    })
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

                //Store the parent cookies for use in the db
                let mainAccountCookies;

                parent.children.forEach((child) => {
                    //Message the worker to close browsers
                    child.postMessage({ action: 'closeBrowsers' });

                    //On completion worker messages back to terminate
                    child.on('message', (message) => {
                        if(message.action == 'terminate'){
                            console.log('terminate');

                            //set cookies in db
                            burnerAccountDB.updateOne({Username: message.username}, {$set: {Cookies: message.burnerCookies}});

                            //reduce active task count by one
                            burnerProxyDB.updateOne({Proxy: message.proxy}, { $inc: { CurrentTasks: -1 } });

                            //Store main account cookies
                            mainAccountCookies = message.messageCookies;

                            //delete the son of a bitch
                            child.terminate();
                            users.get(interaction.user.id).workerCount--;
                        }
                    })
                });

                //Store main Account cookies in the db
                await mainAccountDB.updateOne({Username: parent.username}, {$set: {Cookies: mainAccountCookies}});

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
        //checks if user exists
        if(!users.has(interaction.user.id)){
            users.set(interaction.user.id, {
                workerCount: 0,
                facebook: new Map(),
                ebay: new Map()
            })
        }

        if(!users.get(interaction.user.id).ebay.has(interaction.options.getString("name"))){
            if(interaction.options.getString("link").includes("https://www.ebay.com")){
                if(users.get(interaction.user.id).workerCount < 5){
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

                        //fiddle with the link
                        let link = interaction.options.getString("link");
                        link = link.substring(0, link.indexOf("&")) + '&_sop=10' + link.substring(link.indexOf('&'));

                        users.get(interaction.user.id).ebay.set(interaction.options.getString("name"), new Worker('./ebay.js', { workerData:{
                            name: interaction.options.getString("name"),
                            link: link,
                            start: start * 60,
                            end: end * 60,
                            channel: interaction.channelId,
                        }}));
                        discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
                    }else{
                        discordClient.channels.cache.get(interaction.channelId).send("Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours");
                    }
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
                users.get(interaction.user.id).ebay.get(interaction.options.getString("name")).terminate();
                users.get(interaction.user.id).ebay.delete(interaction.options.getString("name"));
                users.get(interaction.user.id).workerCount--;
                discordClient.channels.cache.get(interaction.channelId).send("Deleted " + interaction.options.getString("name"));
            }else{
                discordClient.channels.cache.get(interaction.channelId).send("Worker does not exist");
            }
        }else{
            discordClient.channels.cache.get(interaction.channelId).send("You do not have any workers");
        }
    }
    else if(interaction.commandName === "list"){
        let list = ''; 
        let user = users.get(interaction.user.id);
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
    }
});