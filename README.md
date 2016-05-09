Institute of War Aptitude (IoWA)
====
Web app to allow *League of Legends* players to determine their best champions based on their ranked game statistics and champion mastery. Built by williamtdr and Kellvas (NA) for the [2016 Riot API Challenge](https://developer.riotgames.com/discussion/announcements/show/eoq3tZd1).


[Demo Site](iowa.tdr.moe)


## Installation Instructions ##

All features of IoWA are accessible from a browser using the demo link. However, if you'd like to host an instance of our app with different features, or play around with the algorithms, these instructions will help get you set up.

 1. **Install the latest 4.x release from [the NodeJS website](https://nodejs.org).** Our app does not function on node 0.10.x (no ES6 support), and some of the dependencies we use have warned of compatibility issues with the latest release. So, please grab and install the latest 4.x version and follow the instructions to set up and install Node.
 2. **From a command line, type the command `npm install -g gulp`.** Assuming that Node was properly installed, you should see a tree-like list of dependencies that were installed. Our project uses gulp to combine and minify our Javascript and CSS that serve the website. In order to properly build the site for the first time, it must be properly installed.
 3. **Download and extract our project.** This can be done from the "Download Zip" option on the top of our repository page, or using [this link](https://github.com/williamtdr/iowa/archive/master.zip). Extract the files using your unarchiver of choice.
 4. **From the newly extracted project directory, run `npm install`.** This retrieves all of the dependencies needed for our project to function. If you get an error, make sure you're running the command from where our project was extracted to on your computer.
 5. **Run `node app.js`**. If all's gone well, you should get a message prompting you to set the developer API key in the configuration file. If you don't get this message, run through the past steps again. If you still need help, feel free to [contact me](http://twitter.com/williamtdr).
 6. **From the project directory, open config/config.json in your favorite text editor, and set the developer API key.** If you need an API key, you can get one from [the developer portal](https://developer.riotgames.com).
 7. **Run node app.js again**. If all goes well, you should see a line saying "Web server listening on". Great work! You can now visit [http://localhost:3000](http://localhost:3000) in your browser, and you should see the IoWA homepage. For project configuration and development tips, read on.


## Configuration ##

Simple configuration options can be changed from the configuration file, config/config.json. Restart the app after changing the configuration to see the new settings take effect. If an option is not set, its default will be used from the sample file.


**Web Server**
By default, IoWA's web server listens for requests on any network interface (0.0.0.0) on port 3000. If you plan to share the app publicly, and this app is the primary purpose for your server, you can set the port to 80 so users don't have to specify a port when navigating to your app through the browser. You'll have to start node with administrative privileges to use that port.


**Cache**
IoWA includes a powerful caching engine for the Riot API as part of our client. It accurately saves the responses to requests, increasing the amount of users that can access the app without incurring rate limit penalties. By default, items are cached according to how frequently they change (e.g., champions stay relatively constant whereas a player's match history changes very quickly). The following options are available:

directory: Which folder to store cached files in (default .cache/). Cached files are stored in subfolders based on the nature of the request with a state table to maintain what is in the cache, what was used to request it, and how long until it expires.


save_failures: Whether to save requests that return errors (for example, 404) or to send a new request the next time.


times: Time in seconds to store cached data. Upon expiration, the file is deleted by the cache cleanup. Decreasing these values will save disk space but lengthen page load and start times.


**Credentials**
Here you should put your developer key from the [Riot Games Developer Portal](https://developer.riotgames.com/).


**Rate Limiting**
IoWA includes a built-in mechanism to deal with the rate limit present on developer keys. Rather than fail or continue sending requests and recieving errors when rate limited, the app queues requests until the limit has reset. By default, these values are set to the restrictions imposed on developer API keys (10 requests / 10 seconds and 500 requests / 10 minutes). Set this field to an empty value for a production API key.

**Default Region**
This region is used when getting champion and CDN data used by the app. This information is retrieved on startup, cached, and refreshed periodically. Set this to the region you think most of your users are in. We'd love to support native languages and data for all users of the app, but retrieving and maintaining this static info for all regions adds a lot of overhead in terms of requests and disk space. A production application would need this capability, but we decided to compromise for the timing of the challenge.


## Algorithm ##

Using the ranked and mastery data, all of the champions played by a given player are sorted in order of the highest success score.  The success score is based upon the average kills, deaths, assists, damage taken, damage dealt, and gold earned per game on a champion.  This data is then weighted based upon the attributes of the champion then factored with winrate and champion mastery in proportion to level 5 mastery in order to subdivide the estimated success rate of the player on that champion.  Additionally, IoWA takes the total data for all champions and performs the same calculations but checks each attribute in order to determine what attribute the player is most successful with.  The theory is that a player good at one type of champion will be good at similar champions who fill similar roles. Champion Mastery is a multiplicative factor in the algorithm - players are more likely to perform better with champions on which they have more experience.


So how did I (Kellvas) decide upon the few pieces of information in order to calculated ranked success rates of a player?  Well initially, I brainstormed a list of factors that could effectively differentiate a player's skills with a champion.  In addition to the 6 items which are used in my final algorithm (Kills, Assists, Deaths, Gold Earned, Winrate, Damage done, and Damage taken), I determined that Game Duration, Buildings destroyed, and Damage dealt to champions were important.  However, upon looking more closely to the official data we had access to, I ommitted these three pieces due to their inaccessibility in a reliable manner (outside of match history).


Thus, I considered how these factors go into the success of a player on a given champion.  I understood that certain attributes had certain overall goals during the game (e.g. Tanks soak damage, and Assassins get kills).  As such, I considered how a percentile breakdown of a champion's game data contribute to success.  From this, I created a [spreadsheet](https://docs.google.com/spreadsheets/d/1--rx0OW8olTO1gbov1vhL0MSJgP-aRi7AoiofGZkEeE/edit#gid=0) which calculated theoretical success values for each attribute.  Basically, it takes average values of the 6 stats used and, after factoring the large values (Gold, and Damage) in order to allow the data to not be skewed, uses percentile weights to interpret the data based upon attribute.  The scores are then used to determine the success rate of that champion with higher scores meaning better success and lower scores meaning less success.  Additionally, the attributes Support, Marksman, and Assassin have additional weights added (105%, 95%, and 95% respectively) in order to account for the natures of those attributes needing an overall higher score to be "successful."


From this, the ranked winrate on the champion is used to subdivide these scores and champion mastery in comparison to level 5 mastery even further subdivides these values.  The idea is that a person with low winrates but high mastery are likely to be  more successful overall for one champion compared to another while the actual score itself helps to determine if that player's contribution to that match constitutes a representation of success.  Of course, in this process we also discovered at least one bug in the data itself.  For Example: did you know that as of the time of this being written (5/7/2016 at 8:10PM CDT) that Shen's attribute tags in the client are mislabeled? His attributes that are supposed to be Tank Fighter are coded as Tank "Melee" which caused his success scores to be initially incorrect for all cases because "Melee" was a tag that wasn't accounted for because it isn't an actual attribute.  As such, we had to make the algorithm treat "Melee" as the same as "Fighter."  Other than that moment of interest, the process worked really well when using the data that Riot gave us.  Just based upon initial tests, IoWA seems to accurately sort champions in order of success rates, without any overskewing of the resulting scores to favor one piece of data or another.
