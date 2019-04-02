# region_recommender_api

This is the API for DestiRec and the DestiRec Admin-Tool. 


## Setup
Here are just some basic steps to get the API running on an Ubuntu Server. You also have to take care of setting up the mysql database and installing npm and node. 

In general, this is not an exact manual, but it should get you in the right direction.

1. Create the .env template using `node src/setup.js`
2. Fill the created .env file
   - Get a [Rapidapi](https://rapidapi.com) key for Skyscanner
   - create a key for the [IATAcodes API](http://iatacodes.org/)
4. `npm install`
5. `nodemon` or (better) create a systemD service
    - To create a systemD service:
      1. Make the main app executable: `chmod +x bin/www`
      2. create service `/etc/systemd/system/recommenderAPI.service`:
          ```
          [UNIT]
          Description=Node.js RecommenderAPI  Http Server
          [Service]
          User=haimerl
          Group=nogroup
          Restart=always
          WorkingDirectory=/home/*path_to_backend*/region_recommender_api
          ExecStart=/home/*path_to_backend*/region_recommender_api/bin/www
          [Install]
          WantedBy=multi-user.target
          ```
6. control service using
   ```
   sudo service recommenderAPI start
   sudo service recommenderAPI restart
   sudo service recommenderAPI stop
   sudo journalctl -u recommenderAPI.service --since 19:00    # for example
   ```
