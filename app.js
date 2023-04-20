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
let proxyDB;
(async () => {
    try {
        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        proxyDB = mongoClient.db('Spatula-Software').collection('Proxies');
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

//pre populate this with data from supabase 
const users = new Map();

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

    if(interaction.commandName === "facebook-create-parent"){
        //checks if user is already created
        if(!users.has(interaction.user.id)){
            users.set(interaction.user.id, {
                workerCount: 0,
                facebook: new Map(),
                ebay: new Map()
            })
        }

        if(interaction.options.getString("burner-logins").includes(":") || interaction.options.getString("burner-logins") == null){
            let burnerLogins;
            if(interaction.options.getString("burner-logins") != null){
                burnerLogins = interaction.options.getString("burner-logins").split(", ").map((e) => {
                    let login = e.split(':');
                    return{
                        username: login[0],
                        password: login[1],
                        workerNum: 0
                    }
                });
            }else{
                burnerLogins = null;
            }

            //main proxy assignment algorithm
            let messageProxy;
            messageProxy = await proxyDB.findOne({CurrentUser: interaction.options.getString("username")});
            if(messageProxy == null){
                messageProxy = await proxyDB.findOne({CurrentUser: null});
                console.log(messageProxy);
                proxyDB.updateOne({_id: messageProxy._id}, {$set: {CurrentUser: interaction.options.getString("username")}});
            }
            messageProxy = messageProxy.Proxy;                  

            if(!users.get(interaction.user.id).facebook.has(interaction.options.getString("name"))){
                users.get(interaction.user.id).facebook.set(interaction.options.getString("name"), {
                    username: interaction.options.getString("username"),
                    password: interaction.options.getString("password"),
                    burnerLogins: burnerLogins,
                    message: interaction.options.getString("message"),
                    messageProxy: messageProxy,
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
                        if(interaction.options.getBoolean("login-search") == false && interaction.options.getNumber("distance") != null){
                            discordClient.channels.cache.get(interaction.channelId).send("You can not specify a distance without login-search");
                        }else{
                            //get parent
                            let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name"))
                            if(interaction.options.getBoolean("login-search") == true && parent.burnerLogins == null){
                                discordClient.channels.cache.get(interaction.channelId).send("Parent must have burner logins to use login-search");
                            }else{
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

                                        //set the burner account info
                                        let burnerUsername;
                                        let burnerPassword;
                                        if(interaction.options.getBoolean("login-search")){
                                            if(parent.burnerLogins[0].workerNum == 0){
                                                parent.burnerLogins[0].workerNum++;
                                                burnerUsername = parent.burnerLogins[0].username;
                                                burnerPassword = parent.burnerLogins[0].password;
                                            }else{
                                                let num = parent.burnerLogins[0].workerNum;
                                                parent.burnerLogins.forEach((e, i) => {
                                                    if(e.workerNum < num){
                                                        parent.burnerLogins[i].workerNum++;
                                                        burnerUsername = e.username;
                                                        burnerPassword = e.password;
                                                        return;
                                                    }else if(i == parent.burnerLogins.length - 1){
                                                        discordClient.channels.cache.get(interaction.channelId).send("Warning: More active tasks than burner accounts");
                                                        parent.burnerLogins[0].workerNum++;
                                                        burnerUsername = parent.burnerLogins[0].username;
                                                        burnerPassword = parent.burnerLogins[0].password;
                                                    }
                                                });   
                                            }
                                        }

                                        //burner proxy assignment algorithm
                                        let searchProxy;
                                        if(interaction.options.getBoolean("login-search") == true){
                                            searchProxy = await proxyDB.findOne({CurrentUser: burnerUsername});
                                            if(searchProxy == null){
                                                searchProxy = await proxyDB.findOne({CurrentUser: null});
                                                proxyDB.updateOne({_id: searchProxy._id}, {$set: {CurrentUser: burnerUsername}});
                                            }
                                            searchProxy = searchProxy.Proxy;
                                        }
                                        console.log(searchProxy);
        
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
                                            searchProxy: searchProxy,
                                            messageProxy: parent.messageProxy,
                                            start: start * 60,
                                            end: end * 60,
                                            distance: interaction.options.getNumber("distance"),
                                            channel: interaction.channelId,
                                        }}));
                                        discordClient.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
                                    }else{
                                        discordClient.channels.cache.get(interaction.channelId).send("Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours");
                                    }
                                }else{
                                    discordClient.channels.cache.get(interaction.channelId).send("A child with this name already exists");
                                }
                            }
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

                    //make the burner account open for use again
                    parent.burnerLogins.forEach((e) => {
                        if(e.workerName == interaction.options.getString("child-name")){
                            e.workerName = null;
                            proxyDB.updateOne({CurrentUser: e.username}, {$set: {CurrentUser: null}});
                            return;
                        }
                    });

                    child.postMessage({ action: 'closeBrowsers' });
                    child.on('message', (message) => {
                        if(message.action = 'terminate'){
                            console.log('terminate');
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
                parent.children.forEach((child) => {
                    child.postMessage({ action: 'closeBrowsers' });
                    child.on('message', (message) => {
                        if(message.action == 'terminate'){
                            console.log('terminate');
                            child.terminate();
                            users.get(interaction.user.id).workerCount--;
                        }
                    })
                });

                //reset currentUser in database
                parent.burnerLogins.forEach((e) => {
                    proxyDB.updateOne({CurrentUser: e.username}, {$set: {CurrentUser: null}});
                });

                //reset currentUser for parent proxy if it is not used by another task
                let usernameIsCurrent = 0;
                users.get(interaction.user.id).facebook.forEach((e) => {
                    if(e.username == parent.username){
                        usernameIsCurrent++;
                    }
                })
                if(usernameIsCurrent <= 1){
                    proxyDB.updateOne({CurrentUser: parent.username}, {$set: {CurrentUser: null}});
                }

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