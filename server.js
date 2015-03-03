var Cantrip = require("Cantrip");
var json = require("./index.js");
Cantrip.options.namespace = "./data/data.json";
Cantrip.options.persistence = json;
Cantrip.options.saveEvery = 1;
Cantrip.options.backupFiles = 5;
Cantrip.options.backupFolder = "./data/backup";

Cantrip.start();