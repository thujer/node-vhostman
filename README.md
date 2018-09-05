# Node Virtual Hosting Manager

  This app will help with managing Websites under Nginx & PHP-FPM
  
  Usage:  [options] [command]

  Node Hosting Manager - interactive hosting configurator

  Options:

    -V, --version              output the version number
    -h, --help                 output usage information

  Commands:

    cv|create-vhost            Create vhost Nginx & Php-fpm config files
    cl|client-list             List of clients directories
    cwl|client-web-list        List of client websites
    gfsp|get-free-socket-port  Get first free socket port
    cav|create-all-vhost       Create all vhosts
    le|letsencrypt             Run Certbot for selected domain



## Installation
npm i -g vhostman

## Commands

#### Create VHOST (cv)
```
$ hostman cv
or
$ hostman create-vhost            
```

Shows client selection in interactive CLI menu.

Continue by pressing enter  
```
? Select client: (Use arrow keys)
❯ < Create new client > 
  client-01-xxx 
  client-03-yyy 
  client-05-zzz 
```

On next step You can see Nginx template selection to make configuration from
```
? Select template: 
❯ nginx-comments 
  nginx-letsencrypt 
  nginx-proxy 
  nginx-ssl-letsencrypt 
  nginx-without-ssl 
```

In next step its needed to know domain which configuration is for
```
? Enter domain (domain.xy): (spsy.eu)
``` 

By pressing enter are configuration files for selected domain created in directories bellow:
- /etc/nginx/sites-available: Configuraction for Nginx 
- /etc/nginx/sites-enabled: Symlink for web activation in Nginx
- /etc/php/{PHP version dir}/fpm/pool.d: Listen configuration for PHP-FPM

App need root privilegs.

If config files exists, then print error and show configuration lines to screen and You can edit files manually

Last socket port is automattically incremented from last one and is used same value for Nginx and associated PHP listener

There is created bash script named "generate-letsencrypt.sh" to obtain ssl certificate in "bash" subdirectory of website.

If website doesn't have ssl certificate, it's needed to select template nginx-without-ssl before for the first time.
Then You can run LetsEncrypt certification challenge.

If everything happend ok, You can see right symlink to live certificate files named "@ssl".

Then is possible to delete first time website config and use nginx-letsencrypt configuration template.

Don't forget to delete both configuration files before - Nginx/sites-available and PHP/pool.d

After Nginx and Php restart You can see green HTTPS status in website url line in browser.

#### Client list
```
$ hostman cl
or
$ hostman client-list
```
Shows list of client directories

Client directories are the first level directories in /var/www

#### Client web list
```
$ hostman cwl
or
$ hostman client-web-list
```
Shows CLI interactive menu to select client and shows client's domains (subdirectiries) 

#### Get free socket port
```
$ hostman gfsp
or
$ hostman get-free-socket-port
```
Traverse all nginx configuration files in directory sites-available, read socket port number and get the greather one + 1
 
### Create all vhosts
```
$ hostman cav
or
$ hostman create-all-vhost
```
Traverse all client directories and all domains (subdirectories) and create Nginx and Php configuration automatically

It's needed to remove all conflict configuration files before this action, otherwise it will not be created, but only printed to screen

## Authors

* **Tomas Hujer** - *Initial work* - [node-vhostman](https://github.com/node-vhostman)

See also the list of [contributors](https://github.com/thujer/node-vhostman/contributors) who participated in this project.

## Big thanks
[Inquirer](https://github.com/SBoudrias/Inquirer.js) for CLI interactive menus

[Commander](https://github.com/tj/commander.js/) for CLI interface

[Bluebird Promises](https://github.com/petkaantonov/bluebird/) for Promisify interface

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* First idea was write just simple appliacation to automated creating of Nginx and PHP-fpm configuration
* This project was inspirated by [ISPConfig](https://www.ispconfig.org/) project website structure
* Project was realized because some problems happens sometimes with [ISPConfig](https://www.ispconfig.org/) delayed write to configuration files by crontab and I must debug this problems for many times.  
