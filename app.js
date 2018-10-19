#!/usr/bin/node

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const o_userid = require('userid');
require('colors');

/* App properties */
const o_app_package = require('./package.json');

// https://github.com/SBoudrias/Inquirer.js/
const { prompt } = require('inquirer'); // require inquirerjs library

// Clone Redis config and append some parameters
/*
let o_config_redis_cache = o_config_redis;
o_config_redis_cache.db = o_redis_db_list.HOSTINGMAN;
o_config_redis_cache.expire = 6000; // Redis cache for MySQL ws* procedures

const o_mysql = new mysqlProc(o_config_mysql, o_config_redis_cache);
*/

const NL_PORT = 80;
const NL_SOCKET_PORT_FIRST = 9000;

const S_TEMPLATE_DIR = __dirname + '/template';
const S_TEMPLATE_PHP7 = S_TEMPLATE_DIR + '/php7.2-fpm';

const S_NGINX_TARGET = '/etc/nginx';
const S_PHP7_TARGET = '/etc/php/7.2/fpm/pool.d';
const S_CLIENT_DIR_BASE = '/var/www';
const S_DIR_NGINX_CONFIG = '/etc/nginx/sites-available';

Number.prototype.pad = function(size) {
    var sign = Math.sign(this) === -1 ? '-' : '';
    return sign + new Array(size).concat([Math.abs(this)]).join('0').slice(-size);
};



/**
 * Class representing eShop.
 * @class NodeShop
 */

class App {

    constructor() {

    }


    /**
     * Remove accent from text
     * @param s_str
     * @returns string
     */
    static stripAccents(s_str) {

        var in_chrs   = 'àáâãäčçďěèéêëìíîïñňńòóôõöřšùúûüůýÿžÀÁÂÃÄČÇĎĚÈÉÊËÌÍÎÏÑÒÓÔÕÖŘŠÙÚÛÜÝŽ',
            out_chrs  = 'aaaaaccdeeeeeiiiinnnooooorsuuuuuyyzAAAAACCDEEEEEIIIINOOOOORSUUUUYZ',
            chars_rgx = new RegExp('[' + in_chrs + ']', 'g'),
            transl    = {}, i,
            lookup    = function (m) { return transl[m] || m; };

        for (i=0; i<in_chrs.length; i++) {
            transl[ in_chrs[i] ] = out_chrs[i];
        }

        return s_str.replace(chars_rgx, lookup);
    }


    /**
     * Remake s_name to alias by removing unwanted chars and switch to lower case
     * @param {string} s_name - Name of item to generate SEO url from
     * @returns {string} string with all non-printable chars replaced by minus and repeated chars removed
     */
    static makeAlias(s_name) {

        let s_alias = App.stripAccents(s_name)
            .toLowerCase()
            .replace(/[^\x20-\x7E]+/g, ' ')
            .replace(/[+]+/g, '-')
            .replace(/[ ]+/g, '-')
            .replace(/[\&]+/g, '-')
            .replace(/[-]+/g, '-')
            .replace(/-$/g, '')
        ;

        //console.log('StripAccents', s_name, s_alias);

        return s_alias;
    }


    /**
     * Returns application version from package.json
     */
    static getVersion() {
        return o_app_package.version;
    }


    /**
     * Create VHost configuration
     * @param s_client_dir
     * @param s_template
     */
    createHostingWizard(s_client_dir, s_template) {

        var self = this;

        self.getFirstFreeSocket()
            .then((nl_socket_port_free) => {

                // Craft questions to present to users
                var a_question = [
                    {
                        type : 'input',
                        name : 's_domain',
                        message : 'Enter domain (domain.xy):',
                        default: 'spsy.eu'
                    }, {
                        type : 'input',
                        name : 's_email',
                        message : 'Enter email address:',
                        default: 'thujer@gmail.com'
                    }
                ];

                prompt(a_question)
                    .then(o_config => {
                        o_config.s_client_dir = s_client_dir;
                        o_config.s_socket = nl_socket_port_free;
                        console.log(o_config);
                        self.createHostingConfiguration(o_config, s_template);
                    })

            })

    }


    /**
     * Write configuration into Nginx and PHP vhost files
     * @param o_config object {s_domain, s_socket, s_client_dir }
     * @param s_template_nginx string Nginx template file
     * @param b_force boolean true=rewrite file
     */
    createHostingConfiguration(o_config, s_template_nginx, b_force = false) {

        var self = this;

        s_template_nginx = S_TEMPLATE_DIR + '/' + s_template_nginx;

        let s_template_nginx_content = fs.readFileSync(s_template_nginx).toString();
        let s_template_php7_content = fs.readFileSync(S_TEMPLATE_PHP7).toString();

        let s_nginx_vhost_file = (o_config.s_domain.replace(/.conf/, '') + '.conf');

        let s_nginx_content = s_template_nginx_content
            .replace(/{S_USER_DIR}/gi, /*S_CLIENT_DIR_BASE + '/' + */o_config.s_client_dir)
            .replace(/{S_DOMAIN}/gi, o_config.s_domain)
            .replace(/{NL_PORT}/gi, NL_PORT)
            .replace(/{S_SOCKET}/gi, o_config.s_socket)
        ;

        let s_nginx_filename = S_NGINX_TARGET + '/sites-available/' + s_nginx_vhost_file;
        //let s_nginx_filename_backup = S_NGINX_TARGET + '/sites-available/backup/' + s_nginx_vhost_file;
        /*
        if(fs.existsSync(s_nginx_filename)) {

            // If exists previous backup, then delete it
            if(fs.existsSync(s_nginx_filename_backup)) {
                fs.unlinkSync(s_nginx_filename_backup);
            }

            // Rename last one config to backup file
            fs.renameSync(s_nginx_filename, s_nginx_filename_backup);
        }
        */

        if(!fs.existsSync(s_nginx_filename)) {
            fs.writeFileSync(s_nginx_filename, s_nginx_content);
        } else {
            console.log(('File ' + s_nginx_filename + ' exists, skipped !').red);
            console.log('File content:\n', s_nginx_content)
        }

        let s_php_content = s_template_php7_content
            .replace(/{S_USER_DIR}/gi, S_CLIENT_DIR_BASE + '/' + o_config.s_client_dir)
            .replace(/{S_DOMAIN}/gi, o_config.s_domain)
            .replace(/{NL_PORT}/gi, NL_PORT)
            .replace(/{S_SOCKET}/gi, o_config.s_socket)
        ;

        let s_php_filename = S_PHP7_TARGET + '/' + s_nginx_vhost_file;
        //let s_php_filename_backup = S_PHP7_TARGET + '/backup/' + s_nginx_vhost_file;

        /*
        if(fs.existsSync(s_php_filename)) {

            // If exists previous backup, then delete it
            if(fs.existsSync(s_php_filename_backup)) {
                fs.unlinkSync(s_php_filename_backup);
            }

            // Rename last one config to backup file
            fs.renameSync(s_php_filename, s_php_filename_backup);
        }
        */

        if(!fs.existsSync(s_php_filename)) {
            fs.writeFileAsync(s_php_filename, s_php_content);
        } else {
            console.log(('File ' + s_php_filename + ' exists, skipped !').red);
            console.log('File content:\n', s_php_content)
        }

        if(!fs.existsSync(S_NGINX_TARGET + '/sites-enabled/' + s_nginx_vhost_file)) {
            fs.symlinkSync('../sites-available/' + s_nginx_vhost_file, S_NGINX_TARGET + '/sites-enabled/' + s_nginx_vhost_file);
        }

        let s_dir_nginx = '/var/www/' + o_config.s_client_dir + '/' + o_config.s_domain + '/nginx';
        if(!fs.existsSync(s_dir_nginx)) {
            fs.mkdirSync(s_dir_nginx);
        }

        if(!fs.existsSync(s_dir_nginx + '/' + s_nginx_vhost_file)) {
            fs.symlinkSync(S_NGINX_TARGET + '/sites-enabled/' + s_nginx_vhost_file, s_dir_nginx + '/' + s_nginx_vhost_file);
        }

        let s_dir_php = '/var/www/' + o_config.s_client_dir + '/' + o_config.s_domain + '/php';
        if(!fs.existsSync(s_dir_php)) {
            fs.mkdirSync(s_dir_php);
        }

        if(!fs.existsSync(s_dir_php + '/' + s_nginx_vhost_file)) {
            fs.symlinkSync(S_PHP7_TARGET + '/' + s_nginx_vhost_file, s_dir_php + '/' + s_nginx_vhost_file);
        }
    }


    /**
     * Make client directory
     * @param s_client_dir
     */
    createClientDir(s_client_dir) {

        return new Promise((resolve, reject) => {
            fs.mkdirAsync(S_CLIENT_DIR_BASE + '/' + s_client_dir)
                .then(() => {

                    let o_owner = NodeHostingMan.getUserId('www-data', 'www-data');

                    console.log('UID:', o_owner.nl_uid, ', GID:', o_owner.nl_gid);

                    fs.chownSync(S_CLIENT_DIR_BASE + '/' + s_client_dir, o_owner.nl_uid, o_owner.nl_gid)

                    resolve(S_CLIENT_DIR_BASE + '/' + s_client_dir);
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }


    /**
     * Get user and group numeric ID
     * @param s_user
     * @param s_group
     * @returns {{nl_uid: *, nl_gid: *}}
     */
    static getUserId(s_user, s_group) {

        return {
            nl_uid: o_userid.uid('www-data'),
            nl_gid: o_userid.gid('www-data')
        }

    }


    /**
     * Search all nginx files for socket port and return last one
     */
    getFirstFreeSocket(b_echo = false) {

        var nl_socket_port_last = NL_SOCKET_PORT_FIRST;

        return new Promise((resolve, reject) => {

            fs.readdirAsync(S_DIR_NGINX_CONFIG)
                .then((a_config_nginx) => {

                    Promise.each(a_config_nginx, s_config_nginx => {

                        if(fs.lstatSync(S_DIR_NGINX_CONFIG + '/' + s_config_nginx).isFile()) {
                            let s_content = fs.readFileSync(S_DIR_NGINX_CONFIG + '/' + s_config_nginx);

                            var regex = /fastcgi_pass [0-9.]*:([0-9]+)/gi;
                            var a_found = regex.exec(s_content);

                            if(a_found) {
                                let nl_socket_port = parseInt(a_found[1]);
                                if(nl_socket_port_last < nl_socket_port) {
                                    nl_socket_port_last = nl_socket_port;
                                }

                            }
                        }

                    })
                    .then(() => {
                        if(b_echo) {
                            console.log(nl_socket_port_last + 1)
                        }

                        resolve(nl_socket_port_last + 1)
                    })
                });


        })
    }


    /**
     * Create all vhost config by directory structure
     */
    createAllVhost() {

        var self = this;

        fs.readdirAsync(__dirname + '/template')
            .then((a_dir) => {

                prompt([{
                    type: 'list',
                    name: 's_template',
                    message: 'Select template:',
                    choices: a_dir
                }])
                    .then(o_answer => {

                        self.getFirstFreeSocket()
                            .then((nl_socket_port_free) => {

                                var nl_socket_port = nl_socket_port_free;

                                fs.readdirAsync('/var/www/')
                                    .then((a_dir_client) => {

                                        Promise.each(a_dir_client, s_dir_client => {

                                            fs.readdirAsync('/var/www/' + s_dir_client)
                                                .then((a_dir_client_web) => {

                                                    console.log('\nClient', s_dir_client, 'websites:');
                                                    console.log(a_dir_client_web);

                                                    Promise.each(a_dir_client_web, s_dir_client_web => {

                                                        let o_config = {
                                                            s_socket: nl_socket_port++,
                                                            s_domain: s_dir_client_web,
                                                            //s_client_dir: '/var/www/' + s_dir_client + '/' + s_dir_client_web + '/web'
                                                            s_client_dir: s_dir_client
                                                        };

                                                        console.log(o_config);

                                                        self.createHostingConfiguration(o_config, o_answer.s_template)

                                                    })

                                                });
                                        })

                                    });

                            })

                    })
            })


    }


    /**
     * Create Nginx & PHP vhost config files
     */
    createVhost() {

        var self = this;

        fs.readdirAsync('/var/www/')
            .then((a_dir_client) => {

                var nl_id_client_last = 0;
                for(let nl_ix in a_dir_client) {
                    //console.log('Looking for last index', a_dir_client[nl_ix]);

                    let nl_id_current = parseInt(a_dir_client[nl_ix].split('-')[1]);

                    if(nl_id_client_last < nl_id_current) {
                        nl_id_client_last = nl_id_current;
                    }

                    console.log('Last client id', nl_id_client_last)

                }

                a_dir_client.unshift('< Create new client >');

                prompt([{
                    type: 'list',
                    name: 's_client_dir',
                    message: 'Select client:',
                    choices: a_dir_client
                }])
                    .then(o_answer => {

                        fs.readdirAsync(__dirname + '/template')
                            .then((a_dir) => {

                                prompt([{
                                    type: 'list',
                                    name: 's_template',
                                    message: 'Select template:',
                                    choices: a_dir
                                }])
                                .then(o_template_dir => {

                                    if(o_answer.s_client_dir.indexOf('<') > -1) {

                                        prompt([{
                                            type : 'input',
                                            name : 's_client_name',
                                            message : 'Enter client name (lastname firstname):',
                                            default: 'Hujer Tomas'
                                        }])
                                            .then((o_answer) => {

                                                let s_client_dir = 'client-' + (nl_id_client_last + 1).pad(2) + '-' + App.makeAlias(o_answer.s_client_name);

                                                console.log('Client directory', s_client_dir);

                                                self.createClientDir(s_client_dir)
                                                    .then((s_dir) => {
                                                        console.log('Created client directory', s_client_dir);
                                                        self.createHostingWizard(s_client_dir);
                                                    })

                                            })
                                    } else {
                                        console.log('Selected client directory', o_answer.s_client_dir);
                                        self.createHostingWizard(o_answer.s_client_dir, o_template_dir.s_template);
                                    }

                                })
                            })

                    });
            });

    }


    /**
     * Get client list
     */
    clientList() {
        fs.readdirAsync('/var/www/')
            .then((a_dir_client) => {
                console.log(a_dir_client);
            });
    }


    /**
     * Get web list
     */
    clientWebList() {
        fs.readdirAsync('/var/www/')
            .then((a_dir_client) => {

                prompt([{
                    type: 'list',
                    name: 's_client_dir',
                    message: 'Enter domains (domain1.xy domain2.xy):',
                    choices: a_dir_client
                }])
                    .then(o_answer => {

                        a_dir_client.forEach(s_dir_client => {
                            if (s_dir_client === o_answer.s_client_dir) {
                                fs.readdirAsync('/var/www/' + s_dir_client)
                                    .then((a_dir_client_web) => {
                                        console.log('\nClient', s_dir_client, 'websites:');
                                        console.log(a_dir_client_web)

                                    });
                            }
                        })
                    });
            });
    }


    /**
     * Prepare batch script to create ssl certificates with LetsEncrypt for all configured domains
     */
    doLetsEncrypt() {

        var self = this;

        return new Promise((resolve, reject) => {

            var a_config_file = [];

            var o_owner = NodeHostingMan.getUserId('www-data', 'www-data')
            console.log('UID:', o_owner.nl_uid, ', GID:', o_owner.nl_gid);


            fs.readdirAsync(S_DIR_NGINX_CONFIG)
                .then((a_config_nginx) => {

                    Promise.each(a_config_nginx, s_config_nginx => {

                        if(fs.lstatSync(S_DIR_NGINX_CONFIG + '/' + s_config_nginx).isFile()) {
                            a_config_file.push(S_DIR_NGINX_CONFIG + '/' + s_config_nginx);
                        }

                    })
                    .then(() => {

                        Promise.each(a_config_file, s_nginx_config_file => {

                            let s_content = fs.readFileSync(s_nginx_config_file);

                            let a_found = /server_name ([A-Z0-9. ]+)/gi.exec(s_content);
                            let s_domain = a_found[1];

                            a_found = /root ([\/A-Z0-9.\-]+)/gi.exec(s_content);
                            console.log(s_domain, ':', a_found[1].replace('/web', '/ssl'));

                            let a_domain = s_domain.split(' ');

                            if(a_domain.length) {

                                let s_dir_root = a_found[1];
                                let s_dir_ssl = s_dir_root.replace('/web', '/ssl');
                                let s_dir_bash = s_dir_root.replace('/web', '/bash');

                                var s_command = 'certbot certonly --authenticator standalone --installer nginx --webroot -w '+ s_dir_root + ' --logs-dir=./log';

                                for(let s_domain of a_domain) {
                                    s_command += ' -d '+s_domain;
                                }

                                s_command += '\nln -s /etc/letsencrypt/live/' + a_domain[0] + ' ../ssl';


                                if(!fs.existsSync(s_dir_bash)) {
                                    fs.mkdirSync(s_dir_bash)
                                }

                                let s_command_filename = s_dir_bash + '/' + 'generate-letsencrypt.sh';
                                fs.writeFileSync(s_command_filename, s_command);
                                fs.chownSync(s_command_filename, o_owner.nl_uid, o_owner.nl_gid);
                                fs.chmodSync(s_command_filename, 0o710);
                            }




                        });

                        resolve();
                    })
                });


        })

    }

    
    enableSSLConfiguration() {

    }

}

module.exports = App;


